#!/usr/bin/env php
<?php

/**
 * Updates data.json projects based on their GitHub README files.
 *
 * Usage: php update-from-github.php [--dry-run]
 *
 * For each project with a codeUrl:
 * - Fetches the README from GitHub
 * - Extracts title from first # heading
 * - Extracts description from first paragraph
 * - Downloads first image as preview
 */

$dryRun = in_array('--dry-run', $argv);
$dataFile = __DIR__ . '/data.json';
$imageDir = __DIR__ . '/assets/images/';

// Load data.json
$data = json_decode(file_get_contents($dataFile), true);
if (!$data) {
    die("Error: Could not read data.json\n");
}

foreach ($data['projects'] as $index => &$project) {
    $codeUrl = $project['codeUrl'] ?? '';

    if (empty($codeUrl) || strpos($codeUrl, 'github.com') === false) {
        echo "Skipping: {$project['title']} (no GitHub URL)\n";
        continue;
    }

    echo "\nProcessing: {$project['title']}\n";
    echo "URL: $codeUrl\n";

    // Parse GitHub URL to get owner/repo
    $parsed = parseGitHubUrl($codeUrl);
    if (!$parsed) {
        echo "  Could not parse GitHub URL\n";
        continue;
    }

    // Fetch README
    $readme = fetchReadme($parsed['owner'], $parsed['repo'], $parsed['path']);
    if (!$readme) {
        echo "  Could not fetch README\n";
        continue;
    }

    // Extract title
    $title = extractTitle($readme);
    if ($title) {
        echo "  Title: $title\n";
        if (!$dryRun) {
            $project['title'] = $title;
        }
    }

    // Extract description
    $description = extractDescription($readme);
    if ($description) {
        $shortDesc = strlen($description) > 100 ? substr($description, 0, 100) . '...' : $description;
        echo "  Description: $shortDesc\n";
        if (!$dryRun) {
            $project['description'] = $description;
        }
    }

    // Extract and download first image
    $imageUrl = extractFirstImage($readme, $parsed['owner'], $parsed['repo'], $parsed['branch'], $parsed['path']);
    if ($imageUrl) {
        echo "  Image URL: $imageUrl\n";

        $slug = slugify($title ?: $project['title']);
        $ext = pathinfo(parse_url($imageUrl, PHP_URL_PATH), PATHINFO_EXTENSION) ?: 'png';
        $localPath = "assets/images/{$slug}-preview.{$ext}";

        if (!$dryRun) {
            $downloaded = downloadImage($imageUrl, $imageDir . "{$slug}-preview.{$ext}");
            if ($downloaded) {
                $project['image'] = $localPath;
                echo "  Downloaded to: $localPath\n";
            }
        } else {
            echo "  Would download to: $localPath\n";
        }
    }
}

// Save updated data.json
if (!$dryRun) {
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    file_put_contents($dataFile, $json . "\n");
    echo "\ndata.json updated!\n";
} else {
    echo "\n[Dry run - no changes made]\n";
}

// === Helper functions ===

function parseGitHubUrl(string $url): ?array
{
    // Handle: github.com/owner/repo or github.com/owner/repo/tree/branch/path
    if (preg_match('#github\.com/([^/]+)/([^/]+)(?:/tree/([^/]+)(/.*)?)?#', $url, $matches)) {
        return [
            'owner' => $matches[1],
            'repo' => $matches[2],
            'branch' => $matches[3] ?? 'main',
            'path' => isset($matches[4]) ? ltrim($matches[4], '/') : ''
        ];
    }
    return null;
}

function fetchReadme(string $owner, string $repo, string $path = ''): ?string
{
    $branches = ['main', 'master'];
    $readmeFiles = ['README.md', 'readme.md', 'Readme.md'];

    foreach ($branches as $branch) {
        foreach ($readmeFiles as $readmeFile) {
            $readmePath = $path ? "{$path}/{$readmeFile}" : $readmeFile;
            $url = "https://raw.githubusercontent.com/{$owner}/{$repo}/{$branch}/{$readmePath}";

            $content = @file_get_contents($url);
            if ($content !== false) {
                return $content;
            }
        }
    }

    return null;
}

function extractTitle(string $readme): ?string
{
    // Match first # heading
    if (preg_match('/^#\s+(.+)$/m', $readme, $matches)) {
        $title = trim($matches[1]);
        // Remove emojis
        $title = removeEmojis($title);
        return $title;
    }
    return null;
}

