const CLUSTERS = [
    { id: 'przeciwko_zyciu', label: 'Zabójstwo', x: 0.08, y: 0.93, color: '#e53935' },
    { id: 'ciężki_uszczerbek', label: 'Ciężkie pobicie', x: 0.17, y: 0.83, color: '#ef5350' },
    { id: 'przemoc', label: 'Rozbój', x: 0.13, y: 0.58, color: '#fb8c00' },
    { id: 'groźby', label: 'Groźby / Stalking', x: 0.22, y: 0.42, color: '#ff9800' },
    { id: 'znecanie', label: 'Znęcanie się', x: 0.20, y: 0.55, color: '#f57c00' },
    { id: 'seksualne', label: 'Seksualne', x: 0.08, y: 0.70, color: '#ab47bc' },
    { id: 'narkotyki_handel', label: 'Handel narkotykami', x: 0.42, y: 0.80, color: '#2e7d32' },
    { id: 'narkotyki_posiadanie', label: 'Posiadanie narkotyków', x: 0.48, y: 0.65, color: '#43a047' },
    { id: 'grupa_przestepcza', label: 'Grupa przestępcza', x: 0.50, y: 0.70, color: '#3949ab' },
    { id: 'korupcja', label: 'Korupcja', x: 0.55, y: 0.58, color: '#5c6bc0' },
    { id: 'przeciwko_panstwu', label: 'Przeciwko państwu', x: 0.42, y: 0.43, color: '#7986cb' },
    { id: 'oszustwa', label: 'Oszustwo', x: 0.80, y: 0.74, color: '#fdd835' },
    { id: 'falsszerstwo', label: 'Fałszerstwo', x: 0.74, y: 0.66, color: '#ffee58' },
    { id: 'wyludzenie', label: 'Wyłudzenie', x: 0.86, y: 0.68, color: '#fbc02d' },
    { id: 'pranie', label: 'Pranie pieniędzy', x: 0.83, y: 0.78, color: '#f9a825' },
    { id: 'skarbowe', label: 'Skarbowe', x: 0.88, y: 0.45, color: '#78909c' },
    { id: 'kradziez', label: 'Kradzież', x: 0.72, y: 0.20, color: '#26a69a' },
    { id: 'wlamanie', label: 'Włamanie', x: 0.66, y: 0.30, color: '#00897b' },
    { id: 'paserstwo', label: 'Paserstwo', x: 0.78, y: 0.32, color: '#009688' },
    { id: 'zniszczenie', label: 'Zniszczenie mienia', x: 0.63, y: 0.18, color: '#4db6ac' }
];

