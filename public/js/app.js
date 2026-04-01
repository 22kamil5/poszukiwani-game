class Game {
    constructor(dailyData) {
        this.puzzleNumber = dailyData.puzzleNumber;
        this.dateString = dailyData.dateString;
        this.persons = dailyData.persons;
        this.currentRound = 0;
        this.maxAttempts = 1;
        this.currentAttempt = 0;
        this.roundScores = [];
        this.bestScoreThisRound = 0;
        this.bestPinIndex = 0;
        this.map = null;

        this._cacheElements();
        this._bindEvents();
    }

    _cacheElements() {
        this.screens = {
            start: document.getElementById('screen-start'),
            round: document.getElementById('screen-round'),
            end: document.getElementById('screen-end'),
            error: document.getElementById('screen-error')
        };
        this.els = {
            roundCounter: document.getElementById('round-counter'),
            attemptCounter: document.getElementById('attempt-counter'),
            roundScore: document.getElementById('round-score'),
            personPhoto: document.getElementById('person-photo'),
            personName: document.getElementById('person-name'),
            personAge: document.getElementById('person-age'),
            personGender: document.getElementById('person-gender'),
            personRegion: document.getElementById('person-region'),
            feedback: document.getElementById('feedback'),
            btnNext: document.getElementById('btn-next'),
            btnPlay: document.getElementById('btn-play'),
            btnShare: document.getElementById('btn-share'),
            btnReplay: document.getElementById('btn-replay'),
            totalScore: document.getElementById('total-score'),
            roundSummary: document.getElementById('round-summary'),
            shareConfirm: document.getElementById('share-confirm'),
            errorDetails: document.getElementById('error-details')
        };
    }

    _bindEvents() {
        this.els.btnPlay.addEventListener('click', () => this.start());
        this.els.btnNext.addEventListener('click', () => this._nextRound());
        this.els.btnShare.addEventListener('click', () => this._share());
    }

    showError(message) {
        this.els.errorDetails.textContent = message;
        this._showScreen('error');
    }

    _updatePills(usedCount) {
        const pills = this.els.attemptCounter.querySelectorAll('.pill');
        pills.forEach((pill, i) => {
            pill.className = 'pill';
            if (i < usedCount) pill.classList.add('used');
            else if (i === usedCount) pill.classList.add('active');
        });
    }

    _showScreen(name) {
        Object.values(this.screens).forEach(s => s.classList.remove('active'));
        this.screens[name].classList.add('active');
    }

    start() {
        this.currentRound = 0;
        this.roundScores = [];
        this._showScreen('round');
        this._startRound();
    }

    _startRound() {
        const person = this.persons[this.currentRound];
        this.currentAttempt = 0;
        this.bestScoreThisRound = 0;
        this.bestPinIndex = 0;

        this.els.roundCounter.textContent = 'Runda ' + (this.currentRound + 1) + '/' + this.persons.length;
        this._updatePills(0);
        this.els.roundScore.textContent = '0 pkt';

        this.els.personPhoto.src = person.photo;
        this.els.personPhoto.onerror = () => {
            this.els.personPhoto.src = 'assets/placeholder.svg';
        };
        this.els.personName.textContent = person.name;
        this.els.personAge.innerHTML = '<span class="label">Wiek:</span> <span class="value">' + (person.age || '?') + '</span>';
        this.els.personGender.innerHTML = '<span class="label">Płeć:</span> <span class="value">' + (person.gender === 'M' ? 'Mężczyzna' : 'Kobieta') + '</span>';
        this.els.personRegion.innerHTML = '<span class="label">Region:</span> <span class="value">' + person.region + '</span>';

        this.els.feedback.classList.add('hidden');
        this.els.feedback.className = 'feedback hidden';
        this.els.btnNext.classList.add('hidden');

        if (this.map) {
            this.map.reset();
        } else {
            this.map = new CrimeMap('map-container');
        }
        this.map.onPinPlaced = (x, y) => this._handleGuess(x, y);
    }

    _handleGuess(pinX, pinY) {
        const person = this.persons[this.currentRound];
        const score = calculateScore(pinX, pinY, person.mapX, person.mapY);
        this.currentAttempt++;

        if (score > this.bestScoreThisRound) {
            this.bestScoreThisRound = score;
            this.bestPinIndex = this.currentAttempt - 1;
        }

        this.map.showScoreOnLastPin(score);
        this.els.roundScore.textContent = this.bestScoreThisRound + ' pkt';
        this._updatePills(this.currentAttempt);

        if (this.currentAttempt >= this.maxAttempts) {
            this._endRound();
        }
    }

    _endRound() {
        const person = this.persons[this.currentRound];
        const color = getColorFeedback(this.bestScoreThisRound);

        this.map.revealCorrectAnswer(person.mapX, person.mapY, this.bestPinIndex);
        this.map.disabled = true;

        this.els.feedback.textContent = person.articleName + ' (' + person.article + ') — ' + this.bestScoreThisRound + '/1000';
        this.els.feedback.className = 'feedback ' + color;
        this.els.feedback.classList.remove('hidden');

        this.roundScores.push(this.bestScoreThisRound);

        if (this.currentRound < this.persons.length - 1) {
            this.els.btnNext.textContent = 'Następna runda';
            this.els.btnNext.classList.remove('hidden');
        } else {
            this.els.btnNext.textContent = 'Zobacz wynik';
            this.els.btnNext.classList.remove('hidden');
        }
    }

    _nextRound() {
        this.currentRound++;
        if (this.currentRound >= this.persons.length) {
            this._showEndScreen();
        } else {
            this._startRound();
        }
    }

    _showEndScreen() {
        const total = this.roundScores.reduce((a, b) => a + b, 0);
        const maxScore = this.persons.length * 1000;

        saveDailyResult(this.dateString, this.puzzleNumber, this.roundScores, total);

        this._renderEndScreen(this.roundScores, total, maxScore);
        this._showScreen('end');
    }

    showSavedResult(saved) {
        const maxScore = saved.scores.length * 1000;
        this._renderEndScreen(saved.scores, saved.total, maxScore);
        this._showScreen('end');
    }

    _renderEndScreen(scores, total, maxScore) {
        const color = getColorFeedback(Math.round((total / maxScore) * 1000));
        this.els.totalScore.textContent = total + ' / ' + maxScore + ' pkt';
        this.els.totalScore.className = color;

        this.els.roundSummary.innerHTML = '';
        scores.forEach((score, i) => {
            const person = this.persons[i];
            const row = document.createElement('div');
            row.className = 'summary-row';
            const c = getColorFeedback(score);
            row.innerHTML =
                (person ? '<img src="' + person.photo + '" onerror="this.src=\'assets/placeholder.svg\'" alt="">' : '') +
                '<div class="info">' +
                    (person ? person.articleName : 'Runda ' + (i + 1)) +
                '</div>' +
                '<div class="score" style="color:' + (c === 'green' ? '#a5d6a7' : c === 'yellow' ? '#fff9c4' : '#ef9a9a') + '">' +
                    score + '/1000' +
                '</div>';
            this.els.roundSummary.appendChild(row);
        });

        this.els.shareConfirm.classList.add('hidden');
        this._currentShareData = { scores, total, maxScore };
    }

    _share() {
        const d = this._currentShareData;
        const text = generateShareText(this.puzzleNumber, this.dateString, d.scores, d.total, d.maxScore);
        copyToClipboard(text).then(() => {
            this.els.shareConfirm.classList.remove('hidden');
            setTimeout(() => this.els.shareConfirm.classList.add('hidden'), 2000);
        });
    }
}
