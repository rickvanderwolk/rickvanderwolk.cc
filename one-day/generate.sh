#!/bin/bash

echo "<!DOCTYPE html>
<html lang=\"en\">
<head>
    <meta charset=\"UTF-8\">
    <meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
    <title>One day - Select time</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            margin: 0;
            padding: 20px;
            flex-direction: column;
            align-items: center;
        }
        h1 {
            margin-bottom: 20px;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 10px;
            width: 100%;
            max-width: 1200px;
        }
        .grid a {
            padding: 10px;
            background-color: #f0f0f0;
            border: 1px solid #ccc;
            text-decoration: none;
            color: #333;
            border-radius: 4px;
            text-align: center;
            display: block;
        }
        .grid a:hover {
            background-color: #ddd;
        }
    </style>
</head>
<body>
    <h1>One day</h1>
    <h2>Select a time to set the clock</h2>
    <div class=\"grid\">
" > index.html

for hour in {00..23}
do
    for minute in {00..59}
    do
        for second in {00..59}
        do
            current_time=$(printf "%02d:%02d:%02d" $hour $minute $second)
            next_hour=$hour
            next_minute=$minute
            next_second=$(($second + 1))

            if [ $next_second -ge 60 ]; then
                next_second=00
                next_minute=$(($minute + 1))
                if [ $next_minute -ge 60 ]; then
                    next_minute=00
                    next_hour=$(($hour + 1))
                    if [ $next_hour -ge 24 ]; then
                        next_hour=00
                    fi
                fi
            fi

            next_hour=$(printf "%02d" $next_hour)
            next_minute=$(printf "%02d" $next_minute)
            next_second=$(printf "%02d" $next_second)

            filename=$(printf "%02d-%02d-%02d.html" $hour $minute $second)

            cat <<EOF > $filename
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="1; url=${next_hour}-${next_minute}-${next_second}.html">
    <style>
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            font-family: Arial, sans-serif;
            font-size: 48px;
        }
    </style>
</head>
<body>
    <h1>$current_time</h1>
</body>
</html>
EOF

            echo "<a href=\"$filename\">$current_time</a>" >> index.html

            echo "Generated: $filename"
        done
    done
done

echo "
    </div>
</body>
</html>" >> index.html

echo "Index page created: index.html"

