/**
 * Smart field detection:
 * 1. Header-name matching (regex rules)
 * 2. Data-value inference (email pattern, phone pattern, URL pattern, numeric ID)
 * 3. Fuzzy scoring for partial matches
 */

const FIELD_RULES = {
  name: {
    headers: /^(name|full.?name|student.?name|employee.?name|person.?name|candidate|fname|lname|first.?name|last.?name|applicant)/i,
    values: null,
    weight: 1,
  },
  idNumber: {
    headers: /^(id|roll|roll.?no|roll.?number|emp.?id|id.?no|id.?number|student.?id|reg.?no|registration|serial|sr\.?\s*no|s\.?no|admission)/i,
    values: (samples) => {
      // ID-like: short alphanumeric strings (2-20 chars), often with prefix letters
      const idLike = samples.filter((v) => v && /^[A-Z0-9\-\/]{2,20}$/i.test(v.trim()));
      return idLike.length / samples.filter(Boolean).length > 0.6;
    },
    weight: 0.9,
  },
  department: {
    headers: /^(dept|department|class|section|stream|branch|division|course|subject|grade|standard|std|faculty|year|batch)/i,
    values: null,
    weight: 0.8,
  },
  designation: {
    headers: /^(designation|post|position|title|job.?title|rank|role|cadre|category)/i,
    values: null,
    weight: 0.8,
  },
  email: {
    headers: /^(email|e.?mail|mail|email.?id|e.?mail.?id)/i,
    values: (samples) => {
      const emailLike = samples.filter((v) => v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()));
      return emailLike.length / samples.filter(Boolean).length > 0.5;
    },
    weight: 1,
  },
  phone: {
    headers: /^(phone|mobile|contact|mob|cell|tel|telephone|ph\.?no|phone.?no|contact.?no)/i,
    values: (samples) => {
      const phoneLike = samples.filter((v) => v && /^[\d\s\+\-\(\)]{7,15}$/.test(v.trim()));
      return phoneLike.length / samples.filter(Boolean).length > 0.5;
    },
    weight: 1,
  },
  photoUrl: {
    headers: /^(photo|image|pic|picture|photo.?url|img|avatar|passport)/i,
    values: (samples) => {
      const urlLike = samples.filter((v) => v && /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)/i.test(v.trim()));
      return urlLike.length / samples.filter(Boolean).length > 0.3;
    },
    weight: 0.9,
  },
};

/**
 * Detect field mapping for a list of columns.
 * @param {string[]} columns - column header names
 * @param {Object[]} rows - sample data rows (up to 5)
 * @returns {Object} mapping: { columnName: fieldName | '__skip__' }
 */
function autoDetectMapping(columns, rows = []) {
  const mapping = {};
  const assigned = new Set(); // prevent two columns mapping to same field

  // Score every column against every field
  const scores = columns.map((col) => {
    const fieldScores = {};
    const samples = rows.map((row) => String(row[col] || '')).filter(Boolean);

    for (const [field, rule] of Object.entries(FIELD_RULES)) {
      let score = 0;

      // Header match
      if (rule.headers.test(col.trim())) {
        score += 2 * rule.weight;
      }

      // Partial fuzzy match (header contains field keyword or vice versa)
      const colLower = col.toLowerCase().replace(/[\s_\-\.]/g, '');
      const fieldWords = field.toLowerCase().split(/(?=[A-Z])/).join('');
      if (colLower.includes(fieldWords) || fieldWords.includes(colLower)) {
        score += 0.5 * rule.weight;
      }

      // Value-based inference
      if (rule.values && samples.length > 0) {
        if (rule.values(samples)) score += 1.5 * rule.weight;
      }

      fieldScores[field] = score;
    }
    return { col, fieldScores };
  });

  // Greedy assignment: best score first
  const allPairs = [];
  for (const { col, fieldScores } of scores) {
    for (const [field, score] of Object.entries(fieldScores)) {
      if (score > 0) allPairs.push({ col, field, score });
    }
  }
  allPairs.sort((a, b) => b.score - a.score);

  for (const { col, field, score } of allPairs) {
    if (!mapping[col] && !assigned.has(field) && score >= 1) {
      mapping[col] = field;
      assigned.add(field);
    }
  }

  // Remaining columns → skip
  for (const col of columns) {
    if (!mapping[col]) mapping[col] = '__skip__';
  }

  return mapping;
}

module.exports = { autoDetectMapping };
