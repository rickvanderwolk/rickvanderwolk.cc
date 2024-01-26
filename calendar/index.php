<?php
$year = isset($_GET['year']) ? intval($_GET['year']) : date('Y');
$months = [1 => 'Januari', 2 => 'Februari', 3 => 'Maart', 4 => 'April', 5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Augustus', 9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'December'];
$daysOfWeek = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
?>

<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <style>
        body {
            font-family: Arial, Verdana;
            padding: 20px 20px 40px;
        }
        .calendar-container {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
        }
        .month {
            max-width: 300px;
            margin: 10px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #ccc;
        }
        th, td {
            padding: 8px;
            border: 1px solid #ccc;
            text-align: center;
        }
        td.current-day {
            background-color: #ff6347;
            color: #fff;
        }
        td.week-number {
            background-color: #f0f0f0;
            text-align: center;
        }

        @media (prefers-color-scheme: dark) {
            body {
                background-color: #000;
                color: #fff;
            }
            th {
                background-color: #555;
                color: #fff;
            }
            td.current-day {
                background-color: #db7093;
                color: #fff;
            }
            td.week-number {
                background-color: #333;
                color: #fff;
            }
        }

        @media (prefers-color-scheme: light) {
            body {
                background-color: #fff;
                color: #000;
            }
            th {
                background-color: #eee;
                color: #000;
            }
        }

        @media (min-width: 600px) {
            .month {
                max-width: none;
            }
        }
    </style>
</head>
<body>
<?php
function buildCalendar($year, $months, $daysOfWeek) {
    $currentDate = date('Y-m-d');
    ?><div class='calendar-container'><?php
    foreach ($months as $monthNum => $month) {
        ?><div class='month'><?php
        $firstDayOfMonth = mktime(0, 0, 0, $monthNum, 1, $year);
        $numberDays = date('t', $firstDayOfMonth);
        $dateComponents = getdate($firstDayOfMonth);
        $dayOfWeek = $dateComponents['wday'];
        $dayOfWeek = ($dayOfWeek - 1 + 7) % 7;
        $weekNumber = date('W', $firstDayOfMonth);
        ?><h2 style='font-size: 20px; text-align: center;'><?php echo $month . ' ' .  $year; ?></h2>
        <table>
            <tr>
                <th>Wk</th>
                <?php foreach ($daysOfWeek as $day) {
                    ?><th><?php echo $day; ?></th><?php
                }
                ?> </tr><tr>
                <td class='week-number'><?php echo $weekNumber; ?></td><?php

                if ($dayOfWeek > 0) {
                    ?><td colspan='<?php echo $dayOfWeek; ?>'>&nbsp;</td><?php
                }

                $currentDay = 1;
                while ($currentDay <= $numberDays) {
                if ($dayOfWeek == 7) {
                $dayOfWeek = 0;
                ?></tr><tr><?php
                $weekNumber = date('W', mktime(0, 0, 0, $monthNum, $currentDay, $year));
                ?><td class='week-number'><?php echo $weekNumber; ?></td><?php
                }

                $dateString = sprintf("%04d-%02d-%02d", $year, $monthNum, $currentDay);
                $class = ($dateString === $currentDate) ? 'current-day' : '';
                ?><td class="<?php echo $class; ?>"><?php echo $currentDay; ?></td><?php

                $currentDay++;
                $dayOfWeek++;
                }

                if ($dayOfWeek != 7) {
                    $remainingDays = 7 - $dayOfWeek;
                    ?><td colspan='<?php echo $remainingDays; ?>'>&nbsp;</td><?php
                }
                ?></tr>
        </table>
        </div><?php
    }
    ?></div><?php
}

buildCalendar($year, $months, $daysOfWeek);

?>

<script>
    console.group('URL parameters');
    console.group('optional');
    console.group('year');
    console.log('default: current year');
    console.log('example: ?year=2032');
    console.groupEnd();
    console.groupEnd();
    console.groupEnd();
</script>
</body>
</html>
