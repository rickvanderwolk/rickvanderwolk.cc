<?php

$allowedOrigins = [
    '<origin>'
];

if(isset($_SERVER['HTTP_ORIGIN'])) {
    $origin = $_SERVER['HTTP_ORIGIN'];
    if(in_array($origin, $allowedOrigins)) {
        header("Access-Control-Allow-Origin: $origin");
    }
}

$data = json_decode(file_get_contents('data.txt'), true);

if (empty($data)) {
    echo json_encode(['error' => 'Unable to load data']);
    exit;
}

echo json_encode($data);
exit;
