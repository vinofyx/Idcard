/**
 * PDF text extraction using pdf-parse.
 * Attempts to detect tabular structure from raw PDF text.
 */
const pdfParse = require('pdf-parse');

async function extractTextFromPDF(buffer) {
  let data;
  try {
    data = await pdfParse(buffer, { max: 10 }); // limit to 10 pages
  } catch (err) {
    throw new Error('Could not read PDF — it may be scanned or password-protected. Try Image OCR for scanned PDFs.');
  }

  const rawText = data.text || '';
  const pageCount = data.numpages;

  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const parsed = parseTableFromPDFLines(lines);

  return {
    rawText,
    pageCount,
    lines,
    ...parsed,
  };
}

function parseTableFromPDFLines(lines) {
  if (!lines.length) return { columns: [], rows: [], isTabular: false };

  // Many PDFs export with tab characters between columns
  const tabLines = lines.filter((l) => l.includes('\t'));
  if (tabLines.length > 3) {
    return splitByDelimiter(lines, '\t');
  }

  // Try pipe-separated
  const pipeLines = lines.filter((l) => l.split('|').length > 2);
  if (pipeLines.length > 3) {
    return splitByDelimiter(pipeLines, '|');
  }

  // Try comma-separated
  const commaLines = lines.filter((l) => l.split(',').length > 2);
  if (commaLines.length > lines.length * 0.4) {
    return splitByDelimiter(lines, ',');
  }

  // Fixed-width: lines with consistent multiple-space gaps
  const fixedWidth = lines.filter((l) => /\s{3,}/.test(l));
  if (fixedWidth.length > lines.length * 0.5) {
    return splitByFixedWidth(lines);
  }

  // Last resort: each line is one record, treat as Name
  return { columns: ['Name'], rows: lines.map((l) => ({ Name: l })), isTabular: false };
}

function splitByDelimiter(lines, delimiter) {
  const nonEmpty = lines.filter((l) => l.includes(delimiter));
  if (nonEmpty.length < 2) return { columns: [], rows: [], isTabular: false };

  const headerParts = nonEmpty[0].split(delimiter).map((c) => c.trim()).filter(Boolean);
  const columns = headerParts;

  const rows = nonEmpty.slice(1).map((line) => {
    const cells = line.split(delimiter).map((c) => c.trim());
    const row = {};
    columns.forEach((col, i) => { row[col] = cells[i] || ''; });
    return row;
  }).filter((row) => Object.values(row).some((v) => v));

  return { columns, rows, isTabular: true };
}

function splitByFixedWidth(lines) {
  // Try to use the first "header-looking" line to define columns
  // A header line typically has short words separated by large spaces
  const headerIdx = lines.findIndex((l) => /[A-Za-z]/.test(l) && /\s{3,}/.test(l));
  if (headerIdx === -1) {
    return { columns: ['Name'], rows: lines.map((l) => ({ Name: l })), isTabular: false };
  }

  const headerLine = lines[headerIdx];
  // Split by 3+ spaces
  const cols = headerLine.split(/\s{3,}/).map((c) => c.trim()).filter(Boolean);

  if (cols.length < 2) {
    return { columns: ['Name'], rows: lines.map((l) => ({ Name: l })), isTabular: false };
  }

  // Build regex to split data rows at same character positions
  const rows = lines.slice(headerIdx + 1).map((line) => {
    const cells = line.split(/\s{2,}/).map((c) => c.trim());
    const row = {};
    cols.forEach((col, i) => { row[col] = cells[i] || ''; });
    return row;
  }).filter((row) => Object.values(row).some((v) => v.length > 0));

  return { columns: cols, rows, isTabular: rows.length > 0 };
}

module.exports = { extractTextFromPDF };
