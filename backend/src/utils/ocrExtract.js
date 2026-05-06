/**
 * OCR extraction using Tesseract.js
 * Returns structured rows from an image buffer.
 */
const { createWorker } = require('tesseract.js');

async function extractTextFromImage(buffer, mimetype) {
  const worker = await createWorker('eng', 1, {
    cachePath: require('path').join(__dirname, '../../.tesseract-cache'),
    logger: () => {}, // silence progress logs
  });

  const { data } = await worker.recognize(buffer);
  await worker.terminate();

  const rawText = data.text || '';
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 1);

  // Try to detect tabular structure
  const parsed = parseTableFromLines(lines);

  return {
    rawText,
    lines,
    ...parsed,
  };
}

/**
 * Heuristic: detect table-like lines by looking for consistent delimiter patterns.
 * Returns { columns, rows, isTabular }
 */
function parseTableFromLines(lines) {
  if (!lines.length) return { columns: [], rows: [], isTabular: false };

  // Try pipe-delimited first
  const pipeLines = lines.filter((l) => l.includes('|'));
  if (pipeLines.length > 2) {
    return splitByDelimiter(lines, '|');
  }

  // Try tab-delimited
  const tabLines = lines.filter((l) => l.includes('\t'));
  if (tabLines.length > 2) {
    return splitByDelimiter(lines, '\t');
  }

  // Try multiple-space delimited (fixed-width tables)
  const multiSpaceLines = lines.filter((l) => /\s{2,}/.test(l));
  if (multiSpaceLines.length > lines.length * 0.6) {
    return splitByMultiSpace(lines);
  }

  // Try comma-delimited
  const commaLines = lines.filter((l) => l.split(',').length > 2);
  if (commaLines.length > 2) {
    return splitByDelimiter(lines, ',');
  }

  // Not tabular — treat each line as a "Name" entry
  return {
    columns: ['Name'],
    rows: lines.map((l) => ({ Name: l })),
    isTabular: false,
  };
}

function splitByDelimiter(lines, delimiter) {
  const dataLines = lines.filter((l) => l.includes(delimiter));
  if (!dataLines.length) return { columns: [], rows: [], isTabular: false };

  // First non-empty line is likely the header
  const headerLine = dataLines[0];
  const columns = headerLine
    .split(delimiter)
    .map((c) => c.trim())
    .filter(Boolean);

  const rows = dataLines.slice(1).map((line) => {
    const cells = line.split(delimiter).map((c) => c.trim());
    const row = {};
    columns.forEach((col, i) => { row[col] = cells[i] || ''; });
    return row;
  });

  return { columns, rows, isTabular: true };
}

function splitByMultiSpace(lines) {
  // Find column boundaries from most consistent multi-space positions
  const headerLine = lines[0];
  const cols = headerLine.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);

  if (cols.length < 2) return { columns: ['Name'], rows: lines.map((l) => ({ Name: l })), isTabular: false };

  const rows = lines.slice(1).map((line) => {
    const cells = line.split(/\s{2,}/).map((c) => c.trim());
    const row = {};
    cols.forEach((col, i) => { row[col] = cells[i] || ''; });
    return row;
  });

  return { columns: cols, rows, isTabular: true };
}

module.exports = { extractTextFromImage };
