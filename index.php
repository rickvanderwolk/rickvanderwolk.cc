<?php

define('COUNTER_FILE_PATH', 'counter.txt');

// Load data from JSON
$data = json_decode(file_get_contents('data.json'), true);

// Get active tag filter
$activeTag = isset($_GET['tag']) ? $_GET['tag'] : null;

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

function getFonts(): array
{
    return [
        'Comic Sans MS',
        'Impact',
        'Courier New',
        'Arial Black',
        'Georgia',
        'Times New Roman',
        'Trebuchet MS',
        'Verdana',
        'Palatino',
        'Lucida Console'
    ];
}

function getRandomFont(): string
{
    return getFonts()[array_rand(getFonts())];
}

function stylizeTitle(string $text): string
{
    $fonts = getFonts();
    $color = getRandomColor();
    $result = '';

    for ($i = 0; $i < mb_strlen($text); $i++) {
        $char = mb_substr($text, $i, 1);
        if ($char === ' ' || $char === '.') {
            $result .= $char;
        } else {
            $font = $fonts[array_rand($fonts)];
            $result .= "<span style=\"font-family: '{$font}';\">{$char}</span>";
        }
    }

    return "<span style=\"color: {$color};\">{$result}</span>";
}

function stylizeHeading(string $text, string $color): string
{
    $fonts = getFonts();
    $baseFont = $fonts[array_rand($fonts)];
    $specialLetters = ['a', 'e', 'i', 'o', 'u', 'A', 'E', 'I', 'O', 'U'];
    $result = '';

    for ($i = 0; $i < mb_strlen($text); $i++) {
        $char = mb_substr($text, $i, 1);
        if (in_array($char, $specialLetters)) {
            $font = $fonts[array_rand($fonts)];
            $result .= "<span style=\"font-family: '{$font}';\">{$char}</span>";
        } else {
            $result .= $char;
        }
    }

    return "<span style=\"font-family: '{$baseFont}'; color: {$color};\">{$result}</span>";
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

// Count tag frequency from projects
$tagCounts = [];
foreach ($data['projects'] as $project) {
    foreach ($project['tags'] as $tag) {
        $tagCounts[$tag] = ($tagCounts[$tag] ?? 0) + 1;
    }
}
arsort($tagCounts); // Sort by frequency, highest first

// Calculate size based on frequency
$maxCount = max($tagCounts);
$minCount = min($tagCounts);

// Build tag cloud HTML
$tagCloudHtml = '<nav class="word-cloud">';
$first = true;
$pos = 1;
foreach ($tagCounts as $tag => $count) {
    $isActive = $activeTag === $tag;
    $activeClass = $isActive ? ' active' : '';
    $url = $isActive ? '/' : "/?tag=" . urlencode($tag);

    if ($first) {
        // Most frequent tag is center
        $tagCloudHtml .= "<a href=\"{$url}\" class=\"cloud-item cloud-center{$activeClass}\">{$tag}</a>";
        $first = false;
    } else {
        // Size based on relative frequency (1-3)
        $size = $maxCount === $minCount ? 2 : round(1 + 2 * ($count - $minCount) / ($maxCount - $minCount));
        $tagCloudHtml .= "<a href=\"{$url}\" class=\"cloud-item size-{$size} pos-{$pos}{$activeClass}\">{$tag}</a>";
        $pos++;
    }
}
$tagCloudHtml .= '</nav>';

// Show active filter message
$filterHtml = '';
if ($activeTag) {
    $filterHtml = "<div class=\"active-filter\">Filtered by: <strong>{$activeTag}</strong> <a href=\"/\" class=\"clear-filter\">✕</a></div>";
}

// Build projects HTML (filtered if tag is active)
$projectsHtml = '';
$rowIndex = 0;
foreach ($data['projects'] as $project) {
    // Skip if filtering and project doesn't have this tag
    if ($activeTag && !in_array($activeTag, $project['tags'])) {
        continue;
    }

    $rowClass = $rowIndex % 2 === 0 ? 'row' : 'row row-reverse';
    $rowIndex++;
    $color = getRandomColor();
    $title = stylizeHeading($project['title'], $color);
    $projectsHtml .= "<a href=\"{$project['url']}\" class=\"{$rowClass}\">
        <div class=\"image-col\" style=\"border: 3px solid {$color};\"><img src=\"{$project['image']}\" loading=\"lazy\"></div>
        <div class=\"text-col\"><h2>{$title}</h2><p>{$project['description']}</p></div>
    </a>";
}

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
        <!--<marquee
            behavior="scroll"
            direction="left"
            scrollamount="25"
            onmouseover="this.stop();"
            onmouseout="this.start();"
            style="color: <?php /*echo getRandomColor(); */?>;"
        >
            Welcome to my homepage!
        </marquee>-->

        <h1><?php echo stylizeTitle($data['title']); ?></h1>
        <h2 class="subtitle"><?php echo $data['subtitle']; ?></h2>

        <?php echo $tagCloudHtml; ?>

        <?php echo $filterHtml; ?>

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

<!--    <script type="text/javascript" src="/assets/js/favicon.js" defer></script>-->
    <script type="text/javascript" src="/assets/js/onblur.js" defer></script>
    <script type="text/javascript" src="/assets/js/mouse-trail.js" defer></script>
<!--    <script type="text/javascript" src="/assets/js/screensaver.js" defer></script>-->
</body>
</html>

<?php updateCounter(); ?>
