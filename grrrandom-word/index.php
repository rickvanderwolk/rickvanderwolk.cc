<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>grrrandom word</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="one word, one request">
    <meta name="author" content="Rick van der Wolk">
    <style>
        html,
        body {
            margin: 0;
            padding: 0;
            height: 100%;
            width: 100%;
            background: white;
            color: black;
            font-family: 'Times New Roman', Times, serif;
            cursor: pointer;
        }
        h1 {
            font-size: 8em;
            margin: 15px;
            /* thanks https://stackoverflow.com/questions/6900124/how-to-make-certain-text-not-selectable-with-css */
            -webkit-user-select: none; /* Safari */
            -moz-user-select: none; /* Firefox */
            -ms-user-select: none; /* IE10+/Edge */
            user-select: none; /* Standard */
        }
        #random-word-wrapper {
            margin-left: auto;
            margin-right: auto;
            height: 100%;
            width: 90%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        @media (prefers-color-scheme: dark) {
            html,
            body {
                background: black;
                color: white;
            }
        }
        @media only screen and (max-width: 768px) {
            h1 {
                font-size: 5em;
            }
        }
    </style>
</head>
<body>
    <?php
        // thanks https://github.com/openedx/edx-notes-api/blob/master/notesapi/v1/management/commands/data/basic_words.txt
        $words = json_decode(file_get_contents('words.json'));
        $randomWord = $words[array_rand($words)];
    ?>
    <div id="random-word-wrapper">
        <h1><?php echo $randomWord; ?></h1>
    </div>
    <script>
        function reloadPage() {
            location.reload();
        }

        document.body.addEventListener('click', reloadPage);
        document.body.onkeyup = function(e) {
            if (
                e.key === ' '
                ||
                e.code === 'Space'
                ||
                e.keyCode === 32
            ) {
                reloadPage();
            }
        }
    </script>
</body>
</html>
