<?php

define('COUNTER_FILE_PATH', 'counter.txt');

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

function buildTagCloud(array $projects, ?string $activeTag): string
{
    $tagCounts = [];
    foreach ($projects as $project) {
        foreach ($project['tags'] as $tag) {
            $tagCounts[$tag] = ($tagCounts[$tag] ?? 0) + 1;
        }
    }

    // Sort by frequency (largest first)
    arsort($tagCounts);

    $maxCount = max($tagCounts);
    $minCount = min($tagCounts);

    $hasActiveClass = $activeTag ? ' has-active' : '';
    $tagCloudHtml = "<nav id=\"word-cloud\" class=\"word-cloud{$hasActiveClass}\">";

    // Output tags - JavaScript will position them
    foreach ($tagCounts as $tag => $count) {
        $isActive = $activeTag === $tag;
        $activeClass = $isActive ? ' active' : '';
        $size = $maxCount === $minCount ? 3 : round(1 + 4 * ($count - $minCount) / ($maxCount - $minCount));

        $tagCloudHtml .= "<a href=\"#\" data-tag=\"{$tag}\" class=\"cloud-item size-{$size}{$activeClass}\">{$tag}</a>";
    }

    $tagCloudHtml .= '</nav>';

    return $tagCloudHtml;
}

function buildProjectsHtml(array $projects, ?string $activeTag): string
{
    $projectsHtml = '<div id="projects">';
    $rowIndex = 0;

    foreach ($projects as $project) {
        $tagsJson = htmlspecialchars(json_encode($project['tags']), ENT_QUOTES, 'UTF-8');
        $isHidden = $activeTag && !in_array($activeTag, $project['tags']);
        $hiddenStyle = $isHidden ? ' style="display:none;"' : '';

        $rowClass = $rowIndex % 2 === 0 ? 'row' : 'row row-reverse';
        $rowIndex++;
        $color = getRandomColor();
        $title = stylizeHeading($project['title'], $color);
        $tagsHtml = '<span class="project-tags">' . implode(', ', $project['tags']) . '</span>';

        $linksHtml = '<div class="project-links">';
        if (!empty($project['liveUrl'])) {
            $linksHtml .= "<a href=\"{$project['liveUrl']}\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"project-link\">View live</a>";
        }
        if (!empty($project['codeUrl'])) {
            $linksHtml .= "<a href=\"{$project['codeUrl']}\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"project-link\">View code</a>";
        }
        $linksHtml .= '</div>';

        $projectsHtml .= "<div class=\"{$rowClass}\" data-tags=\"{$tagsJson}\"{$hiddenStyle}>
            <div class=\"image-col\" style=\"border: 3px solid {$color};\"><img src=\"{$project['image']}\" loading=\"lazy\"></div>
            <div class=\"text-col\"><h2>{$title}</h2><p>{$project['description']}</p>{$tagsHtml}{$linksHtml}</div>
        </div>";
    }

    $projectsHtml .= '</div>';
    return $projectsHtml;
}
