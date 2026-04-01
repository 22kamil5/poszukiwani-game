(function () {
    const today = getTodayString();

    fetch('data/persons.json')
        .then(function (res) {
            if (!res.ok) throw new Error('Failed to load persons.json');
            return res.json();
        })
        .then(function (allPersons) {
            const daily = getDailyPersons(allPersons, today);
            const game = new Game({
                puzzleNumber: daily.puzzleNumber,
                dateString: today,
                persons: daily.persons
            });

            const saved = loadDailyResult(today);
            if (saved && saved.completed) {
                game.showSavedResult(saved);
            }
        })
        .catch(function (err) {
            document.getElementById('screen-start').classList.remove('active');
            document.getElementById('screen-error').classList.add('active');
            document.getElementById('error-details').textContent = err.message;
        });
})();
