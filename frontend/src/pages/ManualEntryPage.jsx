import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus, Table2, Save, Trash2, Plus, Camera,
  AlertCircle, CheckCircle2, ChevronRight, RefreshCw, Download,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getOrgRules } from '../utils/orgRules';

// ─── Base field definitions (labels overridden at runtime by org rules) ───────
const BASE_FIELDS = [
  { key: 'name',        label: 'Name',        type: 'text',  placeholder: 'Full name' },
  { key: 'idNumber',    label: 'ID Number',   type: 'text',  placeholder: '' },
  { key: 'department',  label: 'Department',  type: 'text',  placeholder: '' },
  { key: 'designation', label: 'Designation', type: 'text',  placeholder: '' },
  { key: 'email',       label: 'Email',       type: 'email', placeholder: 'email@example.com' },
  { key: 'phone',       label: 'Phone',       type: 'tel',   placeholder: '+91 9876543210' },
];

const BULK_COLS = ['name', 'idNumber', 'department', 'designation', 'email', 'phone'];
const COL_WIDTHS = { name: 160, idNumber: 110, department: 130, designation: 130, email: 170, phone: 120 };

const emptyRow = () => ({
  _id: crypto.randomUUID(),
  name: '', idNumber: '', department: '', designation: '', email: '', phone: '', photoUrl: '',
});

const DRAFT_KEY = 'idflow_manual_draft';

