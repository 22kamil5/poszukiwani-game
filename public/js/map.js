const CLUSTERS = [
    { id: 'przeciwko_zyciu', label: 'Przeciwko życiu', x: 0.15, y: 0.90, color: '#e53935' },
    { id: 'przemoc', label: 'Przemoc / Rozbój', x: 0.15, y: 0.53, color: '#fb8c00' },
    { id: 'seksualne', label: 'Przestępstwa\nseksualne', x: 0.10, y: 0.70, color: '#ab47bc' },
    { id: 'narkotyki', label: 'Narkotyki', x: 0.45, y: 0.75, color: '#43a047' },
    { id: 'przeciwko_panstwu', label: 'Przeciwko\npaństwu', x: 0.50, y: 0.55, color: '#5c6bc0' },
    { id: 'oszustwa', label: 'Oszustwa', x: 0.80, y: 0.72, color: '#fdd835' },
    { id: 'skarbowe', label: 'Skarbowe', x: 0.85, y: 0.45, color: '#78909c' },
    { id: 'kradzieze', label: 'Kradzieże /\nWłamanie', x: 0.73, y: 0.25, color: '#26a69a' }
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
                cx: cx, cy: cy, r: 45,
                fill: c.color, opacity: 0.12
            });
            svg.appendChild(circle);

            const lines = c.label.split('\n');
            lines.forEach((line, i) => {
                this._addText(cx, cy + (i - (lines.length - 1) / 2) * 13, line, 11, c.color + 'cc');
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
