/**
 * Organization-type rules: labels, ID format, column mapping hints, template defaults.
 * Used by OnboardingPage, UploadPage, ManualEntryPage, Dashboard.
 */

export const ORG_RULES = {
  school: {
    label:       'School',
    emoji:       '🏫',
    description: 'Primary & secondary schools',
    idPrefix:    'SCH',
    idFormat:    'SCH-{NNN}',
    sampleId:    'SCH-001',
    fieldLabels: {
      idNumber:    'Roll Number',
      department:  'Class / Section',
      designation: 'Standard',
    },
    columnHints: {
      idNumber:    ['roll no', 'roll number', 'rollno', 'roll', 'student id', 'admission no'],
      department:  ['class', 'section', 'grade', 'standard', 'std'],
      designation: ['stream', 'year', 'group'],
    },
    templateStyle: 'classic-blue',
  },
  college: {
    label:       'College / University',
    emoji:       '🎓',
    description: 'Colleges and universities',
    idPrefix:    'COL',
    idFormat:    'COL-{YYYY}-{NNN}',
    sampleId:    'COL-2026-001',
    fieldLabels: {
      idNumber:    'Register Number',
      department:  'Department / Branch',
      designation: 'Course / Year',
    },
    columnHints: {
      idNumber:    ['reg no', 'register number', 'registration', 'usn', 'enrollment', 'prn'],
      department:  ['department', 'branch', 'course', 'programme', 'faculty'],
      designation: ['year', 'semester', 'sem'],
    },
    templateStyle: 'minimal-white',
  },
  corporate: {
    label:       'Corporate / Company',
    emoji:       '🏢',
    description: 'Companies and organizations',
    idPrefix:    'EMP',
    idFormat:    'EMP-{NNN}',
    sampleId:    'EMP-001',
    fieldLabels: {
      idNumber:    'Employee ID',
      department:  'Department',
      designation: 'Designation',
    },
    columnHints: {
      idNumber:    ['employee id', 'emp id', 'staff id', 'badge', 'badge no'],
      department:  ['department', 'division', 'team', 'unit', 'branch'],
      designation: ['designation', 'position', 'title', 'job title', 'role', 'rank'],
    },
    templateStyle: 'modern-dark',
  },
  institute: {
    label:       'Coaching / Institute',
    emoji:       '📚',
    description: 'Training centers and coaching institutes',
    idPrefix:    'STU',
    idFormat:    'STU-{NNN}',
    sampleId:    'STU-001',
    fieldLabels: {
      idNumber:    'Student ID',
      department:  'Batch / Course',
      designation: 'Level',
    },
    columnHints: {
      idNumber:    ['student id', 'roll no', 'batch id', 'seat no'],
      department:  ['batch', 'course', 'subject', 'program', 'programme'],
      designation: ['year', 'level', 'stream'],
    },
    templateStyle: 'classic-blue',
  },
};

/** Get rules for a given org type (defaults to school). */
export function getOrgRules(type) {
  return ORG_RULES[type] || ORG_RULES.school;
}

/** Get friendly label for a field based on org type. */
export function fieldLabel(type, field, fallback) {
  const rules = getOrgRules(type);
  return rules.fieldLabels[field] || fallback || field;
}
