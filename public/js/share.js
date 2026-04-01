function generateShareText(puzzleNumber, dateString, scores, total, maxScore) {
    const emojiMap = { green: '🟩', yellow: '🟨', red: '🟥' };
    const lines = scores.map(s => {
        const emoji = emojiMap[getColorFeedback(s)];
        return emoji + ' ' + s + '/1000';
    });

    return [
        'Poszukiwani 🔍 #' + puzzleNumber + ' (' + dateString + ')',
        ...lines,
        'Razem: ' + total + '/' + maxScore,
        'poszukiwani-game.vercel.app'
    ].join('\n');
}

function copyToClipboard(text) {
    return navigator.clipboard.writeText(text);
}
