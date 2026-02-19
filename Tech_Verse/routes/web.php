<?php

use Illuminate\Support\Facades\Route;

// Serve the static frontend homepage
Route::get('/', function () {
    return file_get_contents(public_path('index.html'));
});
