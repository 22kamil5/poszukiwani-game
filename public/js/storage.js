function saveDailyResult(dateString, puzzleNumber, scores, total) {
    const key = 'poszukiwani-' + dateString;
    const value = JSON.stringify({
        puzzleNumber: puzzleNumber,
        scores: scores,
        total: total,
        completed: true
    });
    localStorage.setItem(key, value);
}

function loadDailyResult(dateString) {
    const key = 'poszukiwani-' + dateString;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
}

function isTodayCompleted() {
    return loadDailyResult(getTodayString()) !== null;
}
