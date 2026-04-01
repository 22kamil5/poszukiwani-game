(function () {
    const today = getTodayString();

    fetch('data/persons.json')
        .then(function (res) {
            if (!res.ok) throw new Error('Failed to load persons.json');
            return res.json();
        })
        .then(function (allPersons) {
            var withPhotos = allPersons.filter(function (p) {
                return p.photo && !p.photo.includes('placeholder');
            });
            const daily = getDailyPersons(withPhotos, today);
            const game = new Game({
                puzzleNumber: daily.puzzleNumber,
                dateString: today,
                persons: daily.persons,
                allPersons: withPhotos
            });

            // No localStorage block — allow replaying
        })
        .catch(function (err) {
            document.getElementById('screen-start').classList.remove('active');
            document.getElementById('screen-error').classList.add('active');
            document.getElementById('error-details').textContent = err.message;
        });
})();
