function calculateScore(pinX, pinY, correctX, correctY) {
    const distance = Math.sqrt(
        Math.pow(pinX - correctX, 2) + Math.pow(pinY - correctY, 2)
    );
    return Math.round(Math.max(0, 1000 * (1 - distance / 1.0)));
}

function getColorFeedback(score) {
    if (score > 800) return 'green';
    if (score >= 400) return 'yellow';
    return 'red';
}
