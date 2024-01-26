<?php
require_once 'vendor/autoload.php';
use Ramsey\Uuid\Uuid;
$uuid = Uuid::uuid4();
?>

<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>UUID</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="one UUID, one request">
    <meta name="author" content="Rick van der Wolk">
    <style>
        html,
        body {
            margin: 0;
            padding: 0;
            height: 100%;
            width: 100%;
            background: white;
            color: black;
            font-family: 'Times New Roman', Times, serif;
        }
        h1 {
            font-size: 4em;
            margin: 15px;
        }
        @media (prefers-color-scheme: dark) {
            html,
            body {
                background: black;
                color: white;
            }
        }
        @media only screen and (max-width: 768px) {
            h1 {
                font-size: 1em;
            }
        }
    </style>
</head>
<body>
<div>
    <h1><?php echo $uuid; ?></h1>
</div>
</body>
</html>
