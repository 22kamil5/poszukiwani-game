const LAUNCH_DATE = '2026-04-01';

function getTodayString() {
    const d = new Date();
    return d.toISOString().split('T')[0];
}

function getPuzzleNumber(dateString) {
    const launch = new Date(LAUNCH_DATE);
    const current = new Date(dateString);
    const diffMs = current - launch;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays + 1;
}

function hashDate(dateString) {
    let hash = 0;
    for (let i = 0; i < dateString.length; i++) {
        hash = (hash * 31 + dateString.charCodeAt(i)) | 0;
    }
    return hash >>> 0;
}

function mulberry32(seed) {
    return function () {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function seededShuffle(array, rng) {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function getDailyPersons(allPersons, dateString) {
    const seed = hashDate(dateString);
    const rng = mulberry32(seed);
    const shuffled = seededShuffle(allPersons, rng);
    const count = Math.min(5, shuffled.length);
    return {
        puzzleNumber: getPuzzleNumber(dateString),
        persons: shuffled.slice(0, count)
    };
}
