const CLUSTERS = [
    { label: 'Zabójstwo', x: 0.08, y: 0.93, color: '#dc2626' },
    { label: 'Ciężkie pobicie', x: 0.17, y: 0.83, color: '#ef4444' },
    { label: 'Rozbój', x: 0.13, y: 0.58, color: '#ea580c' },
    { label: 'Groźby / Stalking', x: 0.23, y: 0.42, color: '#f97316' },
    { label: 'Znęcanie się', x: 0.20, y: 0.56, color: '#d97706' },
    { label: 'Seksualne', x: 0.08, y: 0.70, color: '#9333ea' },
    { label: 'Handel narkotykami', x: 0.42, y: 0.80, color: '#16a34a' },
    { label: 'Posiadanie narkotyków', x: 0.48, y: 0.65, color: '#22c55e' },
    { label: 'Grupa przestępcza', x: 0.50, y: 0.72, color: '#4f46e5' },
    { label: 'Korupcja', x: 0.55, y: 0.58, color: '#6366f1' },
    { label: 'Przeciwko państwu', x: 0.42, y: 0.43, color: '#818cf8' },
    { label: 'Oszustwo', x: 0.80, y: 0.74, color: '#ca8a04' },
    { label: 'Fałszerstwo', x: 0.74, y: 0.66, color: '#a16207' },
    { label: 'Wyłudzenie', x: 0.86, y: 0.68, color: '#b45309' },
    { label: 'Pranie pieniędzy', x: 0.83, y: 0.80, color: '#92400e' },
    { label: 'Skarbowe', x: 0.88, y: 0.45, color: '#64748b' },
    { label: 'Kradzież', x: 0.72, y: 0.20, color: '#0d9488' },
    { label: 'Włamanie', x: 0.65, y: 0.30, color: '#0f766e' },
    { label: 'Paserstwo', x: 0.78, y: 0.32, color: '#0e7490' },
    { label: 'Zniszczenie mienia', x: 0.62, y: 0.17, color: '#06b6d4' }
];

