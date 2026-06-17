<?php

namespace App\Services\Payment;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Wave Mobile Money integration (Senegal / West Africa).
 * API reference: https://docs.wave.com/business/api
 *
 * To activate:
 * 1. Set WAVE_API_KEY and WAVE_WEBHOOK_SECRET in .env
 * 2. Register the callback URL in the Wave merchant dashboard:
 *    https://yourdomain.com/api/v1/payments/wave/callback
 */
class WavePaymentService
{
    private string $apiUrl;
    private string $apiKey;

    public function __construct()
    {
        $this->apiUrl = config('services.wave.api_url');
        $this->apiKey = config('services.wave.api_key', '');
    }

    /**
     * Initiate a checkout session.
     * Returns the Wave checkout URL to redirect the customer to.
     */
    public function initiateCheckout(
        int    $amountXof,
        string $currency = 'XOF',
        string $clientReference,
        string $successUrl,
        string $errorUrl,
    ): array {
        $response = $this->post('/checkout/sessions', [
            'amount'           => $amountXof,
            'currency'         => $currency,
            'client_reference' => $clientReference,
            'success_url'      => $successUrl,
            'error_url'        => $errorUrl,
        ]);

        return [
            'checkout_id'   => $response['id']           ?? null,
            'checkout_url'  => $response['wave_launch_url'] ?? null,
            'status'        => $response['payment_status'] ?? 'pending',
        ];
    }

    /**
     * Retrieve the status of a checkout session by ID.
     */
    public function getCheckoutStatus(string $checkoutId): array
    {
        $response = $this->get("/checkout/sessions/{$checkoutId}");

        return [
            'id'             => $response['id'] ?? $checkoutId,
            'payment_status' => $response['payment_status'] ?? 'unknown',
            'amount'         => $response['amount'] ?? null,
            'currency'       => $response['currency'] ?? 'XOF',
        ];
    }

    /**
     * Validate the HMAC signature of an incoming Wave webhook.
     */
    public function validateWebhookSignature(string $rawBody, string $signature): bool
    {
        $secret   = config('services.wave.webhook_secret', '');
        $expected = hash_hmac('sha256', $rawBody, $secret);
        return hash_equals($expected, $signature);
    }

    // ─────────────────────────────────────────────────────────────────────────

    private function post(string $path, array $data): array
    {
        if (empty($this->apiKey)) {
            Log::warning('Wave API key not configured — returning stub response.');
            return ['id' => 'STUB_' . uniqid(), 'wave_launch_url' => '#', 'payment_status' => 'pending'];
        }

        $response = Http::withToken($this->apiKey)
            ->acceptJson()
            ->post($this->apiUrl . $path, $data);

        $this->throwIfFailed($response, 'POST', $path);
        return $response->json();
    }

    private function get(string $path): array
    {
        if (empty($this->apiKey)) {
            return ['payment_status' => 'succeeded'];
        }

        $response = Http::withToken($this->apiKey)
            ->acceptJson()
            ->get($this->apiUrl . $path);

        $this->throwIfFailed($response, 'GET', $path);
        return $response->json();
    }

    private function throwIfFailed(Response $response, string $method, string $path): void
    {
        if ($response->failed()) {
            Log::error("Wave API {$method} {$path} failed", [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            throw new \RuntimeException("Wave API error {$response->status()}: {$response->body()}");
        }
    }
}