class CrimeMap {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.pins = [];
        this.correctPoint = null;
        this.onPinPlaced = null;
        this.disabled = false;
        this._render();
    }

    _render() {
        this.container.innerHTML = '';
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 600 450');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.style.display = 'block';
        this.svg = svg;

        // Background
        const bg = this._el('rect', { x: 0, y: 0, width: 600, height: 450, fill: '#121213' });
        svg.appendChild(bg);

        // Subtle grid dots instead of lines
        for (let gx = 0; gx <= 10; gx++) {
            for (let gy = 0; gy <= 10; gy++) {
                svg.appendChild(this._el('circle', {
                    cx: gx * 60, cy: gy * 45, r: 1,
                    fill: '#2c2c2e'
                }));
            }
        }

        // Axis labels
        this._addText(300, 443, 'PRZEMOC  ·  ·  ·  ·  ·  ·  FINANSE', 8, '#3a3a3c');
        this._addText(8, 10, 'CIĘŻKIE', 7, '#3a3a3c', 'start');
        this._addText(8, 443, 'LEKKIE', 7, '#3a3a3c', 'start');

        // Cluster dots + labels
        CLUSTERS.forEach(c => {
            const cx = c.x * 600;
            const cy = (1 - c.y) * 450;

            // Small dot marker
            svg.appendChild(this._el('circle', {
                cx: cx, cy: cy, r: 3,
                fill: c.color, opacity: 0.6
            }));

            // Label text
            this._addText(cx, cy - 8, c.label, 8, c.color + '99');
        });

        svg.addEventListener('click', (e) => this._handleClick(e));
        this.container.appendChild(svg);
    }

    _el(tag, attrs) {
        const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
        return el;
    }

    _addText(x, y, text, size, fill, anchor) {
        const t = this._el('text', {
            x: x, y: y,
            'font-size': size,
            fill: fill || '#818384',
            'text-anchor': anchor || 'middle',
            'dominant-baseline': 'middle',
            'font-family': "'Inter', -apple-system, sans-serif",
            'pointer-events': 'none',
            'font-weight': '500'
        });
        t.textContent = text;
        this.svg.appendChild(t);
    }

    _handleClick(e) {
        if (this.disabled) return;
        const rect = this.svg.getBoundingClientRect();
        const svgX = ((e.clientX - rect.left) / rect.width) * 600;
        const svgY = ((e.clientY - rect.top) / rect.height) * 450;
        const mapX = svgX / 600;
        const mapY = 1 - (svgY / 450);

        this._addPin(svgX, svgY, '#e94560');
        this.pins.push({ mapX, mapY, svgX, svgY });

        if (this.onPinPlaced) {
            this.onPinPlaced(mapX, mapY);
        }
    }

    _addPin(svgX, svgY, color) {
        // Outer glow
        this.svg.appendChild(this._el('circle', {
            cx: svgX, cy: svgY, r: 14,
            fill: color, opacity: 0.15
        }));
        // Pin dot
        const pin = this._el('circle', {
            cx: svgX, cy: svgY, r: 6,
            fill: color, stroke: '#fff', 'stroke-width': 2
        });
        this.svg.appendChild(pin);
        return pin;
    }

    showScoreOnLastPin(score) {
        const last = this.pins[this.pins.length - 1];
        if (!last) return;
        var color = getColorFeedback(score);
        var fill = color === 'green' ? '#6aaa64' : color === 'yellow' ? '#b59f3b' : '#ef5350';

        // Score label with background
        var bg = this._el('rect', {
            x: last.svgX - 20, y: last.svgY - 28,
            width: 40, height: 16,
            rx: 4, fill: '#1a1a1b', stroke: fill, 'stroke-width': 1, opacity: 0.9
        });
        this.svg.appendChild(bg);
        this._addText(last.svgX, last.svgY - 20, score + '', 9, fill);
    }

    revealCorrectAnswer(correctX, correctY, bestPinIndex) {
        var cx = correctX * 600;
        var cy = (1 - correctY) * 450;

        // Correct answer glow
        this.svg.appendChild(this._el('circle', {
            cx: cx, cy: cy, r: 18,
            fill: '#538d4e', opacity: 0.2
        }));
        // Correct point
        this.svg.appendChild(this._el('circle', {
            cx: cx, cy: cy, r: 7,
            fill: '#538d4e', stroke: '#fff', 'stroke-width': 2
        }));
        // Checkmark
        this.svg.appendChild(this._el('text', {
            x: cx, y: cy + 1,
            'font-size': 8, fill: '#fff',
            'text-anchor': 'middle', 'dominant-baseline': 'middle',
            'font-weight': '700', 'pointer-events': 'none'
        })).textContent = '✓';

        // Dashed line from pin to correct
        var idx = bestPinIndex !== undefined ? bestPinIndex : 0;
        if (this.pins.length > idx) {
            var best = this.pins[idx];
            this.svg.appendChild(this._el('line', {
                x1: best.svgX, y1: best.svgY,
                x2: cx, y2: cy,
                stroke: 'rgba(255,255,255,0.2)', 'stroke-width': 1, 'stroke-dasharray': '4,4'
            }));
        }

        this.disabled = true;
    }

    reset() {
        this.pins = [];
        this.correctPoint = null;
        this.disabled = false;
        this._render();
    }
}
