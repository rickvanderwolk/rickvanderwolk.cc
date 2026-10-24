<?php

session_start();
require_once __DIR__ . '/config.php';

if (file_exists(TOKEN_FILE)) {
    http_response_code(403);
    die('Al ingelogd');
}

$state = $_SESSION['oauth_state'] ?? '';
unset($_SESSION['oauth_state']);
if ($state === '' || !hash_equals($state, $_GET['state'] ?? '')) {
    http_response_code(400);
    die('Ongeldige state');
}

if (!isset($_GET['code'])) {
    die('Geen code ontvangen');
}

$ch = curl_init('https://accounts.spotify.com/api/token');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => http_build_query([
        'grant_type' => 'authorization_code',
        'code' => $_GET['code'],
        'redirect_uri' => SPOTIFY_REDIRECT_URI,
    ]),
    CURLOPT_HTTPHEADER => [
        'Authorization: Basic ' . base64_encode(SPOTIFY_CLIENT_ID . ':' . SPOTIFY_CLIENT_SECRET),
        'Content-Type: application/x-www-form-urlencoded',
    ],
]);

$response = curl_exec($ch);

$data = json_decode($response, true);

if (isset($data['access_token'])) {
    $data['created_at'] = time();
    file_put_contents(TOKEN_FILE, json_encode($data, JSON_PRETTY_PRINT));
    header('Location: /');
    exit;
} else {
    echo 'Inlogfout: ' . ($data['error_description'] ?? 'Onbekend');
}