class CrimeMap {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.pins = [];
        this.onPinPlaced = null;
        this.disabled = false;
        this._render();
    }

    _render() {
        this.container.innerHTML = '';
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 600 450');
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.style.display = 'block';
        this.svg = svg;

        // White bg
        svg.appendChild(this._el('rect', { x: 0, y: 0, width: 600, height: 450, fill: '#fafafa' }));

        // Dot grid
        for (var gx = 1; gx < 10; gx++) {
            for (var gy = 1; gy < 10; gy++) {
                svg.appendChild(this._el('circle', { cx: gx * 60, cy: gy * 45, r: 1.2, fill: '#e0e0e0' }));
            }
        }

        // Axis labels
        this._addText(300, 442, 'PRZEMOC                                           FINANSE', 7.5, '#bbb');
        this._addText(4, 8, 'CIĘŻKIE', 7, '#bbb', 'start');
        this._addText(4, 442, 'LEKKIE', 7, '#bbb', 'start');

        // Axis arrows
        svg.appendChild(this._el('line', { x1: 40, y1: 448, x2: 560, y2: 448, stroke: '#ddd', 'stroke-width': 0.5 }));
        svg.appendChild(this._el('line', { x1: 2, y1: 15, x2: 2, y2: 435, stroke: '#ddd', 'stroke-width': 0.5 }));

        // Cluster labels
        CLUSTERS.forEach(function(c) {
            var cx = c.x * 600;
            var cy = (1 - c.y) * 450;

            // Dot
            svg.appendChild(this._el('circle', { cx: cx, cy: cy, r: 4, fill: c.color, opacity: 0.35 }));

            // Label - bold, readable
            var t = this._el('text', {
                x: cx + 7, y: cy,
                'font-size': 10,
                fill: c.color,
                'text-anchor': 'start',
                'dominant-baseline': 'middle',
                'font-family': "'Inter', sans-serif",
                'font-weight': '600',
                'pointer-events': 'none'
            });
            t.textContent = c.label;
            svg.appendChild(t);
        }.bind(this));

        svg.addEventListener('click', this._handleClick.bind(this));
        this.container.appendChild(svg);
    }

    _el(tag, attrs) {
        var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (var k in attrs) el.setAttribute(k, attrs[k]);
        return el;
    }

    _addText(x, y, text, size, fill, anchor) {
        var t = this._el('text', {
            x: x, y: y,
            'font-size': size,
            fill: fill || '#999',
            'text-anchor': anchor || 'middle',
            'dominant-baseline': 'middle',
            'font-family': "'Inter', sans-serif",
            'font-weight': '500',
            'pointer-events': 'none'
        });
        t.textContent = text;
        this.svg.appendChild(t);
    }

    _handleClick(e) {
        if (this.disabled) return;
        var rect = this.svg.getBoundingClientRect();
        var svgX = ((e.clientX - rect.left) / rect.width) * 600;
        var svgY = ((e.clientY - rect.top) / rect.height) * 450;
        var mapX = svgX / 600;
        var mapY = 1 - (svgY / 450);

        this._addPin(svgX, svgY, '#2563eb');
        this.pins.push({ mapX: mapX, mapY: mapY, svgX: svgX, svgY: svgY });

        if (this.onPinPlaced) this.onPinPlaced(mapX, mapY);
    }

    _addPin(svgX, svgY, color) {
        // Glow
        this.svg.appendChild(this._el('circle', { cx: svgX, cy: svgY, r: 16, fill: color, opacity: 0.12 }));
        // Ring
        this.svg.appendChild(this._el('circle', { cx: svgX, cy: svgY, r: 7, fill: 'none', stroke: color, 'stroke-width': 2.5, opacity: 0.5 }));
        // Center
        this.svg.appendChild(this._el('circle', { cx: svgX, cy: svgY, r: 3, fill: color }));
    }

    showScoreOnLastPin(score) {
        var last = this.pins[this.pins.length - 1];
        if (!last) return;
        var c = getColorFeedback(score);
        var fill = c === 'green' ? '#16a34a' : c === 'yellow' ? '#ca8a04' : '#dc2626';
        var bg = c === 'green' ? '#dcfce7' : c === 'yellow' ? '#fef9c3' : '#fee2e2';

        // Label bg
        this.svg.appendChild(this._el('rect', {
            x: last.svgX - 22, y: last.svgY - 30, width: 44, height: 18,
            rx: 4, fill: bg, stroke: fill, 'stroke-width': 1
        }));
        this._addText(last.svgX, last.svgY - 21, score + ' pkt', 9, fill);
    }

    revealCorrectAnswer(correctX, correctY, bestPinIndex) {
        var cx = correctX * 600;
        var cy = (1 - correctY) * 450;

        // Green glow
        this.svg.appendChild(this._el('circle', { cx: cx, cy: cy, r: 20, fill: '#22c55e', opacity: 0.15 }));
        this.svg.appendChild(this._el('circle', { cx: cx, cy: cy, r: 8, fill: '#22c55e', stroke: '#fff', 'stroke-width': 2 }));

        // Checkmark
        var t = this._el('text', {
            x: cx, y: cy + 1, 'font-size': 9, fill: '#fff',
            'text-anchor': 'middle', 'dominant-baseline': 'middle',
            'font-weight': '700', 'pointer-events': 'none'
        });
        t.textContent = '✓';
        this.svg.appendChild(t);

        // Dashed line
        var idx = bestPinIndex !== undefined ? bestPinIndex : 0;
        if (this.pins.length > idx) {
            var best = this.pins[idx];
            this.svg.appendChild(this._el('line', {
                x1: best.svgX, y1: best.svgY, x2: cx, y2: cy,
                stroke: '#94a3b8', 'stroke-width': 1, 'stroke-dasharray': '4,4'
            }));
        }
        this.disabled = true;
    }

    reset() {
        this.pins = [];
        this.disabled = false;
        this._render();
    }
}