function removeEmojis(string $text): string
{
    // Remove emoji characters
    $text = preg_replace('/[\x{1F600}-\x{1F64F}]/u', '', $text); // Emoticons
    $text = preg_replace('/[\x{1F300}-\x{1F5FF}]/u', '', $text); // Misc Symbols and Pictographs
    $text = preg_replace('/[\x{1F680}-\x{1F6FF}]/u', '', $text); // Transport and Map
    $text = preg_replace('/[\x{1F1E0}-\x{1F1FF}]/u', '', $text); // Flags
    $text = preg_replace('/[\x{2600}-\x{26FF}]/u', '', $text);   // Misc symbols
    $text = preg_replace('/[\x{2700}-\x{27BF}]/u', '', $text);   // Dingbats
    $text = preg_replace('/[\x{FE00}-\x{FE0F}]/u', '', $text);   // Variation Selectors
    $text = preg_replace('/[\x{1F900}-\x{1F9FF}]/u', '', $text); // Supplemental Symbols
    $text = preg_replace('/[\x{1FA00}-\x{1FA6F}]/u', '', $text); // Chess Symbols
    $text = preg_replace('/[\x{1FA70}-\x{1FAFF}]/u', '', $text); // Symbols and Pictographs Extended-A
    $text = preg_replace('/[\x{231A}-\x{231B}]/u', '', $text);   // Watch, Hourglass
    $text = preg_replace('/[\x{23E9}-\x{23F3}]/u', '', $text);   // Media control symbols
    $text = preg_replace('/[\x{23F8}-\x{23FA}]/u', '', $text);   // Media control symbols
    $text = preg_replace('/[\x{25AA}-\x{25AB}]/u', '', $text);   // Squares
    $text = preg_replace('/[\x{25B6}]/u', '', $text);            // Play button
    $text = preg_replace('/[\x{25C0}]/u', '', $text);            // Reverse button
    $text = preg_replace('/[\x{25FB}-\x{25FE}]/u', '', $text);   // Squares
    $text = preg_replace('/[\x{2934}-\x{2935}]/u', '', $text);   // Arrows
    $text = preg_replace('/[\x{2B05}-\x{2B07}]/u', '', $text);   // Arrows
    $text = preg_replace('/[\x{2B1B}-\x{2B1C}]/u', '', $text);   // Squares
    $text = preg_replace('/[\x{2B50}]/u', '', $text);            // Star
    $text = preg_replace('/[\x{2B55}]/u', '', $text);            // Circle
    $text = preg_replace('/[\x{3030}]/u', '', $text);            // Wavy dash
    $text = preg_replace('/[\x{303D}]/u', '', $text);            // Part alternation mark
    $text = preg_replace('/[\x{3297}]/u', '', $text);            // Circled Ideograph Congratulation
    $text = preg_replace('/[\x{3299}]/u', '', $text);            // Circled Ideograph Secret
    // Clean up extra spaces
    $text = preg_replace('/\s+/', ' ', $text);
    return trim($text);
}

function extractDescription(string $readme): ?string
{
    // Remove the title line first
    $content = preg_replace('/^#\s+.+$/m', '', $readme, 1);

    // Remove badges (lines with only images/links at the start)
    $content = preg_replace('/^\s*(\[!\[.*?\]\(.*?\)\]\(.*?\)\s*)+$/m', '', $content);

    // Find first non-empty paragraph (not a heading, not an image, not a list)
    $lines = explode("\n", $content);
    $paragraph = '';
    $inParagraph = false;

    foreach ($lines as $line) {
        $trimmed = trim($line);

        // Skip empty lines before paragraph
        if (!$inParagraph && empty($trimmed)) {
            continue;
        }

        // Skip headings, images, lists, code blocks
        if (preg_match('/^(#|!\[|\*|\-|\d+\.|```|<)/', $trimmed)) {
            if ($inParagraph) break;
            continue;
        }

        // Start or continue paragraph
        if (!empty($trimmed)) {
            $inParagraph = true;
            $paragraph .= ($paragraph ? ' ' : '') . $trimmed;
        } else if ($inParagraph) {
            break;
        }
    }

    // Clean up markdown formatting
    $paragraph = preg_replace('/\[([^\]]+)\]\([^)]+\)/', '$1', $paragraph); // Links
    $paragraph = preg_replace('/[*_]{1,2}([^*_]+)[*_]{1,2}/', '$1', $paragraph); // Bold/italic
    $paragraph = preg_replace('/`([^`]+)`/', '$1', $paragraph); // Inline code

    return $paragraph ?: null;
}

function extractFirstImage(string $readme, string $owner, string $repo, string $branch, string $path = ''): ?string
{
    $imageUrl = null;

    // Try HTML img tag first (handles multiple images in tables/divs)
    if (preg_match('/<img[^>]+src=["\']([^"\']+)["\'][^>]*>/i', $readme, $matches)) {
        $imageUrl = $matches[1];
    }
    // Then try markdown image: ![alt](url)
    elseif (preg_match('/!\[[^\]]*\]\(([^)\s]+)(?:\s[^)]*)?\)/', $readme, $matches)) {
        $imageUrl = $matches[1];
    }

    if (!$imageUrl) {
        return null;
    }

    // Clean up URL (remove query strings for raw github)
    $imageUrl = preg_replace('/\?.*$/', '', $imageUrl);

    // Handle relative URLs
    if (!preg_match('#^https?://#', $imageUrl)) {
        // Remove leading ./
        $imageUrl = preg_replace('#^\./#', '', $imageUrl);
        $basePath = $path ? "{$path}/" : '';
        $imageUrl = "https://raw.githubusercontent.com/{$owner}/{$repo}/{$branch}/{$basePath}{$imageUrl}";
    }

    // Convert github.com blob URLs to raw URLs
    if (preg_match('#github\.com/([^/]+)/([^/]+)/blob/([^/]+)/(.+)#', $imageUrl, $matches)) {
        $imageUrl = "https://raw.githubusercontent.com/{$matches[1]}/{$matches[2]}/{$matches[3]}/{$matches[4]}";
    }

    return $imageUrl;
}

function downloadImage(string $url, string $destination): bool
{
    $content = @file_get_contents($url);
    if ($content === false) {
        return false;
    }

    return file_put_contents($destination, $content) !== false;
}

function slugify(string $text): string
{
    $text = strtolower($text);
    $text = preg_replace('/[^a-z0-9]+/', '-', $text);
    $text = trim($text, '-');
    return $text;
}
