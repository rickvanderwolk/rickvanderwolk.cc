class fa12b0a8 {
    constructor() {
        this.cards = [];
        this.currentTime = '';
        this.timeDigits = [];
        this.gridElement = document.getElementById('cardGrid');
        this.timeDisplay = document.getElementById('timeDisplay');
        this.playBtn = document.getElementById('playBtn');
        this.isAnimating = false;
        this.lastMinute = '';

        this.init();
    }

    init() {
        // Event listeners
        this.playBtn.addEventListener('click', () => this.playTimeSequence());

        // Start clock
        this.updateTime();
        this.generateAndShuffleCards();

        // Update every second to check time
        setInterval(() => {
            this.updateTime();
            this.checkMinuteChange();
        }, 1000);

        // Auto-play on load (after a short delay for smooth effect)
        setTimeout(() => {
            this.playTimeSequence();
        }, 500);
    }

    getCurrentTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    updateTime() {
        this.currentTime = this.getCurrentTime();
        this.timeDisplay.textContent = this.currentTime;
        this.timeDigits = this.currentTime.split('');
    }

    checkMinuteChange() {
        const currentMinute = this.currentTime;
        if (this.lastMinute && this.lastMinute !== currentMinute) {
            // New minute - reshuffle!
            this.generateAndShuffleCards();

            // Auto-play after shuffle animation
            setTimeout(() => {
                this.playTimeSequence();
            }, 800);
        }
        this.lastMinute = currentMinute;
    }

    generateCards() {
        const cards = [];
        const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ':'];

        // Count how many times each digit appears in the current time
        const timeDigitCount = {};
        this.timeDigits.forEach(digit => {
            timeDigitCount[digit] = (timeDigitCount[digit] || 0) + 1;
        });

        // Add each time digit enough times
        Object.keys(timeDigitCount).forEach(digit => {
            for (let i = 0; i < timeDigitCount[digit]; i++) {
                cards.push(digit);
            }
        });

        // Fill the rest (32 - 5 = 27 cards) with random digits
        while (cards.length < 32) {
            const randomDigit = digits[Math.floor(Math.random() * digits.length)];
            cards.push(randomDigit);
        }

        return cards;
    }

    shuffleArray(array) {
        // Fisher-Yates shuffle
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    generateAndShuffleCards() {
        const newCards = this.generateCards();
        this.cards = this.shuffleArray(newCards);
        this.renderCards();
    }

    renderCards() {
        this.gridElement.innerHTML = '';

        this.cards.forEach((value, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.dataset.value = value;
            card.dataset.index = index;

            // Card inner structure for flip effect
            const cardInner = document.createElement('div');
            cardInner.className = 'card-inner';

            const cardFront = document.createElement('div');
            cardFront.className = 'card-front';

            const cardBack = document.createElement('div');
            cardBack.className = 'card-back';
            cardBack.textContent = value;

            cardInner.appendChild(cardFront);
            cardInner.appendChild(cardBack);
            card.appendChild(cardInner);

            // Click handler for flip
            card.addEventListener('click', () => {
                // Close all other cards
                const allCards = this.gridElement.querySelectorAll('.card');
                allCards.forEach(c => {
                    if (c !== card) {
                        c.classList.remove('flipped');
                    }
                });

                // Toggle this card
                card.classList.toggle('flipped');
            });

            // Stagger the deal animation
            card.style.animationDelay = `${index * 0.03}s`;
            card.classList.add('dealing');

            // Remove dealing class after animation
            setTimeout(() => {
                card.classList.remove('dealing');
            }, 500 + (index * 30));

            this.gridElement.appendChild(card);
        });
    }

    async playTimeSequence() {
        if (this.isAnimating) return;

        this.isAnimating = true;
        this.playBtn.disabled = true;

        // Loop through each digit of the time
        for (let i = 0; i < this.timeDigits.length; i++) {
            const digit = this.timeDigits[i];
            await this.highlightDigit(digit, i === this.timeDigits.length - 1);

            // Wait 500ms between highlights (except last)
            if (i < this.timeDigits.length - 1) {
                await this.wait(500);
            }
        }

        this.isAnimating = false;
        this.playBtn.disabled = false;
    }

    async highlightDigit(digit, isLast = false) {
        // Close all other cards first
        const allCards = Array.from(this.gridElement.children);
        allCards.forEach(card => {
            card.classList.remove('flipped');
        });

        // Find all cards with this value
        const matchingCards = allCards.filter(
            card => card.dataset.value === digit
        );

        if (matchingCards.length === 0) return;

        // Choose a random match (or the first)
        const randomIndex = Math.floor(Math.random() * matchingCards.length);
        const cardToHighlight = matchingCards[randomIndex];

        // Flip the card
        cardToHighlight.classList.add('flipped');

        // Wait for animation (500ms as desired)
        await this.wait(500);

        // Flip back
        cardToHighlight.classList.remove('flipped');
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new fa12b0a8();
});
