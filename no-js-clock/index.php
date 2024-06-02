<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="refresh" content="60">
    <title>No JS clock</title>
    <style>
        body {
            background-color: #000;
            font-family: Arial, sans-serif;
            color: #fff;
            margin: 0;
            height: 100vh;
            width: 100vw;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
        }
        .container {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            height: 100%;
        }
        .clock {
            text-align: center;
        }
        .time {
            display: inline-block;
        }
        <?php
            $fonts = ["Arial", "Courier New", "Georgia", "Times New Roman", "Verdana"];
            for ($i = 0; $i < 5; $i++) {
                $font = $fonts[array_rand($fonts)];
                $size = rand(20, 60) . "px";
                echo ".digit-$i { font-family: $font; font-size: $size; }\n";
            }
        ?>
        @media (max-width: 600px) {
        <?php
            for ($i = 0; $i < 5; $i++) {
                $size = rand(40, 80) . "px";
                echo ".digit-$i { font-size: $size; }\n";
            }
        ?>
        }
        @media (min-width: 601px) and (max-width: 1200px) {
        <?php
            for ($i = 0; $i < 5; $i++) {
                $size = rand(80, 160) . "px";
                echo ".digit-$i { font-size: $size; }\n";
            }
        ?>
        }
        @media (min-width: 1201px) {
        <?php
            for ($i = 0; $i < 5; $i++) {
                $size = rand(80, 240) . "px";
                echo ".digit-$i { font-size: $size; }\n";
            }
        ?>
        }
    </style>
</head>
<body>
<div class="container">
    <div class="clock">
        <div class="time">
            <?php
            date_default_timezone_set('Europe/Amsterdam');
            $time = date('H:i');
            $digits = str_split($time);
            foreach ($digits as $index => $digit) {
                echo "<span class='digit-$index'>$digit</span>";
            }
            ?>
        </div>
    </div>
</div>
</body>
</html>
