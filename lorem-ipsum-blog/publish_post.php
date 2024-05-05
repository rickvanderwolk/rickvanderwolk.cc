<?php

require_once 'vendor/autoload.php';

date_default_timezone_set('UTC');

$scheduledFile = '<path>/lorem-ipsum-blog/scheduled.txt';

$now = new DateTime;
$today = $now->format('Y-m-d');
$time = $now->format('H:i');

// check if time is scheduled for today, if not, schedule
$data = json_decode(file_get_contents($scheduledFile), true);
if (empty($data[$today]['time'])) {
    $time = str_pad(mt_rand(0, 23), 2, '0', STR_PAD_LEFT) . ':' . str_pad(mt_rand(0, 59), 2, '0', STR_PAD_LEFT);
    $data = [];
    $data[$today] = [
        'time' => $time,
    ];
    file_put_contents($scheduledFile, json_encode($data));
    echo 'scheduled today at ' . $time;
    exit;
}

// check if time scheduled is now
if ($data[$today]['time'] !== $time) {
    exit;
}

// create post
sleep(mt_rand(0, 59));

$loremIpsum = new joshtronic\LoremIpsum();

$numberOfParagraphs = rand(2, 7);
$paragraphs = $loremIpsum->paragraphsArray($numberOfParagraphs);

$numberOfWordsTitle = rand(1, 7);
$title = ucfirst($loremIpsum->words($numberOfWordsTitle));

$timestamp = date('r');

$content = '';
foreach ($paragraphs as $paragraph) {
    $numberOfWordsTitle = rand(1, 7);
    $subTitle = ucfirst($loremIpsum->words($numberOfWordsTitle));
    $content .= '<h4>' . $subTitle . '</h4>';
    $content .= '<p>' . $paragraph . '</p>';
}

$username = '<username>';
$application_password = '<token>';

$url = '<wp_url>/wp-json/wp/v2/posts';

$json = json_encode([
    'title' => $title,
    'content' => $content,
    'status' => 'publish',
]);

try {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_USERPWD, $username.':'.$application_password);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $json);
    $result = curl_exec($ch);
    $status_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    print_r(json_decode($result));
} catch(Exception $e) {
    echo $e->getMessage();
}
