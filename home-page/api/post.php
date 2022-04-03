<?php

if (
    empty($_GET['token'])
    ||
    $_GET['token'] !== '<token>'
) {
    exit;
}

$json = file_get_contents('php://input');
file_put_contents('data.txt', $json);
