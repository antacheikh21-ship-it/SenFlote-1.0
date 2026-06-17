<?php

return [

    'mailgun' => [
        'domain'   => env('MAILGUN_DOMAIN'),
        'secret'   => env('MAILGUN_SECRET'),
        'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
        'scheme'   => 'https',
    ],

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key'    => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    // ── Traccar GPS Server ──────────────────────────────────────────────────
    'traccar' => [
        'webhook_secret' => env('TRACCAR_WEBHOOK_SECRET', 'traccar-shared-secret'),
        'api_url'        => env('TRACCAR_API_URL', 'http://traccar:8082/api'),
        'api_user'       => env('TRACCAR_API_USER', 'admin'),
        'api_password'   => env('TRACCAR_API_PASSWORD', 'admin'),
    ],

    // ── Wave (Senegal mobile payment) ───────────────────────────────────────
    'wave' => [
        'api_key'      => env('WAVE_API_KEY'),
        'webhook_secret' => env('WAVE_WEBHOOK_SECRET'),
        'api_url'      => env('WAVE_API_URL', 'https://api.wave.com/v1'),
    ],

    // ── Orange Money (West Africa) ──────────────────────────────────────────
    'orange_money' => [
        'client_id'     => env('ORANGE_MONEY_CLIENT_ID'),
        'client_secret' => env('ORANGE_MONEY_CLIENT_SECRET'),
        'merchant_key'  => env('ORANGE_MONEY_MERCHANT_KEY'),
        'api_url'       => env('ORANGE_MONEY_API_URL', 'https://api.orange.com/orange-money-webpay/dev/v1'),
    ],

];
