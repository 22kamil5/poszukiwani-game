class Game {
    constructor(dailyData) {
        this.puzzleNumber = dailyData.puzzleNumber;
        this.dateString = dailyData.dateString;
        this.persons = dailyData.persons;
        this.allPersons = dailyData.allPersons || dailyData.persons;
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
            personRegion: document.getElementById('person-region'),
            feedback: document.getElementById('feedback'),
            btnNext: document.getElementById('btn-next'),
            btnPlay: document.getElementById('btn-play'),
            btnShare: document.getElementById('btn-share'),
            btnReplay: document.getElementById('btn-replay'),
            totalScore: document.getElementById('total-score'),
            roundSummary: document.getElementById('round-summary'),
            shareConfirm: document.getElementById('share-confirm'),
            errorDetails: document.getElementById('error-details'),
            runningTotal: document.getElementById('running-total'),
            statsRow: document.getElementById('stats-row')
        };
    }

    _bindEvents() {
        this.els.btnPlay.addEventListener('click', () => this.start());
        this.els.btnNext.addEventListener('click', () => this._nextRound());
        this.els.btnShare.addEventListener('click', () => this._share());
        this.els.btnReplay.addEventListener('click', () => this._replay());
    }

    showError(message) {
        this.els.errorDetails.textContent = message;
        this._showScreen('error');
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
        this.els.roundScore.textContent = '—';
        var prevTotal = this.roundScores.reduce(function(a, b) { return a + b; }, 0);
        this.els.runningTotal.textContent = 'Suma: ' + prevTotal;

        this.els.personPhoto.src = person.photo;
        this.els.personPhoto.onerror = () => {
            this.els.personPhoto.src = 'assets/placeholder.svg';
        };
        this.els.personName.textContent = person.name;
        this.els.personAge.textContent = (person.age ? person.age + ' lat' : '') + (person.gender === 'M' ? ' · mężczyzna' : person.gender === 'K' ? ' · kobieta' : '');
        this.els.personRegion.textContent = person.region || '';

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
        this.els.roundScore.textContent = '+' + score;
        var newTotal = this.roundScores.reduce(function(a, b) { return a + b; }, 0) + score;
        this.els.runningTotal.textContent = 'Suma: ' + newTotal;
        this.els.runningTotal.classList.remove('pulse');
        void this.els.runningTotal.offsetWidth;
        this.els.runningTotal.classList.add('pulse');

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
        var color = getColorFeedback(Math.round((total / maxScore) * 1000));
        this.els.totalScore.textContent = total + '/' + maxScore;
        this.els.totalScore.className = 'total-score ' + color;

        // Stats row
        var avg = scores.length ? Math.round(total / scores.length) : 0;
        var best = scores.length ? Math.max.apply(null, scores) : 0;
        var pct = Math.round((total / maxScore) * 100);
        this.els.statsRow.innerHTML =
            '<div class="stat-box"><div class="number">' + pct + '%</div><div class="label">Trafność</div></div>' +
            '<div class="stat-box"><div class="number">' + avg + '</div><div class="label">Średnia</div></div>' +
            '<div class="stat-box"><div class="number">' + best + '</div><div class="label">Najlepszy</div></div>';

        this.els.roundSummary.innerHTML = '';
        scores.forEach(function(score, i) {
            var person = this.persons[i];
            var c = getColorFeedback(score);
            var barColor = c === 'green' ? '#538d4e' : c === 'yellow' ? '#b59f3b' : '#d32f2f';
            var textColor = c === 'green' ? '#6aaa64' : c === 'yellow' ? '#b59f3b' : '#ef5350';
            var row = document.createElement('div');
            row.className = 'summary-row';
            row.innerHTML =
                '<div class="round-num">' + (i + 1) + '</div>' +
                (person ? '<img src="' + person.photo + '" onerror="this.src=\'assets/placeholder.svg\'" alt="">' : '') +
                '<div class="info">' + (person ? person.articleName : 'Runda ' + (i + 1)) + '</div>' +
                '<div style="text-align:right">' +
                    '<div class="score" style="color:' + textColor + '">' + score + '</div>' +
                    '<div class="score-bar"><div class="score-bar-fill" style="width:' + (score / 10) + '%;background:' + barColor + '"></div></div>' +
                '</div>';
            this.els.roundSummary.appendChild(row);
        }.bind(this));

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

    _replay() {
        var rng = mulberry32(Date.now());
        var shuffled = seededShuffle(this.allPersons, rng);
        this.persons = shuffled.slice(0, Math.min(5, shuffled.length));
        this.map = null;
        this.start();
    }
}
