<?php

function getMoonPhaseEmoji(): string
{
    $lunarMonth = 29.530588853;
    $knownNewMoon = new DateTime('2000-01-06 18:14:00');
    $now = new DateTime('now');
    $diff = $now->diff($knownNewMoon)->days + ($now->diff($knownNewMoon)->h + ($now->diff($knownNewMoon)->i / 60) / 24);
    $currentAge = fmod($diff, $lunarMonth);
    $phase = $currentAge / $lunarMonth;

    if ($phase < 0.0625 || $phase >= 0.9375) {
        return '🌑';
    } elseif ($phase < 0.1875) {
        return '🌒';
    } elseif ($phase < 0.3125) {
        return '🌓';
    } elseif ($phase < 0.4375) {
        return '🌔';
    } elseif ($phase < 0.5625) {
        return '🌕';
    } elseif ($phase < 0.6875) {
        return '🌖';
    } elseif ($phase < 0.8125) {
        return '🌗';
    } else {
        return '🌘';
    }
}

function getWeatherAndMoonEmoji(
    string $location,
    string $apiKey
): string {
    $cacheFile = __DIR__ . '/cache/' . $location. '_weather.json';
    if (file_exists($cacheFile) && (filemtime($cacheFile) > (time() - 300))) {
        $response = file_get_contents($cacheFile);
    } else {
        $url = 'http://api.openweathermap.org/data/2.5/weather?q=' . urlencode($location) . '&appid=' . $apiKey . '&units=metric';

        $curl = curl_init();
        curl_setopt($curl, CURLOPT_URL, $url);
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
        $response = curl_exec($curl);
        curl_close($curl);

        if (!file_exists(__DIR__ . '/cache')) {
            mkdir(__DIR__ . '/cache', 0755, true);
        }
        file_put_contents($cacheFile, $response);
    }

    $data = json_decode($response, true);

    if (empty($data['weather'][0]['main'])) {
        return '🌈';
    }

    $currentTime = time();
    $sunrise = $data['sys']['sunrise'];
    $sunset = $data['sys']['sunset'];

    if (
        $currentTime >= $sunrise
        &&
        $currentTime <= $sunset
    ) {
        switch ($data['weather'][0]['main']) {
            case 'Clear':
                return '☀️';
            case 'Clouds':
                return '☁️';
            case 'Drizzle':
            case 'Rain':
                return '🌧️';
            case 'Snow':
                return '❄️';
            case 'Mist':
            case 'Fog':
                return '🌫️';
            default:
                return '🌈';
        }
    } else {
        return getMoonPhaseEmoji();
    }
}

function loadEnvVariables($pathToEnv) {
    if (!file_exists($pathToEnv)) {
        throw new Exception('Unable to load environment variables');
    }

    $lines = file($pathToEnv, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) {
            continue;
        }

        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);

        if (preg_match('/^(".*"|\'.*\')$/', $value)) {
            $value = substr($value, 1, -1);
        }

        $_ENV[$name] = $value;
        putenv("$name=$value");
    }
}

loadEnvVariables(__DIR__ . '/.env');
$location = 'Amsterdam';
$apiKey = getenv('OPENWEATHERMAP_API_KEY');
$emoji = getWeatherAndMoonEmoji($location, $apiKey);
echo json_encode(['emoji' => $emoji]);
exit;
