(function () {
    fetch('data/persons.json')
        .then(function (res) {
            if (!res.ok) throw new Error('Failed to load persons.json');
            return res.json();
        })
        .then(function (allPersons) {
            var withPhotos = allPersons.filter(function (p) {
                return p.photo && !p.photo.includes('placeholder');
            });

            // Random selection each time (not daily seed)
            var rng = mulberry32(Date.now());
            var shuffled = seededShuffle(withPhotos, rng);
            var picked = shuffled.slice(0, Math.min(5, shuffled.length));

            var game = new Game({
                puzzleNumber: Math.floor(Math.random() * 999) + 1,
                dateString: getTodayString(),
                persons: picked,
                allPersons: withPhotos
            });
        })
        .catch(function (err) {
            document.getElementById('screen-start').classList.remove('active');
            document.getElementById('screen-error').classList.add('active');
            document.getElementById('error-details').textContent = err.message;
        });
})();
