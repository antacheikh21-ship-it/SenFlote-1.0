<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Subscription;
use App\Models\Plan;
use App\Services\Payment\WavePaymentService;
use App\Services\Payment\OrangeMoneyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    public function __construct(
        private readonly WavePaymentService  $wave,
        private readonly OrangeMoneyService  $orangeMoney,
    ) {}

    // ── Wave ──────────────────────────────────────────────────────────────────

    /**
     * POST /api/v1/payments/wave/initiate
     * Creates a Wave checkout session and returns the redirect URL.
     */
    public function waveInitiate(Request $request): JsonResponse
    {
        $request->validate([
            'plan_id'       => 'required|integer|exists:plans,id',
            'billing_cycle' => 'required|in:monthly,yearly',
        ]);

        $plan   = Plan::findOrFail($request->plan_id);
        $amount = $request->billing_cycle === 'yearly'
            ? (int) ($plan->price_xof * 12 * 0.85) // 15% yearly discount
            : $plan->price_xof;

        $reference = "SF-{$request->user()->company_id}-{$plan->slug}-" . now()->timestamp;

        $result = $this->wave->initiateCheckout(
            amountXof:       $amount,
            clientReference: $reference,
            successUrl:      config('app.url') . '/billing/success?ref=' . $reference,
            errorUrl:        config('app.url') . '/billing/error',
        );

        // Persist a pending subscription so the callback can find it
        Subscription::create([
            'company_id'        => $request->user()->company_id,
            'plan_id'           => $plan->id,
            'status'            => 'past_due',
            'billing_cycle'     => $request->billing_cycle,
            'starts_at'         => now(),
            'payment_provider'  => 'wave',
            'payment_reference' => $reference,
            'meta'              => ['checkout_id' => $result['checkout_id']],
        ]);

        return response()->json($result);
    }

    /**
     * POST /api/v1/payments/wave/callback
     * Receives signed webhook from Wave. Activates the subscription on success.
     */
    public function waveCallback(Request $request): JsonResponse
    {
        $rawBody  = $request->getContent();
        $sig      = $request->header('Wave-Signature', '');

        if (! $this->wave->validateWebhookSignature($rawBody, $sig)) {
            Log::warning('Wave webhook: invalid signature', ['ip' => $request->ip()]);
            return response()->json(['error' => 'Invalid signature'], 401);
        }

        $payload = $request->json()->all();
        $status  = $payload['payment_status'] ?? null;
        $ref     = $payload['client_reference'] ?? null;

        if (! $ref) {
            return response()->json(['ok' => true]);
        }

        $subscription = Subscription::where('payment_reference', $ref)->first();

        if (! $subscription) {
            Log::warning('Wave callback: subscription not found', ['ref' => $ref]);
            return response()->json(['ok' => true]);
        }

        if ($status === 'succeeded') {
            $subscription->update([
                'status'    => 'active',
                'starts_at' => now(),
                'ends_at'   => $subscription->billing_cycle === 'yearly'
                    ? now()->addYear()
                    : now()->addMonth(),
                'meta' => array_merge($subscription->meta ?? [], [
                    'wave_tx_id' => $payload['id'] ?? null,
                ]),
            ]);
        } elseif (in_array($status, ['failed', 'cancelled'])) {
            $subscription->update(['status' => 'canceled']);
        }

        return response()->json(['ok' => true]);
    }

    // ── Orange Money ──────────────────────────────────────────────────────────

    /**
     * POST /api/v1/payments/orange-money/initiate
     */
    public function orangeMoneyInitiate(Request $request): JsonResponse
    {
        $request->validate([
            'plan_id'       => 'required|integer|exists:plans,id',
            'billing_cycle' => 'required|in:monthly,yearly',
        ]);

        $plan    = Plan::findOrFail($request->plan_id);
        $amount  = $request->billing_cycle === 'yearly'
            ? (int) ($plan->price_xof * 12 * 0.85)
            : $plan->price_xof;

        $orderId = 'SF-' . $request->user()->company_id . '-' . now()->timestamp;
        $token   = $this->orangeMoney->getAccessToken();

        $result  = $this->orangeMoney->initiatePayment(
            accessToken: $token,
            amountXof:   $amount,
            orderId:     $orderId,
            returnUrl:   config('app.url') . '/billing/success',
            cancelUrl:   config('app.url') . '/billing/error',
            notifUrl:    config('app.url') . '/api/v1/payments/orange-money/callback',
        );

        Subscription::create([
            'company_id'        => $request->user()->company_id,
            'plan_id'           => $plan->id,
            'status'            => 'past_due',
            'billing_cycle'     => $request->billing_cycle,
            'starts_at'         => now(),
            'payment_provider'  => 'orange_money',
            'payment_reference' => $orderId,
            'meta'              => ['pay_token' => $result['pay_token']],
        ]);

        return response()->json($result);
    }

    /**
     * POST /api/v1/payments/orange-money/callback
     */
    public function orangeMoneyCallback(Request $request): JsonResponse
    {
        $payToken = $request->input('pay_token') ?? $request->input('payToken');
        $status   = $request->input('status');

        if (! $payToken) {
            return response()->json(['ok' => true]);
        }

        $subscription = Subscription::whereJsonContains('meta->pay_token', $payToken)->first();

        if (! $subscription) {
            return response()->json(['ok' => true]);
        }

        if ($status === 'SUCCESSFULL') {
            $subscription->update([
                'status'   => 'active',
                'starts_at'=> now(),
                'ends_at'  => $subscription->billing_cycle === 'yearly'
                    ? now()->addYear()
                    : now()->addMonth(),
            ]);
        }

        return response()->json(['ok' => true]);
    }

    // ── Plans ─────────────────────────────────────────────────────────────────

    public function plans(): JsonResponse
    {
        return response()->json(['data' => Plan::where('is_active', true)->get()]);
    }
}
