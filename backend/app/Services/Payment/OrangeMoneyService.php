<?php

namespace App\Services\Payment;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Orange Money Web Payment (OMWP) integration.
 * API reference: https://developer.orange.com/apis/om-webpay-int/overview
 *
 * Flow:
 * 1. getAccessToken()  → OAuth2 bearer token
 * 2. initiatePayment() → returns pay_token + payment_url
 * 3. Customer completes payment on Orange's page
 * 4. Orange POSTs to /api/v1/payments/orange-money/callback
 * 5. verifyPayment()   → confirm the transaction server-side
 */
class OrangeMoneyService
{
    private string $apiUrl;
    private string $clientId;
    private string $clientSecret;
    private string $merchantKey;

    public function __construct()
    {
        $this->apiUrl       = config('services.orange_money.api_url');
        $this->clientId     = config('services.orange_money.client_id',     '');
        $this->clientSecret = config('services.orange_money.client_secret', '');
        $this->merchantKey  = config('services.orange_money.merchant_key',  '');
    }

    /**
     * Step 1 — Get an OAuth2 access token.
     */
    public function getAccessToken(): string
    {
        if (empty($this->clientId)) {
            Log::warning('Orange Money credentials not configured — returning stub token.');
            return 'STUB_TOKEN';
        }

        $response = Http::asForm()->post(
            'https://api.orange.com/oauth/v3/token',
            [
                'grant_type'    => 'client_credentials',
                'client_id'     => $this->clientId,
                'client_secret' => $this->clientSecret,
            ]
        );

        if ($response->failed()) {
            throw new \RuntimeException('Orange Money token error: ' . $response->body());
        }

        return $response->json('access_token');
    }

    /**
     * Step 2 — Initiate a Web Payment and get the redirect URL.
     */
    public function initiatePayment(
        string $accessToken,
        int    $amountXof,
        string $orderId,
        string $returnUrl,
        string $cancelUrl,
        string $notifUrl,
    ): array {
        if ($accessToken === 'STUB_TOKEN') {
            return [
                'pay_token'   => 'STUB_PAY_' . $orderId,
                'payment_url' => '#',
                'status'      => 'PENDING',
            ];
        }

        $response = Http::withToken($accessToken)
            ->withHeaders(['Authorization' => 'Bearer ' . $accessToken])
            ->post($this->apiUrl . '/webpayment', [
                'merchant_key' => $this->merchantKey,
                'currency'     => 'OAF',           // Orange Money code for XOF
                'order_id'     => $orderId,
                'amount'       => $amountXof,
                'return_url'   => $returnUrl,
                'cancel_url'   => $cancelUrl,
                'notif_url'    => $notifUrl,
                'lang'         => 'fr',
            ]);

        if ($response->failed()) {
            throw new \RuntimeException('Orange Money initiate error: ' . $response->body());
        }

        $body = $response->json();
        return [
            'pay_token'   => $body['pay_token']   ?? null,
            'payment_url' => $body['payment_url'] ?? null,
            'status'      => $body['status']      ?? 'PENDING',
        ];
    }

    /**
     * Step 3 — Verify a payment after the callback.
     */
    public function verifyPayment(string $accessToken, string $payToken): array
    {
        if ($accessToken === 'STUB_TOKEN') {
            return ['status' => 'SUCCESSFULL', 'txnid' => 'STUB_TXN'];
        }

        $response = Http::withToken($accessToken)
            ->post($this->apiUrl . '/webpayment', [
                'merchant_key' => $this->merchantKey,
                'pay_token'    => $payToken,
            ]);

        if ($response->failed()) {
            throw new \RuntimeException('Orange Money verify error: ' . $response->body());
        }

        return $response->json();
    }
}
