const CLUSTERS = [
    { id: 'przeciwko_zyciu', label: 'Zabójstwo', x: 0.08, y: 0.93, color: '#e53935' },
    { id: 'ciężki_uszczerbek', label: 'Ciężkie\npobicie', x: 0.15, y: 0.82, color: '#ef5350' },
    { id: 'przemoc', label: 'Przemoc /\nRozbój', x: 0.15, y: 0.55, color: '#fb8c00' },
    { id: 'groźby', label: 'Groźby /\nStalking', x: 0.22, y: 0.42, color: '#ff9800' },
    { id: 'znecanie', label: 'Znęcanie\nsię', x: 0.18, y: 0.56, color: '#f57c00' },
    { id: 'seksualne', label: 'Przestępstwa\nseksualne', x: 0.08, y: 0.70, color: '#ab47bc' },
    { id: 'narkotyki_handel', label: 'Handel\nnarkotykami', x: 0.42, y: 0.80, color: '#2e7d32' },
    { id: 'narkotyki_posiadanie', label: 'Posiadanie\nnarkotyków', x: 0.48, y: 0.65, color: '#43a047' },
    { id: 'grupa_przestepcza', label: 'Grupa\nprzestępcza', x: 0.50, y: 0.68, color: '#3949ab' },
    { id: 'korupcja', label: 'Korupcja', x: 0.53, y: 0.60, color: '#5c6bc0' },
    { id: 'przeciwko_panstwu', label: 'Przeciwko\npaństwu', x: 0.43, y: 0.43, color: '#7986cb' },
    { id: 'oszustwa', label: 'Oszustwo', x: 0.80, y: 0.74, color: '#fdd835' },
    { id: 'falsszerstwo', label: 'Fałszerstwo\ndokumentów', x: 0.75, y: 0.66, color: '#ffee58' },
    { id: 'wyludzenie', label: 'Wyłudzenie\nkredytu', x: 0.85, y: 0.68, color: '#fbc02d' },
    { id: 'pranie', label: 'Pranie\npieniędzy', x: 0.82, y: 0.76, color: '#f9a825' },
    { id: 'skarbowe', label: 'Skarbowe /\nPodatkowe', x: 0.87, y: 0.45, color: '#78909c' },
    { id: 'kradziez', label: 'Kradzież', x: 0.72, y: 0.20, color: '#26a69a' },
    { id: 'wlamanie', label: 'Włamanie', x: 0.68, y: 0.30, color: '#00897b' },
    { id: 'paserstwo', label: 'Paserstwo', x: 0.76, y: 0.32, color: '#009688' },
    { id: 'zniszczenie', label: 'Zniszczenie\nmienia', x: 0.65, y: 0.18, color: '#4db6ac' }
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

        const bg = this._el('rect', { x: 0, y: 0, width: 600, height: 450, fill: '#0f1a2e' });
        svg.appendChild(bg);

        for (let i = 1; i < 10; i++) {
            svg.appendChild(this._el('line', { x1: i * 60, y1: 0, x2: i * 60, y2: 450, stroke: '#1a2744', 'stroke-width': 1 }));
            svg.appendChild(this._el('line', { x1: 0, y1: i * 45, x2: 600, y2: i * 45, stroke: '#1a2744', 'stroke-width': 1 }));
        }

        this._addText(300, 445, 'Przemoc ← → Finanse', 11, '#556');
        this._addText(5, 225, '↑ Ciężkie', 10, '#556', 'start');
        this._addText(5, 440, '↓ Lekkie', 10, '#556', 'start');

        CLUSTERS.forEach(c => {
            const cx = c.x * 600;
            const cy = (1 - c.y) * 450;
            const circle = this._el('circle', {
                cx: cx, cy: cy, r: 32,
                fill: c.color, opacity: 0.15
            });
            svg.appendChild(circle);

            const lines = c.label.split('\n');
            lines.forEach((line, i) => {
                this._addText(cx, cy + (i - (lines.length - 1) / 2) * 11, line, 9, c.color + 'cc');
            });
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
            fill: fill || '#aaa',
            'text-anchor': anchor || 'middle',
            'dominant-baseline': 'middle',
            'font-family': '-apple-system, sans-serif',
            'pointer-events': 'none'
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
        const pin = this._el('circle', {
            cx: svgX, cy: svgY, r: 8,
            fill: color, stroke: '#fff', 'stroke-width': 2, opacity: 0.9
        });
        this.svg.appendChild(pin);
        return pin;
    }

    showScoreOnLastPin(score) {
        const last = this.pins[this.pins.length - 1];
        if (!last) return;
        const color = getColorFeedback(score);
        const fill = color === 'green' ? '#a5d6a7' : color === 'yellow' ? '#fff9c4' : '#ef9a9a';
        this._addText(last.svgX, last.svgY - 15, score + '', 11, fill);
    }

    revealCorrectAnswer(correctX, correctY, bestPinIndex) {
        const cx = correctX * 600;
        const cy = (1 - correctY) * 450;

        this._addPin(cx, cy, '#4caf50');
        const crossSize = 6;
        this.svg.appendChild(this._el('line', {
            x1: cx - crossSize, y1: cy - crossSize,
            x2: cx + crossSize, y2: cy + crossSize,
            stroke: '#fff', 'stroke-width': 2
        }));
        this.svg.appendChild(this._el('line', {
            x1: cx + crossSize, y1: cy - crossSize,
            x2: cx - crossSize, y2: cy + crossSize,
            stroke: '#fff', 'stroke-width': 2
        }));

        const idx = bestPinIndex !== undefined ? bestPinIndex : 0;
        if (this.pins.length > idx) {
            const best = this.pins[idx];
            this.svg.appendChild(this._el('line', {
                x1: best.svgX, y1: best.svgY,
                x2: cx, y2: cy,
                stroke: '#ffffff44', 'stroke-width': 1, 'stroke-dasharray': '5,5'
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
