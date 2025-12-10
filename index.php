<?php

require_once 'functions.php';

$data = json_decode(file_get_contents('data.json'), true);
$activeTag = isset($_GET['tag']) ? $_GET['tag'] : null;

$tagCloudHtml = buildTagCloud($data['projects'], $activeTag);
$projectsHtml = buildProjectsHtml($data['projects'], $activeTag);


$scrollbarPrimaryColor = getRandomColor();
$scrollbarSecondaryColor = getInvertedColor($scrollbarPrimaryColor);
$trailColor = getRandomColor();

?><!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>rickvanderwolk.cc</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="Hello world - This is my creative coding playground.">
    <meta name="author" content="Rick van der Wolk">
    <link rel="stylesheet" href="/assets/css/main.css">
    <style>
        :root {
            --scrollbar-primary: <?php echo $scrollbarPrimaryColor; ?>;
            --scrollbar-secondary: <?php echo $scrollbarSecondaryColor; ?>;
            --trail-color: <?php echo $trailColor; ?>;
        }
    </style>
</head>
<body>
    <div id="content">
        <h1><?php echo stylizeTitle($data['title']); ?></h1>

        <?php echo $tagCloudHtml; ?>

        <?php echo $projectsHtml; ?>

        <div id="counter">
            <?php
            $counterText = getCounterText();
            foreach (str_split($counterText) as $char) {
                $font = getRandomFont();
                $color = getRandomColor();
                $border = getRandomBorder();
                echo "<span style='font-family: $font; color: $color; border: $border; padding: 10px; margin: 5px;'>$char</span>";
            }
            ?>
        </div>

        <p>
            View source code on
                <a
                    href="https://github.com/rickvanderwolk/rickvanderwolk.cc"
                    target="_blank"
                    rel="noopener noreferrer"
                >GitHub</a>
        </p>
    </div>

    <div id="screensaver">
        <div id="screensaver-text">rickvanderwolk.cc</div>
    </div>

    <script type="text/javascript" src="/assets/js/word-cloud.js" defer></script>
    <script type="text/javascript" src="/assets/js/tag-filter.js" defer></script>
    <script type="text/javascript" src="/assets/js/onblur.js" defer></script>
    <script type="text/javascript" src="/assets/js/mouse-trail.js" defer></script>
</body>
</html>

<?php updateCounter(); ?>
