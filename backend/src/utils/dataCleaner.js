/**
 * Data Cleaning Engine
 * Cleans, normalises, and deduplicates raw records before saving.
 */

// Title-case a name: "john doe" → "John Doe", "MARY ANNE" → "Mary Anne"
function toTitleCase(str) {
  if (!str) return str;
  // Preserve all-caps abbreviations that are 2 chars or less (e.g. "AI", "IT")
  return str.replace(/\w\S*/g, (w) => {
    if (w.length <= 2 && w === w.toUpperCase()) return w;
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  });
}

// Normalise phone: keep digits, +, -, spaces, parentheses only
function normalisePhone(phone) {
  if (!phone) return phone;
  return phone.replace(/[^\d+\-\s()]/g, '').trim();
}

// Normalise email to lowercase
function normaliseEmail(email) {
  if (!email) return email;
  return email.trim().toLowerCase();
}

// Detect and flag empty/missing required fields
function missingFields(record) {
  const missing = [];
  if (!record.name || record.name === 'Unknown') missing.push('name');
  return missing;
}

/**
 * Clean a single record object.
 * @param {Object} rec
 * @returns {{ record: Object, changes: string[] }}
 */
function cleanRecord(rec) {
  const changes = [];
  const r = { ...rec };

  // Trim all string fields
  for (const k of Object.keys(r)) {
    if (typeof r[k] === 'string') r[k] = r[k].trim();
  }

  // Title-case name
  if (r.name) {
    const cleaned = toTitleCase(r.name);
    if (cleaned !== r.name) { changes.push(`Name cased: "${r.name}" → "${cleaned}"`); r.name = cleaned; }
  }

  // Lowercase email
  if (r.email) {
    const cleaned = normaliseEmail(r.email);
    if (cleaned !== r.email) { changes.push(`Email lowercased`); r.email = cleaned; }
  }

  // Normalise phone
  if (r.phone) {
    const cleaned = normalisePhone(r.phone);
    if (cleaned !== r.phone) { changes.push(`Phone normalised`); r.phone = cleaned; }
  }

  // Strip leading zeros from idNumber if it's purely numeric (avoid "007" → "7")
  // Keep alphanumeric IDs as-is (e.g. "EMP007")
  if (r.idNumber && /^\d+$/.test(r.idNumber)) {
    const stripped = r.idNumber.replace(/^0+/, '') || r.idNumber;
    if (stripped !== r.idNumber) { changes.push(`ID leading zeros removed`); r.idNumber = stripped; }
  }

  return { record: r, changes };
}

/**
 * Clean an array of records and remove in-batch duplicates.
 * @param {Object[]} records
 * @param {Set<string>} [existingIdNumbers] — ID numbers already in DB
 * @returns {{
 *   cleaned: Object[],
 *   skippedDuplicates: number,
 *   skippedInvalid: number,
 *   cleaningChanges: number,
 *   report: string,
 * }}
 */
function cleanAndDedup(records, existingIdNumbers = new Set()) {
  const seenIds = new Set(existingIdNumbers);
  const cleaned = [];
  let skippedDuplicates = 0;
  let skippedInvalid = 0;
  let cleaningChanges = 0;

  for (const raw of records) {
    // Skip completely empty rows
    const hasAnyValue = Object.values(raw).some((v) => v && String(v).trim());
    if (!hasAnyValue) continue;

    const { record, changes } = cleanRecord(raw);
    cleaningChanges += changes.length;

    // Skip if name is still missing/unknown
    if (!record.name || record.name.toLowerCase() === 'unknown') {
      skippedInvalid++;
      continue;
    }

    // Dedup by idNumber (skip duplicates)
    if (record.idNumber) {
      const norm = record.idNumber.toLowerCase();
      if (seenIds.has(norm)) {
        skippedDuplicates++;
        continue;
      }
      seenIds.add(norm);
    }

    cleaned.push(record);
  }

  const parts = [];
  if (cleaningChanges) parts.push(`${cleaningChanges} field${cleaningChanges > 1 ? 's' : ''} auto-cleaned`);
  if (skippedDuplicates) parts.push(`${skippedDuplicates} duplicate${skippedDuplicates > 1 ? 's' : ''} removed`);
  if (skippedInvalid) parts.push(`${skippedInvalid} invalid row${skippedInvalid > 1 ? 's' : ''} skipped`);

  return {
    cleaned,
    skippedDuplicates,
    skippedInvalid,
    cleaningChanges,
    report: parts.join(' · ') || 'Data looks clean',
  };
}

module.exports = { cleanRecord, cleanAndDedup };
