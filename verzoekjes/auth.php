<?php

session_start();
require_once __DIR__ . '/config.php';

// One-time setup: once a token exists nobody can log in again (delete token.json to re-auth)
if (file_exists(TOKEN_FILE)) {
    http_response_code(403);
    die('Al ingelogd');
}

$scopes = 'playlist-modify-public playlist-modify-private';
$_SESSION['oauth_state'] = bin2hex(random_bytes(16));

$authUrl = 'https://accounts.spotify.com/authorize?' . http_build_query([
    'response_type' => 'code',
    'client_id' => SPOTIFY_CLIENT_ID,
    'scope' => $scopes,
    'redirect_uri' => SPOTIFY_REDIRECT_URI,
    'state' => $_SESSION['oauth_state'],
]);

header('Location: ' . $authUrl);
exit;
