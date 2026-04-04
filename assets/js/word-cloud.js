var wordCloudConfig = {
    spiralResolution: 1,
    spiralLimit: 360 * 5,
    xWordPadding: 5,
    yWordPadding: 3,
    resizeDebounce: 300
};

var wordCloudInstance = null;

function initWordCloud() {
    var cloud = document.getElementById("word-cloud");
    if (!cloud) return;

    wordCloudInstance = cloud;

    var wordElements = cloud.querySelectorAll(".cloud-item");
    var words = [];

    // Collect word data
    wordElements.forEach(function(el) {
        el.classList.remove("visible");
        el.style.left = "0";
        el.style.top = "0";

        var priority = 3;
        if (el.classList.contains("size-1")) priority = 1;
        if (el.classList.contains("size-2")) priority = 2;
        if (el.classList.contains("size-3")) priority = 3;
        if (el.classList.contains("size-4")) priority = 4;
        if (el.classList.contains("size-5")) priority = 5;

        words.push({
            element: el,
            priority: priority,
            width: el.offsetWidth,
            height: el.offsetHeight
        });
    });

    // Sort by priority (largest first)
    words.sort(function(a, b) {
        return b.priority - a.priority;
    });

    var centerX = cloud.offsetWidth / 2;
    var centerY = cloud.offsetHeight / 2;
    var placed = [];

    function spiral(i) {
        var angle = wordCloudConfig.spiralResolution * i;
        return {
            x: (1 + angle) * Math.cos(angle),
            y: (1 + angle) * Math.sin(angle)
        };
    }

    function intersects(x, y, w, h) {
        var rect1 = {
            left: x - w/2 - wordCloudConfig.xWordPadding,
            right: x + w/2 + wordCloudConfig.xWordPadding,
            top: y - h/2 - wordCloudConfig.yWordPadding,
            bottom: y + h/2 + wordCloudConfig.yWordPadding
        };

        for (var i = 0; i < placed.length; i++) {
            var rect2 = placed[i];
            if (!(rect1.right < rect2.left ||
                  rect1.left > rect2.right ||
                  rect1.bottom < rect2.top ||
                  rect1.top > rect2.bottom)) {
                return true;
            }
        }
        return false;
    }

    // Place words
    words.forEach(function(word) {
        var posX = centerX;
        var posY = centerY;

        for (var i = 0; i < wordCloudConfig.spiralLimit; i++) {
            var pos = spiral(i);
            var testX = centerX + pos.x;
            var testY = centerY + pos.y;

            if (!intersects(testX, testY, word.width, word.height)) {
                posX = testX;
                posY = testY;
                break;
            }
        }

        word.element.style.left = (posX - word.width/2) + "px";
        word.element.style.top = (posY - word.height/2) + "px";

        placed.push({
            left: posX - word.width/2 - wordCloudConfig.xWordPadding,
            right: posX + word.width/2 + wordCloudConfig.xWordPadding,
            top: posY - word.height/2 - wordCloudConfig.yWordPadding,
            bottom: posY + word.height/2 + wordCloudConfig.yWordPadding
        });
    });

    // Staggered fade in
    words.forEach(function(word, index) {
        setTimeout(function() {
            word.element.classList.add("visible");
        }, 30 + index * 40);
    });
}

// Debounced resize
var resizeTimeout = null;
window.addEventListener("resize", function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(initWordCloud, wordCloudConfig.resizeDebounce);
});

// Init
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWordCloud);
} else {
    initWordCloud();
}
