<?php
ini_set('display_errors', 0);
require_once 'aliases.php';
if (!empty($_GET['alias']) && array_key_exists($_GET['alias'], $aliases)) {
    header('Location: ' . $aliases[$_GET['alias']]);
    exit;
}
?>

<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>/$</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        html,
        body {
            background: white;
            color: black;
        }
        @media (prefers-color-scheme: dark) {
            html,
            body {
                background: black;
                color: white;
            }
        }
    </style>
</head>
<body>
    <h1>/$</h1><?php
        if (!empty($_GET['alias'])) {
            ?><p style="color: red;">Unknown alias</p><?php
        }
    ?><ul><?php
    foreach ($aliases as $alias => $url) {
        ?><li><?php
        echo '/$/' . $alias . ' > ' . '<a href="' . $url . '">' . $url . '</a>';
        ?></li><?php
    }
    ?></ul>
</body>
</html>
