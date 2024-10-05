<?php

require 'vendor/autoload.php';

define('COUNTER_FILE_PATH', 'counter.txt');

$readmeMarkdown = file_get_contents('README.md');
$parsedown = new Parsedown();
$readmeHtml = $parsedown->text($readmeMarkdown);

function getRandomColor(): string
{
    $hue = mt_rand(0, 360);
    return "hsla({$hue}, 100%, 50%, 1)";
}

function getInvertedColor(string $hsla): string
{
    preg_match('/hsla\((\d+),/', $hsla, $matches);
    $hue = (int) $matches[1];
    $invertedHue = ($hue + 180) % 360;
    return preg_replace('/hsla\((\d+),/', "hsla({$invertedHue},", $hsla);
}

function getRandomFont(): string
{
    $fonts = [
        'Comic Sans MS',
        'Impact',
        'Courier New',
        'Arial Black',
        'Georgia'
    ];
    return $fonts[array_rand($fonts)];
}

function getRandomBorder(): string
{
    $borders = [
        '2px dashed #ff0000',
        '3px solid #00ff00',
        '2px dotted #0000ff',
        '4px double #ffff00',
        '2px groove #ff00ff',
        '3px ridge #00ffff'
    ];
    return $borders[array_rand($borders)];
}

function getCounterValue(): int
{
    if (!file_exists(COUNTER_FILE_PATH)) {
        file_put_contents(COUNTER_FILE_PATH, '0');
    }
    return intval(file_get_contents(COUNTER_FILE_PATH));
}

function updateCounter(): void
{
    $count = getCounterValue();
    $count++;
    file_put_contents(COUNTER_FILE_PATH, $count);
}

function getCounterText(): string
{
    $count = getCounterValue();
    if ($count % 3 == 0 && $count % 5 == 0) {
        return 'FizzBuzz';
    } elseif ($count % 3 == 0) {
        return 'Fizz';
    } elseif ($count % 5 == 0) {
        return 'Buzz';
    } else {
        return str_pad($count, 6, '0', STR_PAD_LEFT);
    }
}

$readmeHtml = preg_replace_callback('/<a href="(.*?)"/', function ($matches) {
    $color = getRandomColor();
    $url = $matches[1];
    $isExternal = preg_match('/^https?:\/\//', $url);
    $targetRelAttributes = $isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
    return "<a href=\"{$url}\" style=\"color: {$color};\"{$targetRelAttributes}";
}, $readmeHtml);

$readmeHtml = preg_replace_callback('/<img\s+([^>]*)src="([^"]+)"([^>]*)>/', function ($matches) {
    if (!str_contains($matches[0], 'loading=')) {
        return "<img {$matches[1]}src=\"{$matches[2]}\"{$matches[3]} loading=\"lazy\">";
    }
    return $matches[0];
}, $readmeHtml);

$scrollbarPrimaryColor = getRandomColor();
$scrollbarColorSecondaryColor = getInvertedColor($scrollbarPrimaryColor);

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
        ::-webkit-scrollbar {
            width: 16px;
        }

        ::-webkit-scrollbar-track {
            background: linear-gradient(45deg, <?php echo $scrollbarPrimaryColor; ?>, <?php echo $scrollbarColorSecondaryColor; ?>);
        }

        ::-webkit-scrollbar-thumb {
            background-color: <?php echo $scrollbarPrimaryColor; ?>;
            border: 3px solid <?php echo $scrollbarColorSecondaryColor; ?>;
            border-radius: 5px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background-color: <?php echo $scrollbarPrimaryColor; ?>;
        }

        * {
            scrollbar-color: <?php echo $scrollbarPrimaryColor; ?> <?php echo $scrollbarColorSecondaryColor; ?>;
            scrollbar-width: thin;
        }

        .trail {
            position: absolute;
            width: 15px;
            height: 15px;
            background-color: <?php echo getRandomColor(); ?>;
            border-radius: 50%;
            box-shadow: 0 0 5px #000;
            animation: fade 0.8s ease-out forwards;
            pointer-events: none;
        }

        @keyframes fade {
            to {
                opacity: 0;
                transform: scale(2);
            }
        }
    </style>
</head>
<body>
    <div id="content">
        <marquee
            behavior="scroll"
            direction="left"
            scrollamount="25"
            onmouseover="this.stop();"
            onmouseout="this.start();"
            style="color: <?php echo getRandomColor(); ?>;"
        >
            Welcome to my homepage!
        </marquee>

        <?php echo $readmeHtml; ?>

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

    <script type="text/javascript" src="/assets/js/favicon.js" defer></script>
    <script type="text/javascript" src="/assets/js/onblur.js" defer></script>
    <script type="text/javascript" src="/assets/js/mouse-trail.js" defer></script>
    <script type="text/javascript" src="/assets/js/screensaver.js" defer></script>
</body>
</html>

<?php updateCounter(); ?>
