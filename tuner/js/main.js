const min = 1;
const max = 100;
const initialValue = 50;

const $audioContainerWrapperElement = $('#audio-container-wrapper');
const $slider = $('#slider');
const $whiteNoiseContainer = $('#white-noise-container');

const channels = [
    // sublime jazz
    {
        url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/SUBLIMEARROWJAZZ.mp3',
        min: 0,
        max: 20
    },
    // radio 1
    {
        url: 'https://icecast.omroep.nl/radio1-bb-mp3',
        min: 30,
        max: 50
    },
    // slam hard
    {
        url: 'https://stream.slam.nl/web11_mp3',
        min: 50,
        max: 70
    },
    // bnr
    {
        url: 'https://stream.bnr.nl/bnr_mp3_128_20',
        min: 80,
        max: 100
    }
];

$slider.on('input', function (e) {
    setValue(e.currentTarget.valueAsNumber);
});

setup();

$slider.attr('value', initialValue);
setValue(initialValue);

function setup () {
    let html = '';
    for (let i = 0; i < channels.length; i++) {
        html += getAudioElementHtml(i, channels[i].url);
    }
    $audioContainerWrapperElement.html(html);
}

function getAudioElementHtml (index, url) {
    let html = '<audio id="audio-container-' + index + '">';
    html += '<source src="' + url + '" type="audio/mp3">';
    html += '</audio>';
    return html;
}

function setValue(value) {
    for (let i = 0; i < channels.length; i++) {
        let channel = channels[i];
        let $elem =  $('#audio-container-' + i);
        let volume = 0;

        if (value >= channel.min && value <= channel.max) {
            $elem.trigger('play');
            let channelRange = (channel.max - channel.min);
            let rangeCenter = (channelRange / 2);
            let rangeValue = (value - channel.min);
            volume =  rangeValue / rangeCenter;
            if (rangeValue > rangeCenter) {
                volume = 1 - (rangeValue / channelRange);
            }
            $elem.prop('volume', volume);
            let whiteNoiseVolume = 1 - volume;
            $whiteNoiseContainer.prop('volume', whiteNoiseVolume);
            $whiteNoiseContainer.trigger('play');
        } else {
            $elem.trigger('pause')
            $elem.prop('volume', volume);
        }
    }
}
