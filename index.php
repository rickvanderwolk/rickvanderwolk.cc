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

        <div class="footer">
            <p>Still here?</p>
            <div class="footer-links">
                <a href="https://github.com/rickvanderwolk/rickvanderwolk.cc/blob/main/README.old.md" target="_blank" rel="noopener noreferrer" class="project-link">View source code + more (mostly clocks)</a>
                <a href="https://github.com/rickvanderwolk/garage-8" target="_blank" rel="noopener noreferrer" class="project-link">View garage (more experiments)</a>
                <a href="https://github.com/rickvanderwolk" target="_blank" rel="noopener noreferrer" class="project-link">View all (GitHub profile)</a>
            </div>
        </div>
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
