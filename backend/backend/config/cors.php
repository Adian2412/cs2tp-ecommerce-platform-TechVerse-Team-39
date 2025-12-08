<?php

return [
    /*
    |--------------------------------------------------------------------------
    | CORS Configuration
    |--------------------------------------------------------------------------
    |
    | Configure allowed origins for credentialed requests. We explicitly list
    | the front-end dev hosts instead of using "*" because credentials
    | (cookies) are included.
    |
    */

    'paths' => ['api/*', 'login', 'register', 'logout', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'http://127.0.0.1:5500',
        'http://localhost:5500',
        'http://127.0.0.1:5501',
        'http://localhost:5501',
        'http://127.0.0.1:3000',
        'http://localhost:3000',
        'https://cs2team39.cs2410-web01pvm.aston.ac.uk',
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => [
        'Content-Type',
        'X-Requested-With',
        'Authorization',
        'Accept',
        'Origin',
        'X-XSRF-TOKEN',
        'X-Session-Token',
    ],

    'exposed_headers' => [
        'X-Session-Token',
        'X-Session-Active',
        'X-Session-ID',
        'X-User-Authenticated',
        'X-User-ID',
    ],

    'max_age' => 86400,

    'supports_credentials' => true,
];
