<?php

require 'vendor/autoload.php';

$readmeMarkdown = file_get_contents('README.md');
$parsedown = new Parsedown();
$readmeHtml = $parsedown->text($readmeMarkdown);

function generateRandomColor() {
    $hue = mt_rand(0, 360);
    return "hsla({$hue}, 100%, 50%, 1)";
}

$readmeHtml = preg_replace_callback('/<a href="(.*?)"/', function ($matches) {
    $color = generateRandomColor();
    $url = $matches[1];
    $isExternal = preg_match('/^https?:\/\//', $url);
    $targetRelAttributes = $isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
    return "<a href=\"{$url}\" style=\"color: {$color};\"{$targetRelAttributes}";
}, $readmeHtml);

?><!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>rickvanderwolk.cc</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="Hello world - This is my creative coding playground.">
    <meta name="author" content="Rick van der Wolk">
    <link rel="stylesheet" href="/assets/css/main.css">
</head>
<body>
    <div id="content">
        <?php echo $readmeHtml; ?>

        <p>
            View source code on
                <a
                    href="https://github.com/rickvanderwolk/rickvanderwolk.cc"
                    target="_blank"
                    rel="noopener noreferrer"
                >GitHub</a>
        </p>
    </div>

    <script type="text/javascript" src="/assets/js/favicon.js"></script>
    <script type="text/javascript" src="/assets/js/onblur.js"></script>
</body>
</html>
