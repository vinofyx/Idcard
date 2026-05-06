import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/client';
import toast from 'react-hot-toast';
import {
  Search, Download, Trash2, RefreshCw, FileText,
  ChevronLeft, ChevronRight, Edit3, X, Camera, Save,
  Layout, ExternalLink, CheckSquare, ChevronDown, Palette, Eye,
} from 'lucide-react';

// ── Single style button (used inside TemplatePicker) ─────────────────────────
function StyleButton({ t, selected, onChange, setOpen, portrait }) {
  const isSelected = t._id === selected || (!selected && t.isDefault);
  const accent = t.previewColor || '#748ffc';
  return (
    <button
      onClick={() => { onChange(t._id); setOpen(false); }}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
        border: `2px solid ${isSelected ? accent : '#e9ecef'}`,
        borderRadius: 8, cursor: 'pointer', background: isSelected ? '#f8f9ff' : '#fff',
        transition: 'all .15s', textAlign: 'left',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = isSelected ? accent : '#dee2e6'; e.currentTarget.style.background = '#f8f9fa'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = isSelected ? accent : '#e9ecef'; e.currentTarget.style.background = isSelected ? '#f8f9ff' : '#fff'; }}
    >
      {/* Mini card thumbnail */}
      {portrait ? (
        // Portrait: tall thumbnail
        <div style={{ width: 22, height: 32, borderRadius: 3, flexShrink: 0, overflow: 'hidden', border: '1px solid rgba(0,0,0,.08)' }}>
          <div style={{ width: '100%', height: '35%', background: accent }} />
          <div style={{ padding: '2px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#e5e7eb' }} />
            <div style={{ width: '90%', height: 1.5, background: '#d1d5db', borderRadius: 1 }} />
            <div style={{ width: '70%', height: 1.5, background: '#e5e7eb', borderRadius: 1 }} />
          </div>
        </div>
      ) : (
        // Landscape: wide thumbnail
        <div style={{ width: 36, height: 24, borderRadius: 3, flexShrink: 0, overflow: 'hidden', border: '1px solid rgba(0,0,0,.08)' }}>
          <div style={{ width: '100%', height: '38%', background: accent }} />
          <div style={{ padding: '2px 3px', display: 'flex', gap: 2 }}>
            <div style={{ width: 8, height: 8, borderRadius: 1, background: '#e5e7eb' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <div style={{ height: 2, background: '#d1d5db', borderRadius: 1 }} />
              <div style={{ height: 1.5, background: '#e5e7eb', borderRadius: 1, width: '70%' }} />
            </div>
          </div>
        </div>
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: '#212529', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
        {t.isDefault && <div style={{ fontSize: 9.5, color: '#adb5bd' }}>Default</div>}
      </div>
      {isSelected && (
        <div style={{ marginLeft: 'auto', width: 15, height: 15, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>✓</span>
        </div>
      )}
    </button>
  );
}

// ── Template style picker ─────────────────────────────────────────────────────
function TemplatePicker({ templates, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = templates.find((t) => t._id === selected) || templates.find((t) => t.isDefault) || templates[0];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
          border: '1px solid #dee2e6', borderRadius: 8, background: '#fff',
          cursor: 'pointer', fontSize: 13, color: '#495057', minWidth: 200,
          boxShadow: open ? '0 0 0 3px rgba(116,143,252,.15)' : 'none',
        }}
      >
        <Palette size={14} color="#868e96" />
        <div
          style={{
            width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
            background: current?.previewColor || '#1e2a4a',
          }}
        />
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {current?.name || 'Select style'}
        </span>
        <ChevronDown size={13} color="#adb5bd" />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 200, marginTop: 6,
          background: '#fff', border: '1px solid #e9ecef', borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,.12)', padding: 12, width: 340,
        }}>
          <div style={{ fontSize: 11, color: '#adb5bd', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
            Choose Card Style
          </div>

          {/* Landscape section */}
          {templates.some((t) => !t.cardStyle?.startsWith('portrait')) && (
            <div style={{ fontSize: 10, color: '#ced4da', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
              ↔ Landscape
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {templates.filter((t) => !t.cardStyle?.startsWith('portrait')).map((t) => (
              <StyleButton key={t._id} t={t} selected={selected} onChange={onChange} setOpen={setOpen} portrait={false} />
            ))}
          </div>

          {/* Portrait section */}
          {templates.some((t) => t.cardStyle?.startsWith('portrait')) && (
            <div style={{ fontSize: 10, color: '#ced4da', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', margin: '12px 0 6px' }}>
              ↕ Portrait
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {templates.filter((t) => t.cardStyle?.startsWith('portrait')).map((t) => (
              <StyleButton key={t._id} t={t} selected={selected} onChange={onChange} setOpen={setOpen} portrait={true} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RecordsPage() {
  const [searchParams] = useSearchParams();
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState({});
  const [batchId] = useState(searchParams.get('batchId') || '');
  const [selected, setSelected] = useState(new Set());
  const [downloadingSelected, setDownloadingSelected] = useState(false);

  // Job-based bulk progress
  const [job, setJob] = useState(null); // { jobId, total, current, percent, status, label }
  const jobPollRef = useRef(null);

  // Template picker state
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // Edit modal state
  const [editRecord, setEditRecord] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef();

  useEffect(() => {
    fetchRecords(1, '');
    api.get('/templates').then(({ data }) => {
      setTemplates(data);
      const def = data.find((t) => t.isDefault);
      if (def) setSelectedTemplate(def._id);
    }).catch(() => {});
  }, [batchId]);

  const fetchRecords = async (p = 1, q = search) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 15, ...(batchId && { batchId }), ...(q && { search: q }) };
      const { data } = await api.get('/records', { params });
      setRecords(data.records);
      setTotal(data.total);
      setPages(data.pages);
      setPage(p);
    } catch { toast.error('Failed to load records'); }
    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchRecords(1, search);
  };

  // When responseType:'blob' and server returns a JSON error, data is a Blob — parse it
  const blobErrMsg = async (err) => {
    try {
      if (err.response?.data instanceof Blob) {
        const text = await err.response.data.text();
        return JSON.parse(text).message || 'Request failed';
      }
    } catch {}
    return err.response?.data?.message || err.message || 'Request failed';
  };

  const downloadSingle = async (record) => {
    setGenerating((g) => ({ ...g, [record._id]: true }));
    try {
      const res = await api.post(
        `/pdf/single/${record._id}`,
        { templateId: selectedTemplate || undefined },
        { responseType: 'blob' }
      );
      triggerDownload(res.data, `ID_${record.name.replace(/\s+/g, '_')}.pdf`);
      toast.success('ID card downloaded!');
      setRecords((prev) => prev.map((r) => r._id === record._id ? { ...r, status: 'generated' } : r));
    } catch (err) {
      toast.error(await blobErrMsg(err));
    }
    setGenerating((g) => ({ ...g, [record._id]: false }));
  };

  const triggerDownload = (data, filename) => {
    const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Job-based bulk download with real-time progress ──────────────────────────
  const startBulkJob = async ({ recordIds, batchId: bid, label }) => {
    if (jobPollRef.current) clearInterval(jobPollRef.current);
    try {
      const body = { templateId: selectedTemplate || undefined };
      if (recordIds) body.recordIds = recordIds;
      if (bid) body.batchId = bid;
      const { data } = await api.post('/pdf/jobs', body);
      const { jobId, total } = data;
      setJob({ jobId, total, current: 0, percent: 0, status: 'processing', label });

      // Poll every 600ms
      jobPollRef.current = setInterval(async () => {
        try {
          const { data: progress } = await api.get(`/pdf/jobs/${jobId}`);
          setJob((j) => ({ ...j, ...progress }));
          if (progress.status === 'done') {
            clearInterval(jobPollRef.current);
            // Auto-download
            const res = await api.get(`/pdf/jobs/${jobId}/download`, { responseType: 'blob' });
            triggerDownload(res.data, `IDCards_${Date.now()}.pdf`);
            toast.success(`${progress.current} ID cards downloaded!`);
            setSelected(new Set());
            fetchRecords(page);
            setTimeout(() => setJob(null), 2000);
          } else if (progress.status === 'error') {
            clearInterval(jobPollRef.current);
            toast.error(progress.error || 'Generation failed');
            setTimeout(() => setJob(null), 3000);
          }
        } catch {
          clearInterval(jobPollRef.current);
          setJob(null);
        }
      }, 600);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start job');
    }
  };

  const downloadBatch = () => {
    if (!batchId) return;
    startBulkJob({ batchId, label: `Batch …${batchId.slice(-6)}` });
  };

  const openEdit = (r) => {
    setEditRecord(r);
    setEditForm({
      name: r.name || '',
      idNumber: r.idNumber || '',
      department: r.department || '',
      designation: r.designation || '',
      email: r.email || '',
      phone: r.phone || '',
      photoUrl: r.photoUrl || '',
    });
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const { data } = await api.put(`/records/${editRecord._id}`, editForm);
      setRecords((prev) => prev.map((r) => r._id === data._id ? data : r));
      setEditRecord(null);
      toast.success('Record updated');
    } catch { toast.error('Save failed'); }
    setSaving(false);
  };

  const uploadPhoto = async (file) => {
    if (!file || !editRecord) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const { data } = await api.post(`/records/${editRecord._id}/photo`, fd);
      setEditForm((f) => ({ ...f, photoUrl: data.photoUrl }));
      setRecords((prev) => prev.map((r) => r._id === editRecord._id ? { ...r, photoUrl: data.photoUrl } : r));
      toast.success('Photo uploaded');
    } catch { toast.error('Photo upload failed'); }
    setUploadingPhoto(false);
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === records.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(records.map((r) => r._id)));
    }
  };

  const downloadSelected = () => {
    if (!selected.size) return;
    startBulkJob({ recordIds: [...selected], label: `${selected.size} selected records` });
  };

  const previewCard = async (record) => {
    setGenerating((g) => ({ ...g, [`prev_${record._id}`]: true }));
    try {
      const params = selectedTemplate ? { templateId: selectedTemplate } : {};
      const { data } = await api.get(`/pdf/preview/${record._id}`, { params });
      const blob = new Blob([data], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) toast.error('Pop-up blocked — please allow pop-ups for this site');
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      toast.error('Preview failed');
    }
    setGenerating((g) => ({ ...g, [`prev_${record._id}`]: false }));
  };

  const downloadAllPage = () => {
    if (!records.length) return;
    startBulkJob({ recordIds: records.map((r) => r._id), label: `All ${records.length} on this page` });
  };

  const deleteRecord = async (id) => {
    if (!confirm('Delete this record? This cannot be undone.')) return;
    try {
      await api.delete(`/records/${id}`);
      toast.success('Record deleted');
      fetchRecords(page);
    } catch { toast.error('Delete failed'); }
  };

  // Uses Vite proxy: /verify → localhost:5000/verify
  const verifyUrl = (id) => `${window.location.origin}/verify/${id}`;

  return (
    <div>
      <div className="page-header">
        <h1>Records {total > 0 && <span style={{ color: '#868e96', fontWeight: 400, fontSize: 18 }}>({total})</span>}</h1>
        <p>{batchId ? `Batch: …${batchId.slice(-10)}` : 'All imported records'}</p>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: 1, minWidth: 220 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }} />
            <input className="form-control" style={{ paddingLeft: 32 }} placeholder="Search name, ID, email…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-secondary">Search</button>
        </form>

        {/* Template style picker — always visible; shows skeleton while loading */}
        {templates.length > 0 ? (
          <TemplatePicker
            templates={templates}
            selected={selectedTemplate}
            onChange={setSelectedTemplate}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', border: '1px solid #dee2e6', borderRadius: 8, background: '#f8f9fa', color: '#adb5bd', fontSize: 13, minWidth: 180 }}>
            <Palette size={14} /> Loading styles…
          </div>
        )}

        <button className="btn btn-secondary btn-sm" onClick={() => fetchRecords(page)}>
          <RefreshCw size={14} /> Refresh
        </button>

        {/* Download buttons */}
        {selected.size > 0 ? (
          <button className="btn btn-primary btn-sm" onClick={downloadSelected} disabled={downloadingSelected}>
            {downloadingSelected
              ? <span className="spinner" style={{ width: 13, height: 13, borderTopColor: '#fff' }} />
              : <Download size={14} />}
            Download {selected.size} Selected
          </button>
        ) : (
          <>
            {batchId && (
              <button className="btn btn-primary btn-sm" onClick={downloadBatch}>
                <Download size={14} /> Download Batch
              </button>
            )}
            {records.length > 0 && (
              <button className="btn btn-primary btn-sm" onClick={downloadAllPage} disabled={downloadingSelected}>
                {downloadingSelected
                  ? <span className="spinner" style={{ width: 13, height: 13, borderTopColor: '#fff' }} />
                  : <Download size={14} />}
                Download All ({records.length})
              </button>
            )}
          </>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}><span className="spinner" /></div>
        ) : records.length === 0 ? (
          <div className="empty-state" style={{ padding: 48 }}>
            <FileText size={40} />
            <p>No records found.</p>
            <Link to="/upload" className="btn btn-primary" style={{ marginTop: 12, display: 'inline-flex' }}>Upload Data</Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      checked={selected.size === records.length && records.length > 0}
                      onChange={toggleSelectAll}
                      title="Select all"
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th>Name</th><th>ID Number</th><th>Dept / Class</th>
                  <th>Contact</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r._id} style={{ background: selected.has(r._id) ? '#edf2ff' : undefined }}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(r._id)}
                        onChange={() => toggleSelect(r._id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {r.photoUrl
                          ? <img src={r.photoUrl} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                          : <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#868e96', flexShrink: 0 }}>{r.name[0]?.toUpperCase()}</div>}
                        <div>
                          <div style={{ fontWeight: 500, lineHeight: 1.3 }}>{r.name}</div>
                          {r.designation && <div style={{ fontSize: 11, color: '#868e96' }}>{r.designation}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{r.idNumber || '—'}</td>
                    <td style={{ fontSize: 13 }}>{r.department || '—'}</td>
                    <td style={{ fontSize: 12, color: '#868e96', lineHeight: 1.6 }}>
                      {r.email && <div>{r.email}</div>}
                      {r.phone && <div>{r.phone}</div>}
                      {!r.email && !r.phone && '—'}
                    </td>
                    <td>
                      <span className={`badge badge-${r.status === 'generated' ? 'success' : r.status === 'error' ? 'danger' : 'warning'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)} title="Edit record">
                          <Edit3 size={13} />
                        </button>
                        {/* Preview card in browser */}
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => previewCard(r)}
                          disabled={generating[`prev_${r._id}`]}
                          title="Preview ID card"
                          style={{ color: '#748ffc' }}
                        >
                          {generating[`prev_${r._id}`]
                            ? <span className="spinner" style={{ width: 13, height: 13 }} />
                            : <Eye size={13} />}
                        </button>
                        {/* Download PDF */}
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => downloadSingle(r)}
                          disabled={generating[r._id]}
                          title="Download ID card PDF"
                        >
                          {generating[r._id]
                            ? <span className="spinner" style={{ width: 13, height: 13, borderTopColor: '#fff' }} />
                            : <Download size={13} />}
                          {generating[r._id] ? '…' : 'PDF'}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteRecord(r._id)} title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => fetchRecords(page - 1)} disabled={page === 1}><ChevronLeft size={15} /></button>
            <span style={{ fontSize: 13, color: '#868e96' }}>Page {page} of {pages}</span>
            <button className="btn btn-secondary btn-sm" onClick={() => fetchRecords(page + 1)} disabled={page === pages}><ChevronRight size={15} /></button>
          </div>
        )}
      </div>

      {/* ── Bulk Generation Progress Modal ─────────────────────────────────── */}
      {job && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 420, boxShadow: '0 24px 64px rgba(0,0,0,.3)', textAlign: 'center' }}>
            {/* Animated icon */}
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: job.status === 'done' ? '#f0fdf4' : job.status === 'error' ? '#fef2f2' : '#edf2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>
              {job.status === 'done' ? '✅' : job.status === 'error' ? '❌' : '⚙️'}
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>
              {job.status === 'done' ? 'Download Ready!' : job.status === 'error' ? 'Generation Failed' : 'Generating ID Cards…'}
            </h2>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 24px' }}>
              {job.status === 'processing' ? `${job.label} · ${job.current} of ${job.total} cards done` : job.status === 'done' ? 'Your download will start automatically' : job.error || 'An error occurred'}
            </p>
            {/* Progress bar */}
            <div style={{ height: 10, background: '#e9ecef', borderRadius: 5, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ height: '100%', width: `${job.percent || 0}%`, background: job.status === 'error' ? '#ef4444' : job.status === 'done' ? '#22c55e' : 'linear-gradient(90deg,#748ffc,#5c7cfa)', borderRadius: 5, transition: 'width .4s ease' }} />
            </div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 20 }}>
              {job.percent || 0}% · {job.failed > 0 ? `${job.failed} failed` : 'Processing…'}
            </div>
            {job.status !== 'processing' && (
              <button onClick={() => setJob(null)} className="btn btn-ghost">Close</button>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editRecord && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={(e) => { if (e.target === e.currentTarget) setEditRecord(null); }}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
            {/* Modal header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>Edit Record</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditRecord(null)}><X size={16} /></button>
            </div>

            <div style={{ padding: 24 }}>
              {/* Photo upload */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div style={{ position: 'relative' }}>
                  {editForm.photoUrl
                    ? <img src={editForm.photoUrl} alt="" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
                    : <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: '#868e96' }}>{editForm.name?.[0]?.toUpperCase() || '?'}</div>}
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    style={{ position: 'absolute', bottom: 0, right: 0, background: '#3b5bdb', border: 'none', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    title="Upload photo"
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? <span className="spinner" style={{ width: 10, height: 10, borderTopColor: '#fff' }} /> : <Camera size={12} color="#fff" />}
                  </button>
                  <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => uploadPhoto(e.target.files?.[0])} />
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{editForm.name}</div>
                  <div style={{ fontSize: 12, color: '#868e96', marginTop: 2 }}>Click the camera icon to upload a photo</div>
                  {editForm.photoUrl && (
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '2px 6px', marginTop: 4, color: '#e03131' }} onClick={() => setEditForm((f) => ({ ...f, photoUrl: '' }))}>Remove photo</button>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-control" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">ID / Roll Number</label>
                  <input className="form-control" value={editForm.idNumber} onChange={(e) => setEditForm((f) => ({ ...f, idNumber: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Department / Class</label>
                  <input className="form-control" value={editForm.department} onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Designation / Post</label>
                  <input className="form-control" value={editForm.designation} onChange={(e) => setEditForm((f) => ({ ...f, designation: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-control" type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-control" value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button className="btn btn-secondary" onClick={() => setEditRecord(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveEdit} disabled={saving || !editForm.name}>
                  {saving ? <span className="spinner" style={{ width: 15, height: 15, borderTopColor: '#fff' }} /> : <Save size={15} />} Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
