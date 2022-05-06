const audioContainerWrapperElement = document.getElementById('audio-container-wrapper');
const playButtonElement = document.getElementById('play-button');
const stopButtonElement = document.getElementById('stop-button');

const maxStreams = 4;

const streams = [
    // 100%NL
    'https://stream.100p.nl/100pctnl.mp3',
    // 100%NL - Nederpop
    'https://stream.100p.nl/web04_mp3',
    // 100%NL - Songfestival
    'https://stream.100p.nl/web05_mp3',
    // 538
    'http://playerservices.streamtheworld.com/api/livestream-redirect/RADIO538.mp3',
    // 538 - Ibiza
    'http://playerservices.streamtheworld.com/api/livestream-redirect/TLPSTR19.mp3',
    // 538 - Non-stop
    'http://playerservices.streamtheworld.com/api/livestream-redirect/TLPSTR09.mp3',
    // 538 - Rewind
    'https://playerservices.streamtheworld.com/api/livestream-redirect/TLPSTR08.mp3',
    // BNR Nieuwsradio
    'https://stream.bnr.nl/bnr_mp3_128_20',
    // Qmusic
    'https://stream.qmusic.nl/qmusic/mp3',
    // Radio 10
    'http://19993.live.streamtheworld.com/RADIO10.mp3',
    // Skyradio
    'https://19993.live.streamtheworld.com/SKYRADIO.mp3',
    // Slam! 40
    'https://stream.slam.nl/web14_mp3',
    // Slam! Hardstyle
    'https://stream.slam.nl/web11_mp3',
    // Slam!
    'https://stream.slam.nl/slam_mp3',
    // Sublime Jazz
    'https://playerservices.streamtheworld.com/api/livestream-redirect/SUBLIMEARROWJAZZ.mp3',
    // NPO Radio 1
    'https://icecast.omroep.nl/radio1-bb-mp3',
    // NPO Radio 2
    'https://icecast.omroep.nl/radio2-bb-mp3',
    // NPO 3FM
    'https://icecast.omroep.nl/3fm-bb-mp3',
    // NPO FunX NL
    'https://icecast.omroep.nl/funx-bb-mp3',
    // NPO FunX Hip Hop
    'https://icecast.omroep.nl/funx-hiphop-bb-mp3',
    // NPO FunX Latin
    'https://icecast.omroep.nl/funx-latin-bb-mp3',
];

let selectedStreamIndexes = [];

setup();

function setup () {
    selectedStreamIndexes = getRandomStreamIndexes(streams, maxStreams);
    let html = '';
    for (let i = 0; i < streams.length; i++) {
        if (selectedStreamIndexes.indexOf(i) > -1) {
            html += getAudioElementHtml(i, streams[i]);
        }
    }
    audioContainerWrapperElement.innerHTML = html;
}

// thanks https://stackoverflow.com/questions/19269545/how-to-get-a-number-of-random-elements-from-an-array
function getRandomStreamIndexes(arr, n) {
    let result = new Array(n),
        len = arr.length,
        taken = new Array(len)
    ;
    if (n > len) {
        throw new RangeError('getRandomStreamIndexes: more elements taken than available');
    }
    while (n--) {
        let x = Math.floor(Math.random() * len);
        result[n] = x in taken ? taken[x] : x;
        taken[x] = --len in taken ? taken[len] : len;
    }
    return result;
}

function getAudioElementHtml (index, url) {
    let html = '<audio id="audio-container-' + index + '">';
    html += '<source src="' + url + '" type="audio/mp3">';
    html += '</audio>';
    return html;
}

function play () {
    playButtonElement.style.display = 'none';
    stopButtonElement.style.display = 'inline-block';
    for (let i = 0; i < selectedStreamIndexes.length; i++) {
        let stream = document.getElementById('audio-container-' + selectedStreamIndexes[i]);
        if (stream) {
            stream.play();
        }
    }
}

function stop () {
    stopButtonElement.style.display = 'none';
    playButtonElement.style.display = 'inline-block';
    for (let i = 0; i < selectedStreamIndexes.length; i++) {
        let stream = document.getElementById('audio-container-' + selectedStreamIndexes[i]);
        if (stream) {
            stream.pause();
        }
    }
}