// ─── helpers ─────────────────────────────────────────────────────────────────
function autoId(rows, prefix = 'ID') {
  const nums = rows
    .map((r) => r.idNumber)
    .filter((v) => v && v.startsWith(prefix))
    .map((v) => parseInt(v.replace(prefix, ''), 10))
    .filter((n) => !isNaN(n));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

// ─── Single Entry Form ────────────────────────────────────────────────────────
function SingleForm({ onSuccess, orgRules }) {
  const [form, setForm] = useState({ name: '', idNumber: '', department: '', designation: '', email: '', phone: '' });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const handleChange = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Name is required'); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (photo) fd.append('photo', photo);
      const { data } = await api.post('/records/manual', fd);
      if (data._warning) setError(`⚠️ ${data._warning}`);
      onSuccess(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save record');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setForm({ name: '', idNumber: '', department: '', designation: '', email: '', phone: '' });
    setPhoto(null);
    setPhotoPreview('');
    setError('');
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, borderRadius: 8,
          padding: '10px 14px', marginBottom: 20, fontSize: 14,
          ...(error.startsWith('⚠️')
            ? { background: '#fffbeb', border: '1px solid #fcd34d', color: '#92400e' }
            : { background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626' }),
        }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 24 }}>
        {/* Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {BASE_FIELDS.map(({ key, label, type, placeholder }) => {
            // Override label and placeholder with org-specific terms
            const fl = orgRules?.fieldLabels;
            const displayLabel = (fl && fl[key]) ? fl[key] : label;
            const displayPlaceholder = placeholder ||
              (key === 'idNumber'    ? (orgRules?.sampleId || 'e.g. ID-001') : '') ||
              (key === 'department'  ? `e.g. ${fl?.department || 'Department'}` : '') ||
              (key === 'designation' ? `e.g. ${fl?.designation || 'Designation'}` : '');
            const isRequired = key === 'name';
            return (
              <div key={key}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  {displayLabel}{isRequired && <span style={{ color: '#ef4444' }}> *</span>}
                </label>
                <input
                  type={type}
                  value={form[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  placeholder={displayPlaceholder}
                  className="form-control"
                  style={{ width: '100%' }}
                />
              </div>
            );
          })}
        </div>

        {/* Photo */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Photo</label>
          <div
            onClick={() => fileRef.current.click()}
            style={{
              width: 120, height: 150, borderRadius: 8, border: '2px dashed #d1d5db',
              cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', background: '#f9fafb', overflow: 'hidden', position: 'relative',
              transition: 'border-color .2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#748ffc')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#d1d5db')}
          >
            {photoPreview
              ? <img src={photoPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <>
                  <Camera size={28} color="#9ca3af" />
                  <span style={{ fontSize: 11, color: '#9ca3af', marginTop: 6, textAlign: 'center', padding: '0 8px' }}>Click to upload</span>
                </>
            }
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
          {photoPreview && (
            <button type="button" onClick={() => { setPhoto(null); setPhotoPreview(''); }} style={{ marginTop: 6, fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
              Remove
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving…</> : <><Save size={15} /> Save Record</>}
        </button>
        <button type="button" onClick={reset} className="btn btn-ghost">
          <RefreshCw size={15} /> Reset
        </button>
      </div>
    </form>
  );
}

// ─── Bulk Table ───────────────────────────────────────────────────────────────
function BulkTable({ onSuccess, orgRules }) {
  const [rows, setRows] = useState(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      return saved ? JSON.parse(saved) : [emptyRow(), emptyRow(), emptyRow()];
    } catch { return [emptyRow(), emptyRow(), emptyRow()]; }
  });
  const [batchName, setBatchName] = useState('');
  const [idPrefix, setIdPrefix] = useState('ID');
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);
  const tableRef = useRef();

  // Auto-save draft on change
  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(rows)); } catch {}
  }, [rows]);

  const setCell = useCallback((rowIdx, key, value) => {
    setRows((prev) => prev.map((r, i) => i === rowIdx ? { ...r, [key]: value } : r));
  }, []);

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  const removeRow = (idx) => setRows((prev) => prev.filter((_, i) => i !== idx));

  const autoFillIds = () => {
    setRows((prev) => {
      let counter = 1;
      return prev.map((r) => ({
        ...r,
        idNumber: r.idNumber.trim() || `${idPrefix}${String(counter++).padStart(3, '0')}`,
      }));
    });
  };

  // Handle Tab key navigation between cells
  const handleKeyDown = (e, rowIdx, colIdx) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const totalCols = BULK_COLS.length;
      let nextCol = colIdx + (e.shiftKey ? -1 : 1);
      let nextRow = rowIdx;
      if (nextCol >= totalCols) { nextCol = 0; nextRow = rowIdx + 1; }
      if (nextCol < 0) { nextCol = totalCols - 1; nextRow = rowIdx - 1; }
      if (nextRow >= rows.length) { addRow(); nextRow = rows.length; }
      if (nextRow < 0) return;
      setTimeout(() => {
        const cell = tableRef.current?.querySelector(`[data-cell="${nextRow}-${nextCol}"]`);
        cell?.focus();
      }, 10);
    }
  };

  // Handle Ctrl+V paste from Excel
  const handlePaste = (e, startRow, startCol) => {
    const text = e.clipboardData.getData('text');
    if (!text.includes('\t') && !text.includes('\n')) return; // single cell paste — let it through
    e.preventDefault();
    const pastedRows = text.trim().split('\n').map((row) => row.split('\t'));
    setRows((prev) => {
      const next = [...prev];
      pastedRows.forEach((pastedCols, ri) => {
        const targetRow = startRow + ri;
        while (next.length <= targetRow) next.push(emptyRow());
        pastedCols.forEach((val, ci) => {
          const targetCol = startCol + ci;
          if (targetCol < BULK_COLS.length) {
            next[targetRow] = { ...next[targetRow], [BULK_COLS[targetCol]]: val.trim() };
          }
        });
      });
      return next;
    });
  };

  const validate = () => {
    const errs = [];
    const seenIds = new Set();
    rows.forEach((r, i) => {
      if (!r.name.trim()) errs.push(i);
      if (r.idNumber.trim() && seenIds.has(r.idNumber.trim())) errs.push(i);
      if (r.idNumber.trim()) seenIds.add(r.idNumber.trim());
    });
    return errs;
  };

  const saveDraft = () => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(rows)); }
    catch {}
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2000);
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setRows([emptyRow(), emptyRow(), emptyRow()]);
  };

  const handleSubmit = async () => {
    setGlobalError('');
    const errs = validate();
    setErrors(errs);
    if (errs.length) { setGlobalError(`Fix ${errs.length} row(s) with errors before saving`); return; }

    const filledRows = rows.filter((r) => r.name.trim());
    if (!filledRows.length) { setGlobalError('Add at least one record'); return; }

    setLoading(true);
    try {
      const payload = filledRows.map(({ _id, ...r }) => r);
      const { data } = await api.post('/records/bulk-manual', { records: payload, batchName });
      localStorage.removeItem(DRAFT_KEY);
      onSuccess(data, true);
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.errors) setGlobalError(errData.errors.join(' · '));
      else setGlobalError(errData?.message || 'Failed to save records');
    } finally {
      setLoading(false);
    }
  };

  const filledCount = rows.filter((r) => r.name.trim()).length;

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          value={batchName}
          onChange={(e) => setBatchName(e.target.value)}
          placeholder="Batch name (optional)"
          className="form-control"
          style={{ width: 200 }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            value={idPrefix}
            onChange={(e) => setIdPrefix(e.target.value.toUpperCase())}
            placeholder="ID Prefix"
            className="form-control"
            style={{ width: 90 }}
          />
          <button type="button" onClick={autoFillIds} className="btn btn-ghost btn-sm" title="Auto-generate empty ID fields">
            <RefreshCw size={14} /> Auto IDs
          </button>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button type="button" onClick={saveDraft} className="btn btn-ghost btn-sm">
            <Save size={14} /> {draftSaved ? 'Saved!' : 'Save Draft'}
          </button>
          <button type="button" onClick={clearDraft} className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }}>
            <Trash2 size={14} /> Clear
          </button>
        </div>
      </div>

      {globalError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 12, color: '#dc2626', fontSize: 13 }}>
          <AlertCircle size={15} /> {globalError}
        </div>
      )}

      {/* Tip */}
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
        💡 <strong>Tip:</strong> Use <kbd style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: 3, fontFamily: 'monospace' }}>Tab</kbd> to move between cells · Paste from Excel with <kbd style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: 3, fontFamily: 'monospace' }}>Ctrl+V</kbd>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
        <table ref={tableRef} style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ width: 36, padding: '8px 6px', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontWeight: 600, textAlign: 'center' }}>#</th>
              {BULK_COLS.map((col) => {
                const fl = orgRules?.fieldLabels;
                const colLabel = (fl && fl[col]) ? fl[col]
                  : col === 'idNumber' ? 'ID Number'
                  : col.charAt(0).toUpperCase() + col.slice(1);
                return (
                  <th key={col} style={{ width: COL_WIDTHS[col], padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#374151', fontWeight: 600, textAlign: 'left' }}>
                    {colLabel}
                    {col === 'name' && <span style={{ color: '#ef4444' }}> *</span>}
                  </th>
                );
              })}
              <th style={{ width: 36, padding: '8px 6px', borderBottom: '1px solid #e5e7eb' }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => {
              const hasError = errors.includes(ri);
              return (
                <tr key={row._id} style={{ background: hasError ? '#fef2f2' : ri % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '4px 6px', borderBottom: '1px solid #f3f4f6', textAlign: 'center', color: '#9ca3af', fontSize: 11 }}>
                    {hasError ? <AlertCircle size={13} color="#ef4444" /> : ri + 1}
                  </td>
                  {BULK_COLS.map((col, ci) => (
                    <td key={col} style={{ padding: '2px 4px', borderBottom: '1px solid #f3f4f6' }}>
                      <input
                        data-cell={`${ri}-${ci}`}
                        value={row[col]}
                        onChange={(e) => setCell(ri, col, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, ri, ci)}
                        onPaste={(e) => handlePaste(e, ri, ci)}
                        placeholder={col === 'name' ? 'Required' : ''}
                        style={{
                          width: '100%', border: 'none', outline: 'none', background: 'transparent',
                          padding: '5px 6px', fontSize: 13,
                          borderRadius: 4,
                          boxShadow: hasError && col === 'name' && !row.name.trim() ? 'inset 0 0 0 1px #ef4444' : 'none',
                        }}
                        onFocus={(e) => (e.target.style.background = '#eff6ff')}
                        onBlur={(e) => (e.target.style.background = 'transparent')}
                      />
                    </td>
                  ))}
                  <td style={{ padding: '2px 6px', borderBottom: '1px solid #f3f4f6', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => removeRow(ri)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', padding: 2 }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#d1d5db')}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add row */}
      <button type="button" onClick={addRow} className="btn btn-ghost btn-sm" style={{ marginTop: 8, color: '#748ffc' }}>
        <Plus size={14} /> Add Row
      </button>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || filledCount === 0}
          className="btn btn-primary"
        >
          {loading
            ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving…</>
            : <><Download size={15} /> Save {filledCount > 0 ? `${filledCount} Record${filledCount > 1 ? 's' : ''}` : 'Records'}</>
          }
        </button>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>{filledCount} of {rows.length} rows filled · Draft auto-saved</span>
      </div>
    </div>
  );
}

// ─── Success Panel ────────────────────────────────────────────────────────────
function SuccessPanel({ result, isBulk, onAddMore, onGoToRecords }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
        <CheckCircle2 size={36} color="#22c55e" />
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
        {isBulk ? `${result.inserted} Records Saved!` : 'Record Saved!'}
      </h2>
      <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 32px' }}>
        {isBulk
          ? `Batch "${result.batchId}" created with ${result.inserted} records.`
          : `"${result.name}" (${result.idNumber || 'no ID'}) added successfully.`
        }
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button onClick={onAddMore} className="btn btn-ghost">
          <Plus size={15} /> Add More
        </button>
        <button onClick={onGoToRecords} className="btn btn-primary">
          View Records <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ManualEntryPage() {
  const navigate = useNavigate();
  const { organization } = useAuth();
  const orgRules = getOrgRules(organization?.type);
  const [mode, setMode] = useState('single'); // 'single' | 'bulk'
  const [success, setSuccess] = useState(null); // { result, isBulk }

  const handleSuccess = (result, isBulk = false) => setSuccess({ result, isBulk });
  const handleAddMore = () => setSuccess(null);

  const Tab = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => { setMode(id); setSuccess(null); }}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
        border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: mode === id ? 700 : 400,
        borderBottom: mode === id ? '2px solid #748ffc' : '2px solid transparent',
        color: mode === id ? '#748ffc' : '#6b7280', background: 'none',
        transition: 'all .15s',
      }}
    >
      <Icon size={16} /> {label}
    </button>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>Manual Entry</h1>
          <p style={{ color: '#6b7280', fontSize: 14, margin: '4px 0 0' }}>
            Add individual records or enter multiple records in a spreadsheet-like table
          </p>
        </div>
        <span style={{ background: '#edf2ff', color: '#3b5bdb', fontSize: 13, fontWeight: 600, padding: '5px 12px', borderRadius: 20, whiteSpace: 'nowrap', alignSelf: 'center' }}>
          {orgRules.emoji} {orgRules.label}
        </span>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', padding: '0 8px' }}>
          <Tab id="single" icon={UserPlus} label="Single Entry" />
          <Tab id="bulk"   icon={Table2}   label="Bulk Table Entry" />
        </div>

        {/* Content */}
        <div style={{ padding: 28 }}>
          {success ? (
            <SuccessPanel
              result={success.result}
              isBulk={success.isBulk}
              onAddMore={handleAddMore}
              onGoToRecords={() => navigate('/records')}
            />
          ) : mode === 'single' ? (
            <SingleForm onSuccess={(r) => handleSuccess(r, false)} orgRules={orgRules} />
          ) : (
            <BulkTable onSuccess={(r) => handleSuccess(r, true)} orgRules={orgRules} />
          )}
        </div>
      </div>
    </div>
  );
}
