import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import toast from 'react-hot-toast';
import {
  Upload, FileSpreadsheet, FileText, Image, ArrowRight,
  Check, AlertCircle, Eye, EyeOff, PenLine, Table2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getOrgRules } from '../utils/orgRules';

// ── Build field list dynamically based on org type ───────────────────────────
function buildSystemFields(orgType) {
  const r = getOrgRules(orgType);
  return [
    { value: '__skip__',    label: '— Skip this column —' },
    { value: 'name',        label: 'Name (Full Name)' },
    { value: 'idNumber',    label: r.fieldLabels.idNumber },
    { value: 'department',  label: r.fieldLabels.department },
    { value: 'designation', label: r.fieldLabels.designation },
    { value: 'email',       label: 'Email' },
    { value: 'phone',       label: 'Phone / Mobile' },
    { value: 'photoUrl',    label: 'Photo URL' },
  ];
}

// Flatten columnHints into a map: hint-string → systemField  (for tooltip display)
function buildHintMap(orgType) {
  const r = getOrgRules(orgType);
  const map = {};
  Object.entries(r.columnHints).forEach(([field, hints]) => {
    hints.forEach((h) => { map[h.toLowerCase()] = field; });
  });
  return map;
}

const STEPS = ['Upload File', 'Map Columns', 'Preview & Confirm'];
const TABS = [
  { id: 'excel', label: 'Excel / CSV', icon: FileSpreadsheet, accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'], 'text/csv': ['.csv'] }, hint: '.xlsx · .xls · .csv' },
  { id: 'pdf',   label: 'PDF',         icon: FileText,        accept: { 'application/pdf': ['.pdf'] },                                                                                                                        hint: 'Text-based PDF (not scanned)' },
  { id: 'image', label: 'Image / OCR', icon: Image,           accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.webp'] },                                                                                    hint: 'Scanned documents, photos of lists' },
];

// ── Main component ───────────────────────────────────────────────────────────
export default function UploadPage() {
  const navigate = useNavigate();
  const { organization } = useAuth();
  const orgType    = organization?.type || 'school';
  const orgRules   = getOrgRules(orgType);
  const systemFields = buildSystemFields(orgType);
  const hintMap    = buildHintMap(orgType);

  const [activeTab, setActiveTab] = useState('excel');
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [parseResult, setParseResult] = useState(null);
  const [mapping, setMapping] = useState({});
  const [loading, setLoading] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const tab = TABS.find((t) => t.id === activeTab);

  const resetFlow = (newTab) => {
    setActiveTab(newTab);
    setStep(0);
    setFile(null);
    setParseResult(null);
    setMapping({});
  };

  const onDrop = useCallback((accepted) => {
    if (accepted[0]) { setFile(accepted[0]); setParseResult(null); }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: tab.accept,
    maxFiles: 1,
  });

  // ── Step 0: parse the uploaded file ───────────────────────────────────────
  const parseFile = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);

      let endpoint = '/upload/excel';
      if (activeTab === 'pdf')   endpoint = '/upload/pdf';
      if (activeTab === 'image') endpoint = '/upload/image';

      const { data } = await api.post(endpoint, fd);

      if (!data.columns?.length) {
        toast.error('Could not detect any columns. Try a different file.');
        setLoading(false);
        return;
      }

      setParseResult(data);
      setMapping(data.autoMapping || {});
      setStep(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process file');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: save records ───────────────────────────────────────────────────
  const confirmUpload = async () => {
    setLoading(true);
    try {
      let response;

      if (activeTab === 'excel') {
        // Excel: re-send file + mapping
        const fd = new FormData();
        fd.append('file', file);
        fd.append('mapping', JSON.stringify(mapping));
        const { data } = await api.post('/upload/excel/confirm', fd);
        response = data;
      } else {
        // PDF / Image: send rows + mapping as JSON
        const { data } = await api.post(`/upload/${activeTab}/confirm`, {
          rows: parseResult.rows,
          mapping,
        });
        response = data;
      }

      // Build a concise cleaning summary for the toast
      const c = response.cleaning;
      if (c) {
        const parts = [];
        if (c.cleaningChanges  > 0) parts.push(`${c.cleaningChanges} field${c.cleaningChanges > 1 ? 's' : ''} auto-cleaned`);
        if (c.skippedDuplicates > 0) parts.push(`${c.skippedDuplicates} duplicate${c.skippedDuplicates > 1 ? 's' : ''} skipped`);
        if (c.skippedInvalid   > 0) parts.push(`${c.skippedInvalid} invalid row${c.skippedInvalid > 1 ? 's' : ''} skipped`);
        const detail = parts.length ? ` · ${parts.join(' · ')}` : '';
        toast.success(`${response.count} records imported!${detail}`, { duration: 5000 });
      } else {
        toast.success(`${response.count} records imported successfully!`);
      }
      navigate(`/records?batchId=${response.batchId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const mappingValid = parseResult?.columns?.some((c) => mapping[c] === 'name');

  return (
    <div>
      <div className="page-header">
        <h1>Upload Data</h1>
        <p>Import from Excel, PDF, or scanned images to generate ID cards</p>
      </div>

      {/* ── Input Method Chooser ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { icon: FileSpreadsheet, label: 'Upload File', sub: 'Excel, PDF, or scanned image', active: true, onClick: () => {} },
          { icon: PenLine,         label: 'Single Entry', sub: 'Fill a form for one record',  active: false, onClick: () => navigate('/manual') },
          { icon: Table2,          label: 'Bulk Table',   sub: 'Type many rows in a table',   active: false, onClick: () => navigate('/manual') },
        ].map(({ icon: Icon, label, sub, active, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
              border: `2px solid ${active ? '#748ffc' : '#e5e7eb'}`,
              borderRadius: 10, cursor: 'pointer', textAlign: 'left',
              background: active ? '#edf2ff' : '#fff',
              transition: 'all .15s',
            }}
            onMouseEnter={(e) => { if (!active) { e.currentTarget.style.borderColor = '#748ffc'; e.currentTarget.style.background = '#f5f7ff'; } }}
            onMouseLeave={(e) => { if (!active) { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#fff'; } }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 8, background: active ? '#748ffc' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={20} color={active ? '#fff' : '#6b7280'} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: active ? '#3b5bdb' : '#111827' }}>{label}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{sub}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Source tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#f1f3f5', padding: 4, borderRadius: 10, width: 'fit-content' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => resetFlow(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px',
              borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500,
              background: activeTab === t.id ? '#fff' : 'transparent',
              color: activeTab === t.id ? '#3b5bdb' : '#495057',
              boxShadow: activeTab === t.id ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
              transition: 'all .15s',
            }}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: i < step ? '#2f9e44' : i === step ? '#3b5bdb' : '#e9ecef',
                color: i <= step ? '#fff' : '#868e96', fontSize: 13, fontWeight: 600, flexShrink: 0,
              }}>
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              <span style={{ fontSize: 13, fontWeight: i === step ? 600 : 400, color: i === step ? '#212529' : '#868e96', whiteSpace: 'nowrap' }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: i < step ? '#2f9e44' : '#e9ecef', margin: '0 12px' }} />}
          </div>
        ))}
      </div>

      {/* ── Step 0: Upload ─────────────────────────────────────────────────── */}
      {step === 0 && (
        <div className="card" style={{ maxWidth: 580 }}>
          {/* OCR notice */}
          {activeTab === 'image' && (
            <div style={{ background: '#fff3bf', border: '1px solid #ffe066', borderRadius: 8, padding: '10px 14px', marginBottom: 18, fontSize: 13, color: '#664d03', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <div><strong>Image OCR Tips:</strong> Use high-contrast images. Printed tables work best. Handwriting is supported but less accurate. For scanned PDFs, use the PDF tab instead.</div>
            </div>
          )}
          {activeTab === 'pdf' && (
            <div style={{ background: '#e7f5ff', border: '1px solid #74c0fc', borderRadius: 8, padding: '10px 14px', marginBottom: 18, fontSize: 13, color: '#1864ab', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <div><strong>PDF Tips:</strong> Works on text-based PDFs (copy-paste-able text). For scanned PDFs, use Image OCR tab. Tables with consistent spacing or delimiters extract best.</div>
            </div>
          )}

          <div {...getRootProps()} style={{
            border: `2px dashed ${isDragActive ? '#3b5bdb' : '#dee2e6'}`,
            borderRadius: 10, padding: '48px 32px', textAlign: 'center', cursor: 'pointer',
            background: isDragActive ? '#edf2ff' : '#fafafa', transition: 'all .2s',
          }}>
            <input {...getInputProps()} />
            <tab.icon size={52} color="#748ffc" style={{ margin: '0 auto 16px', display: 'block' }} />
            {file ? (
              <div>
                <p style={{ fontWeight: 600, marginBottom: 4 }}>{file.name}</p>
                <p style={{ fontSize: 13, color: '#868e96' }}>{(file.size / 1024).toFixed(1)} KB — click to change</p>
              </div>
            ) : (
              <div>
                <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>Drop your {tab.label} file here</p>
                <p style={{ color: '#868e96', fontSize: 13 }}>{tab.hint}</p>
              </div>
            )}
          </div>

          {file && (
            <button className="btn btn-primary btn-block" style={{ marginTop: 20 }} onClick={parseFile} disabled={loading}>
              {loading
                ? <><span className="spinner" style={{ width: 16, height: 16, borderTopColor: '#fff' }} /> {activeTab === 'image' ? 'Running OCR…' : 'Extracting…'}</>
                : <>{activeTab === 'image' ? 'Run OCR' : 'Extract Data'} <ArrowRight size={15} /></>}
            </button>
          )}
        </div>
      )}

      {/* ── Step 1: Map Columns ────────────────────────────────────────────── */}
      {step === 1 && parseResult && (
        <div>
          {/* Source info banner */}
          <div style={{ background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: 8, padding: '10px 16px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13 }}>
              <strong>{parseResult.fileName}</strong>
              {' · '}
              <span style={{ color: '#868e96' }}>
                {parseResult.totalRows} rows · {parseResult.columns.length} columns
                {parseResult.pageCount ? ` · ${parseResult.pageCount} pages` : ''}
                {parseResult.isTabular === false ? ' · Non-tabular (line-by-line)' : ''}
              </span>
            </div>
            {(activeTab === 'pdf' || activeTab === 'image') && parseResult.rawText && (
              <button className="btn btn-ghost btn-sm" onClick={() => setShowRaw((v) => !v)}>
                {showRaw ? <><EyeOff size={13} /> Hide Raw Text</> : <><Eye size={13} /> Show Raw Text</>}
              </button>
            )}
          </div>

          {showRaw && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#868e96' }}>Raw Extracted Text</h3>
              <pre style={{ fontSize: 11, background: '#f8f9fa', padding: 12, borderRadius: 6, overflowX: 'auto', maxHeight: 200, whiteSpace: 'pre-wrap', color: '#495057' }}>
                {parseResult.rawText}
              </pre>
            </div>
          )}

          <div className="card">
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Map Columns to Fields</h2>
            <p style={{ fontSize: 13, color: '#868e96', marginBottom: 14 }}>
              We auto-detected the mappings below using header names and data values — review and adjust as needed.
            </p>

            {/* Org-type smart-hints banner */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              background: '#f0f4ff', border: '1px solid #c7d2fe', borderRadius: 8,
              padding: '9px 14px', marginBottom: 18, fontSize: 12,
            }}>
              <span style={{ fontSize: 15 }}>{orgRules.emoji}</span>
              <span style={{ fontWeight: 600, color: '#3b5bdb' }}>{orgRules.label} smart mapping active</span>
              <span style={{ color: '#6b7280' }}>·</span>
              <span style={{ color: '#4b5563' }}>
                ID field → <strong>{orgRules.fieldLabels.idNumber}</strong>
                &nbsp;·&nbsp;Dept → <strong>{orgRules.fieldLabels.department}</strong>
                &nbsp;·&nbsp;Role → <strong>{orgRules.fieldLabels.designation}</strong>
              </span>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Detected Column</th>
                  <th>Map to Field</th>
                  <th>Sample Values</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {parseResult.columns.map((col) => {
                  const mapped = mapping[col] || '__skip__';
                  const isAutoMapped = parseResult.autoMapping?.[col] !== '__skip__' && parseResult.autoMapping?.[col];
                  // Check if this column name matches any org-specific hint
                  const hintField = hintMap[col.toLowerCase().trim()];
                  const hintLabel = hintField ? orgRules.fieldLabels[hintField] : null;
                  return (
                    <tr key={col}>
                      <td>
                        <strong style={{ fontSize: 13 }}>{col}</strong>
                        {hintLabel && !isAutoMapped && (
                          <div style={{ fontSize: 10, color: '#7c3aed', marginTop: 2 }}>
                            💡 Looks like "{hintLabel}"
                          </div>
                        )}
                      </td>
                      <td>
                        <select
                          className="form-control"
                          style={{ width: 220 }}
                          value={mapped}
                          onChange={(e) => setMapping({ ...mapping, [col]: e.target.value })}
                        >
                          {systemFields.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </select>
                      </td>
                      <td style={{ color: '#868e96', fontSize: 12, maxWidth: 200 }}>
                        {parseResult.preview.slice(0, 3).map((row, i) => (
                          <span key={i} style={{ marginRight: 6 }}>{row[col] || '—'}</span>
                        ))}
                      </td>
                      <td>
                        {isAutoMapped
                          ? <span className="badge badge-success" style={{ fontSize: 11 }}>Auto ✓</span>
                          : <span className="badge badge-warning" style={{ fontSize: 11 }}>Manual</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!mappingValid && (
              <div style={{ color: '#e03131', fontSize: 13, marginTop: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
                <AlertCircle size={15} /> Map at least one column to "Name" to continue.
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={() => setStep(0)}>← Back</button>
              <button className="btn btn-primary" onClick={() => setStep(2)} disabled={!mappingValid}>
                Preview Data <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Preview & Confirm ──────────────────────────────────────── */}
      {step === 2 && parseResult && (
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Preview First 5 Records</h2>
          <p style={{ fontSize: 13, color: '#868e96', marginBottom: 20 }}>
            Verify data looks correct before importing all <strong>{parseResult.totalRows}</strong> records.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  {Object.entries(mapping)
                    .filter(([, v]) => v !== '__skip__')
                    .map(([col, field]) => (
                      <th key={col}>{systemFields.find((f) => f.value === field)?.label || field}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {parseResult.preview.map((row, i) => (
                  <tr key={i}>
                    {Object.entries(mapping)
                      .filter(([, v]) => v !== '__skip__')
                      .map(([col]) => (
                        <td key={col} style={{ fontSize: 13 }}>{row[col] || '—'}</td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}>← Adjust Mapping</button>
            <button className="btn btn-primary" onClick={confirmUpload} disabled={loading}>
              {loading
                ? <><span className="spinner" style={{ width: 15, height: 15, borderTopColor: '#fff' }} /> Importing…</>
                : <><Upload size={15} /> Import {parseResult.totalRows} Records</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
