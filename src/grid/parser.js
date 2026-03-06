import config from '../config.js';

const COLS = 'ABCDEFGHIJKLMNOP';
const CELL_RE = /^([A-P])(\d{1,2})$/;

export function parseCell(cell) {
    const match = cell.trim().toUpperCase().match(CELL_RE);
    if (!match) throw new Error(`invalid grid cell: ${cell}`);

    const col = COLS.indexOf(match[1]);
    const row = parseInt(match[2], 10) - 1;

    if (row < 0 || row >= config.grid.rows) {
        throw new Error(`row out of range: ${match[2]}`);
    }

    return { col, row };
}

export function parseRegion(region) {
    const normalized = region.trim().toUpperCase()
        .replace(/\s*(đến|den|toi|to)\s*/gi, '-')
        .replace(/\s*[-:]\s*/g, '-');
    const parts = normalized.split('-').filter(Boolean);

    if (parts.length === 1) {
        const { col, row } = parseCell(parts[0]);
        return { startCol: col, startRow: row, endCol: col, endRow: row };
    }

    if (parts.length === 2) {
        const a = parseCell(parts[0]);
        const b = parseCell(parts[1]);
        return {
            startCol: Math.min(a.col, b.col),
            startRow: Math.min(a.row, b.row),
            endCol: Math.max(a.col, b.col),
            endRow: Math.max(a.row, b.row),
        };
    }

    throw new Error(`invalid grid region: ${region}`);
}

export function colLetter(index) {
    return COLS[index] || '?';
}
