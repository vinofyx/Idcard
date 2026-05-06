import { useEffect, useState, useRef, useLayoutEffect, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getOrgRules } from '../utils/orgRules';
import toast from 'react-hot-toast';
import {
  Plus, Trash2, Star, Edit3, Save, X,
  ChevronUp, ChevronDown, Copy,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────
const EL_DEFAULTS = {
  text:  { field: 'name',    fontSize: 18, fontWeight: 'bold',   color: '#212121', prefix: '', italic: false },
  image: { field: 'photoUrl', width: 100,  height: 100, rounded: false },
  rect:  { width: 856, height: 8, color: '#3b5bdb', radius: 0 },
  line:  { width: 300, thickness: 2, color: '#cccccc' },
  qr:    { field: 'qrCode',  width: 90,   height: 90 },
};

const FIELD_OPTIONS = [
  { value: 'name',        label: 'Name' },
  { value: 'idNumber',    label: 'ID Number' },
  { value: 'department',  label: 'Department' },
  { value: 'designation', label: 'Designation' },
  { value: 'email',       label: 'Email' },
  { value: 'phone',       label: 'Phone' },
  { value: 'photoUrl',    label: 'Photo' },
  { value: 'orgName',     label: 'Organization Name' },
  { value: 'orgLogo',     label: 'Org Logo' },
  { value: 'issueDate',   label: 'Issue Date' },
  { value: 'expiryDate',  label: 'Expiry Date' },
];

const SAMPLE = {
  name: 'Ravi Kumar', idNumber: 'S-2024-001', department: 'Class 10-A',
  designation: 'Student', email: 'ravi@school.edu', phone: '9876543210',
  issueDate: '01 Jan 2025', expiryDate: '01 Jan 2026',
};

const STYLE_COLORS = {
  'classic-blue':  '#1e3a8a',
  'minimal-white': '#ffffff',
  'modern-dark':   '#1a1a2e',
};

const STYLE_LABELS = {
  'classic-blue':  'Classic Blue',
  'minimal-white': 'Minimal White',
  'modern-dark':   'Modern Dark',
};

function getOrgRecommendation(orgType) {
  const rules = getOrgRules(orgType);
  return {
    previewColor: STYLE_COLORS[rules.templateStyle] ?? '#1e2a4a',
    styleName:    STYLE_LABELS[rules.templateStyle] ?? rules.templateStyle,
    orgLabel:     rules.label,
  };
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TemplatePage() {
  const { organization } = useAuth();
  const [templates, setTemplates]   = useState([]);
  const [editing,   setEditing]     = useState(null);
  const [creating,  setCreating]    = useState(false);
  const [newName,   setNewName]     = useState('');
  const [loading,   setLoading]     = useState(true);
  const [saving,    setSaving]      = useState(false);

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/templates');
      setTemplates(data);
    } catch { toast.error('Failed to load templates'); }
    setLoading(false);
  };

  const createTemplate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const { previewColor } = getOrgRecommendation(organization?.type);
      const { data } = await api.post('/templates', { name: newName.trim(), previewColor });
      setTemplates([data, ...templates]);
      setNewName('');
      setCreating(false);
      setEditing(data);
      toast.success('Template created — start designing!');
    } catch { toast.error('Failed to create template'); }
    setSaving(false);
  };

  const saveTemplate = async () => {
    setSaving(true);
    try {
      const { data } = await api.put(`/templates/${editing._id}`, editing);
      setTemplates(templates.map((t) => (t._id === data._id ? data : t)));
      setEditing(null);
      toast.success('Template saved!');
    } catch { toast.error('Save failed'); }
    setSaving(false);
  };

  const deleteTemplate = async (id) => {
    if (!confirm('Delete this template?')) return;
    try {
      await api.delete(`/templates/${id}`);
      setTemplates(templates.filter((t) => t._id !== id));
      toast.success('Deleted');
    } catch { toast.error('Delete failed'); }
  };

  const setDefault = async (id) => {
    try {
      await api.put(`/templates/${id}/set-default`);
      setTemplates(templates.map((t) => ({ ...t, isDefault: t._id === id })));
      toast.success('Default template updated');
    } catch { toast.error('Failed'); }
  };

  // ── Editor view ──
  if (editing) {
    return (
      <TemplateEditor
        template={editing}
        organization={organization}
        onChange={setEditing}
        onSave={saveTemplate}
        onCancel={() => setEditing(null)}
        saving={saving}
      />
    );
  }

  // ── Grid view ──
  return (
    <div>
      <div className="page-header">
        <h1>Templates</h1>
        <p>Design ID card layouts — drag elements, set colors, preview live</p>
      </div>

      <div style={{ marginBottom: 24 }}>
        {creating ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="form-control" style={{ maxWidth: 300 }}
              placeholder="Template name e.g. Student ID 2025"
              value={newName} onChange={(e) => setNewName(e.target.value)}
              autoFocus onKeyDown={(e) => e.key === 'Enter' && createTemplate()}
            />
            <button className="btn btn-primary" onClick={createTemplate} disabled={saving || !newName.trim()}>
              {saving ? <span className="spinner" style={{ width: 15, height: 15, borderTopColor: '#fff' }} /> : 'Create & Edit'}
            </button>
            <button className="btn btn-secondary" onClick={() => setCreating(false)}>Cancel</button>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            <Plus size={15} /> New Template
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><span className="spinner" /></div>
      ) : templates.length === 0 ? (
        <div className="card empty-state">
          <Edit3 size={40} />
          <p>No templates yet. Create your first one.</p>
          {organization?.type && (() => {
            const { styleName, orgLabel } = getOrgRecommendation(organization.type);
            return (
              <p style={{ fontSize: 13, color: '#3b5bdb', marginTop: 6 }}>
                We recommend the <strong>'{styleName}'</strong> style for {orgLabel}s
              </p>
            );
          })()}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {templates.map((t, i) => (
            <TemplateCard
              key={t._id}
              template={t}
              organization={organization}
              isFirst={i === 0}
              onEdit={() => setEditing(t)}
              onDelete={() => deleteTemplate(t._id)}
              onSetDefault={() => setDefault(t._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Template Card (grid thumbnail) ────────────────────────────────────────────
function TemplateCard({ template, organization, isFirst, onEdit, onDelete, onSetDefault }) {
  const { name, elements = [], width = 856, height = 540, isDefault } = template;
  const [hover, setHover] = useState(false);

  const rec = isFirst && organization?.type ? getOrgRecommendation(organization.type) : null;

  return (
    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
      {isDefault && (
        <span className="badge badge-success" style={{ position: 'absolute', top: 12, right: 12, zIndex: 3 }}>
          <Star size={11} style={{ marginRight: 3 }} />Default
        </span>
      )}
      {rec && !isDefault && (
        <span style={{
          position: 'absolute', top: 12, right: 12, zIndex: 3,
          background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe',
          borderRadius: 12, fontSize: 11, fontWeight: 600, padding: '3px 9px',
        }}>
          Recommended for {rec.orgLabel}s
        </span>
      )}

      {/* Thumbnail */}
      <div
        style={{ height: 155, overflow: 'hidden', marginBottom: 14, borderRadius: 8, border: '1px solid #e9ecef', background: '#f0f2f5', position: 'relative', cursor: 'pointer' }}
        onClick={onEdit}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <CardThumbnail template={template} orgName={organization?.name} orgLogo={organization?.logo} />
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(59,91,219,0.12)', opacity: hover ? 1 : 0, transition: 'opacity .2s',
        }}>
          <div style={{ background: '#3b5bdb', color: '#fff', fontSize: 13, fontWeight: 600, padding: '7px 20px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Edit3 size={13} /> Edit Design
          </div>
        </div>
      </div>

      <h3 style={{ fontWeight: 600, marginBottom: 4, fontSize: 15 }}>{name}</h3>
      <p style={{ fontSize: 12, color: '#868e96', marginBottom: 14 }}>
        {elements.length} elements · {width}×{height}px
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button className="btn btn-primary btn-sm" onClick={onEdit}><Edit3 size={13} /> Edit</button>
        {!isDefault && (
          <button className="btn btn-secondary btn-sm" onClick={onSetDefault}><Star size={13} /> Set Default</button>
        )}
        <button className="btn btn-danger btn-sm" onClick={onDelete}><Trash2 size={13} /></button>
      </div>
    </div>
  );
}

// ── Card Thumbnail (scaled preview for grid) ──────────────────────────────────
function CardThumbnail({ template, orgName, orgLogo }) {
  const { width = 856, height = 540, backgroundColor = '#ffffff', elements = [], backgroundImage, layout, previewColor, cardStyle } = template;

  // Classic builtin templates: show a rich schematic preview
  if (layout === 'classic' && elements.length === 0) {
    return <ClassicSchemaThumbnail previewColor={previewColor || '#1e2a4a'} isPortrait={cardStyle?.startsWith('portrait')} />;
  }

  // Elements-based: render actual elements at scale
  const thumbW = 298, thumbH = 145;
  const scale  = Math.min(thumbW / width, thumbH / height);
  const scaledW = width * scale;
  const scaledH = height * scale;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: scaledW, height: scaledH, overflow: 'hidden', position: 'relative', boxShadow: '0 2px 10px rgba(0,0,0,.15)', borderRadius: 4 }}>
        <div style={{
          width, height, background: backgroundColor, position: 'absolute', top: 0, left: 0,
          transform: `scale(${scale})`, transformOrigin: 'top left', overflow: 'hidden',
        }}>
          {backgroundImage && (
            <img src={backgroundImage} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
          {elements.map((el) => (
            <StaticElement key={el.id} el={el} sample={{ ...SAMPLE, orgName: orgName || 'Your Organization', orgLogo: orgLogo || '' }} />
          ))}
          {elements.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 11, color: '#adb5bd' }}>No elements yet</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Schematic preview for classic builtin templates ───────────────────────────
function ClassicSchemaThumbnail({ previewColor, isPortrait }) {
  const accent = previewColor;

  if (isPortrait) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eef0f3' }}>
        <div style={{ width: 68, height: 100, background: '#fff', borderRadius: 5, overflow: 'hidden', boxShadow: '0 3px 12px rgba(0,0,0,.18)' }}>
          {/* Header */}
          <div style={{ height: 30, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'rgba(255,255,255,.25)' }} />
          </div>
          {/* Photo placeholder */}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '5px 0 3px' }}>
            <div style={{ width: 20, height: 22, borderRadius: 3, background: '#e5e7eb' }} />
          </div>
          {/* Text lines */}
          <div style={{ padding: '0 7px', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <div style={{ height: 3.5, background: accent, borderRadius: 2, width: '80%', margin: '0 auto' }} />
            <div style={{ height: 2.5, background: '#e5e7eb', borderRadius: 2, width: '65%', margin: '0 auto' }} />
            <div style={{ height: 2, background: '#e5e7eb', borderRadius: 2, width: '55%', margin: '0 auto' }} />
          </div>
          {/* Bottom strip */}
          <div style={{ height: 3, background: accent, marginTop: 'auto', position: 'absolute', bottom: 0, width: '100%', opacity: 0.5 }} />
        </div>
      </div>
    );
  }

  // Landscape schematic
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eef0f3' }}>
      <div style={{ width: 160, height: 102, background: '#fff', borderRadius: 6, overflow: 'hidden', boxShadow: '0 3px 14px rgba(0,0,0,.18)' }}>
        {/* Header bar */}
        <div style={{ height: 34, background: accent, display: 'flex', alignItems: 'center', padding: '0 10px', gap: 6 }}>
          <div style={{ width: 18, height: 18, borderRadius: 4, background: 'rgba(255,255,255,.22)', flexShrink: 0 }} />
          <div>
            <div style={{ width: 52, height: 3, background: 'rgba(255,255,255,.8)', borderRadius: 2 }} />
            <div style={{ width: 36, height: 2, background: 'rgba(255,255,255,.4)', borderRadius: 2, marginTop: 3 }} />
          </div>
        </div>
        {/* Body */}
        <div style={{ padding: '7px 10px', display: 'flex', gap: 9 }}>
          {/* Photo */}
          <div style={{ width: 32, height: 38, borderRadius: 4, background: '#e5e7eb', flexShrink: 0 }} />
          {/* Text */}
          <div style={{ flex: 1, paddingTop: 2, display: 'flex', flexDirection: 'column', gap: 3.5 }}>
            <div style={{ height: 4, background: accent, borderRadius: 2, width: '85%' }} />
            <div style={{ height: 2.5, background: '#d1d5db', borderRadius: 2, width: '65%' }} />
            <div style={{ height: 2, background: '#e5e7eb', borderRadius: 2, width: '75%' }} />
            <div style={{ height: 2, background: '#e5e7eb', borderRadius: 2, width: '55%' }} />
          </div>
          {/* QR placeholder */}
          <div style={{ width: 24, height: 24, background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 2, flexShrink: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, padding: 3 }}>
            {[...Array(4)].map((_, i) => <div key={i} style={{ background: '#d1d5db', borderRadius: 1 }} />)}
          </div>
        </div>
        {/* Bottom accent */}
        <div style={{ height: 3, background: accent, opacity: 0.6 }} />
      </div>
    </div>
  );
}

// ── Template Editor (3-column designer) ───────────────────────────────────────
function TemplateEditor({ template, organization, onChange, onSave, onCancel, saving }) {
  const [selectedId, setSelectedId] = useState(null);

  const selectedEl = (template.elements || []).find((el) => el.id === selectedId) ?? null;

  const addElement = (type) => {
    const el = { id: `el_${Date.now()}`, type, x: 40, y: 40, ...EL_DEFAULTS[type] };
    onChange({ ...template, elements: [...(template.elements || []), el] });
    setSelectedId(el.id);
  };

  // Functional-update form avoids stale closures in DragCanvas's global mousemove
  const updateElement = useCallback((id, changes) => {
    onChange((prev) => ({
      ...prev,
      elements: (prev.elements || []).map((el) => (el.id === id ? { ...el, ...changes } : el)),
    }));
  }, [onChange]);

  const duplicateElement = (id) => {
    const src = (template.elements || []).find((el) => el.id === id);
    if (!src) return;
    const copy = { ...src, id: `el_${Date.now()}`, x: src.x + 16, y: src.y + 16 };
    onChange({ ...template, elements: [...(template.elements || []), copy] });
    setSelectedId(copy.id);
  };

  const removeElement = (id) => {
    onChange({ ...template, elements: (template.elements || []).filter((el) => el.id !== id) });
    if (selectedId === id) setSelectedId(null);
  };

  const moveLayer = (id, dir) => {
    const els = [...(template.elements || [])];
    const idx = els.findIndex((el) => el.id === id);
    const next = idx + dir;
    if (next < 0 || next >= els.length) return;
    [els[idx], els[next]] = [els[next], els[idx]];
    onChange({ ...template, elements: els });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) removeElement(selectedId);
      if (e.key === 'Escape') setSelectedId(null);
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedId) { e.preventDefault(); duplicateElement(selectedId); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId, template]); // eslint-disable-line react-hooks/exhaustive-deps

  const sample = { ...SAMPLE, orgName: organization?.name || 'Your Organization', orgLogo: organization?.logo || '' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>{template.name}</h1>
          <p style={{ fontSize: 13, color: '#868e96' }}>
            Click to select · Drag to move · <kbd style={{ background: '#f1f3f5', padding: '1px 5px', borderRadius: 3, fontSize: 11 }}>Del</kbd> remove · <kbd style={{ background: '#f1f3f5', padding: '1px 5px', borderRadius: 3, fontSize: 11 }}>Ctrl+D</kbd> duplicate
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={onCancel}><X size={15} /> Cancel</button>
          <button className="btn btn-primary" onClick={onSave} disabled={saving}>
            {saving
              ? <span className="spinner" style={{ width: 15, height: 15, borderTopColor: '#fff' }} />
              : <><Save size={15} /> Save Template</>
            }
          </button>
        </div>
      </div>

      {/* ── 3-column layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 272px', gap: 16, alignItems: 'start' }}>

        {/* ── LEFT: Add elements + Layers ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '.6px', marginBottom: 10 }}>ADD ELEMENT</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[
                { type: 'text',  emoji: '𝐓', label: 'Text / Label'  },
                { type: 'image', emoji: '🖼', label: 'Photo / Image'  },
                { type: 'qr',   emoji: '▦', label: 'QR Code'       },
                { type: 'rect', emoji: '■', label: 'Rectangle'     },
                { type: 'line', emoji: '—', label: 'Divider Line'  },
              ].map(({ type, emoji, label }) => (
                <button
                  key={type}
                  className="btn btn-secondary btn-sm"
                  style={{ justifyContent: 'flex-start', gap: 8, fontSize: 13 }}
                  onClick={() => addElement(type)}
                >
                  <span style={{ width: 18, textAlign: 'center', flexShrink: 0 }}>{emoji}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Layers */}
          <div className="card" style={{ padding: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '.6px', marginBottom: 10 }}>
              LAYERS ({(template.elements || []).length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 340, overflowY: 'auto' }}>
              {[...(template.elements || [])].reverse().map((el) => {
                const isSel = el.id === selectedId;
                return (
                  <div
                    key={el.id}
                    onClick={() => setSelectedId(isSel ? null : el.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
                      background: isSel ? '#edf2ff' : 'transparent',
                      border: `1px solid ${isSel ? '#3b5bdb' : 'transparent'}`,
                    }}
                  >
                    <span style={{ fontSize: 11, flex: 1, fontWeight: isSel ? 600 : 400, color: isSel ? '#3b5bdb' : '#495057', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {el.type.toUpperCase()}{el.field ? ` · ${el.field}` : ''}
                    </span>
                    <div style={{ display: 'flex', flexShrink: 0 }}>
                      {[
                        { dir: 1,  Icon: ChevronUp   },
                        { dir: -1, Icon: ChevronDown  },
                      ].map(({ dir, Icon }) => (
                        <button
                          key={dir}
                          onClick={(e) => { e.stopPropagation(); moveLayer(el.id, dir); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '1px 3px', color: '#9ca3af', lineHeight: 1 }}
                          title={dir > 0 ? 'Move up (forward)' : 'Move down (back)'}
                        >
                          <Icon size={12} />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {!(template.elements || []).length && (
                <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '14px 0' }}>No elements yet</p>
              )}
            </div>
          </div>
        </div>

        {/* ── CENTER: Drag canvas ── */}
        <div className="card" style={{ padding: 16, overflow: 'hidden' }}>
          <DragCanvas
            template={template}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMove={updateElement}
            sample={sample}
          />
        </div>

        {/* ── RIGHT: Properties ── */}
        <PropertiesPanel
          selectedEl={selectedEl}
          template={template}
          onElChange={(changes) => selectedId && updateElement(selectedId, changes)}
          onDuplicate={() => selectedId && duplicateElement(selectedId)}
          onRemove={() => selectedId && removeElement(selectedId)}
          onCardChange={(changes) => onChange({ ...template, ...changes })}
        />
      </div>
    </div>
  );
}

// ── Drag Canvas ───────────────────────────────────────────────────────────────
function DragCanvas({ template, selectedId, onSelect, onMove, sample }) {
  const containerRef = useRef(null);
  const dragging     = useRef(null);   // { elId, startMX, startMY, startEX, startEY }
  const scaleRef     = useRef(1);
  const onMoveRef    = useRef(onMove);
  const [containerW, setContainerW] = useState(680);
  const [hoveredId,  setHoveredId]  = useState(null);

  useLayoutEffect(() => { onMoveRef.current = onMove; }, [onMove]);

  // Measure container width for responsive scaling
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([entry]) => setContainerW(entry.contentRect.width));
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const { width = 856, height = 540, backgroundColor = '#ffffff', elements = [], backgroundImage } = template;
  const scale = Math.min((containerW - 2) / width, 1);
  scaleRef.current = scale;

  // Global mouse handlers — stable refs avoid stale closures
  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragging.current) return;
      const { elId, startMX, startMY, startEX, startEY } = dragging.current;
      const dx = (e.clientX - startMX) / scaleRef.current;
      const dy = (e.clientY - startMY) / scaleRef.current;
      onMoveRef.current(elId, {
        x: Math.max(0, Math.round(startEX + dx)),
        y: Math.max(0, Math.round(startEY + dy)),
      });
    };
    const onMouseUp = () => { dragging.current = null; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
    };
  }, []); // attach once; reads from refs for fresh values

  const handleElMouseDown = (e, el) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(el.id);
    dragging.current = { elId: el.id, startMX: e.clientX, startMY: e.clientY, startEX: el.x, startEY: el.y };
  };

  // Outline thickness compensation so it looks the same at any zoom level
  const outlineW = Math.max(1, Math.ceil(2 / scale));
  const outlineOff = Math.ceil(3 / scale);

  return (
    <div ref={containerRef} style={{ userSelect: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', marginBottom: 10 }}>
        <span>Canvas — {width} × {height} px</span>
        <span>{Math.round(scale * 100)}% zoom</span>
      </div>

      {/* Outer wrapper — sized to the SCALED dimensions so the card sits in-flow */}
      <div style={{ width: width * scale, height: height * scale, position: 'relative', boxShadow: '0 6px 28px rgba(0,0,0,.18)', borderRadius: 8, overflow: 'hidden' }}>

        {/* Inner card — rendered at full size then scaled down */}
        <div
          style={{
            width, height, background: backgroundColor,
            transform: `scale(${scale})`, transformOrigin: 'top left',
            position: 'absolute', top: 0, left: 0, overflow: 'hidden',
          }}
          onClick={() => onSelect(null)}  // click background = deselect
        >
          {backgroundImage && (
            <img
              src={backgroundImage} alt=""
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
            />
          )}

          {elements.map((el) => {
            const isSel  = el.id === selectedId;
            const isHov  = el.id === hoveredId && !isSel;
            return (
              <div
                key={el.id}
                style={{
                  position: 'absolute', left: el.x, top: el.y,
                  cursor: 'move',
                  outline: isSel
                    ? `${outlineW}px solid #3b5bdb`
                    : isHov ? `${outlineW}px dashed #748ffc` : 'none',
                  outlineOffset: isSel ? outlineOff : Math.ceil(2 / scale),
                  zIndex: isSel ? 999 : 'auto',
                }}
                onMouseDown={(e) => handleElMouseDown(e, el)}
                onMouseEnter={() => setHoveredId(el.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <StaticElement el={el} sample={sample} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Static Element Renderer (canvas + thumbnail) ──────────────────────────────
function StaticElement({ el, sample = {} }) {
  if (el.type === 'text') {
    const val = (el.prefix || '') + (sample[el.field] ?? el.field ?? '');
    return (
      <div style={{
        fontSize: el.fontSize || 16, fontWeight: el.fontWeight || 'normal',
        fontStyle: el.italic ? 'italic' : 'normal',
        color: el.color || '#000', whiteSpace: 'pre', lineHeight: 1.3,
        pointerEvents: 'none',
      }}>{val}</div>
    );
  }
  if (el.type === 'image') {
    const src = sample[el.field];
    const br  = el.rounded ? '50%' : 4;
    return src
      ? <img src={src} alt="" style={{ width: el.width || 100, height: el.height || 100, objectFit: 'cover', borderRadius: br, display: 'block', pointerEvents: 'none' }} />
      : (
        <div style={{ width: el.width || 100, height: el.height || 100, background: 'rgba(100,100,100,.15)', borderRadius: br, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <span style={{ fontSize: Math.min((el.height || 80) * 0.35, 28) }}>👤</span>
        </div>
      );
  }
  if (el.type === 'qr') {
    return (
      <div style={{ width: el.width || 90, height: el.height || 90, background: '#fff', border: '1px dashed #ccc', display: 'grid', placeItems: 'center', fontSize: 10, color: '#999', pointerEvents: 'none' }}>
        QR Code
      </div>
    );
  }
  if (el.type === 'rect') {
    return <div style={{ width: el.width || 200, height: el.height || 8, background: el.color || '#3b5bdb', borderRadius: el.radius || 0, pointerEvents: 'none' }} />;
  }
  if (el.type === 'line') {
    return <div style={{ width: el.width || 200, height: el.thickness || 2, background: el.color || '#ccc', pointerEvents: 'none' }} />;
  }
  return null;
}

// ── Properties Panel (right column) ──────────────────────────────────────────
function PropertiesPanel({ selectedEl, template, onElChange, onDuplicate, onRemove, onCardChange }) {
  // No element selected → show card settings
  if (!selectedEl) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="card" style={{ padding: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '.6px', marginBottom: 14 }}>CARD SETTINGS</p>

          <div className="form-group">
            <label className="form-label">Background Color</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="color" value={template.backgroundColor || '#ffffff'}
                onChange={(e) => onCardChange({ backgroundColor: e.target.value })}
                style={{ width: 38, height: 36, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', padding: 2 }}
              />
              <input className="form-control" value={template.backgroundColor || '#ffffff'}
                onChange={(e) => onCardChange({ backgroundColor: e.target.value })} style={{ flex: 1 }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Width (px)</label>
              <input className="form-control" type="number" min={200} max={2000}
                value={template.width || 856}
                onChange={(e) => onCardChange({ width: Number(e.target.value) })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Height (px)</label>
              <input className="form-control" type="number" min={100} max={2000}
                value={template.height || 540}
                onChange={(e) => onCardChange({ height: Number(e.target.value) })} />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 12, marginBottom: 0 }}>
            <label className="form-label">Background Image URL</label>
            <input className="form-control" type="url" placeholder="https://..."
              value={template.backgroundImage || ''}
              onChange={(e) => onCardChange({ backgroundImage: e.target.value })} />
            {template.backgroundImage && (
              <img src={template.backgroundImage} alt="" style={{ marginTop: 8, width: '100%', height: 60, objectFit: 'cover', borderRadius: 4, border: '1px solid #e9ecef' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            )}
          </div>
        </div>

        <div className="card" style={{ padding: 14, background: '#f8f9fa', border: '1px dashed #dee2e6' }}>
          <p style={{ fontSize: 12, color: '#868e96', lineHeight: 1.7, margin: 0 }}>
            💡 <strong>Tips</strong><br />
            • Click any element on the canvas to edit its properties here<br />
            • Drag elements to reposition them<br />
            • Use the Layers panel to change Z-order<br />
            • <kbd style={{ background: '#e9ecef', padding: '0 4px', borderRadius: 3 }}>Del</kbd> removes selected · <kbd style={{ background: '#e9ecef', padding: '0 4px', borderRadius: 3 }}>Ctrl+D</kbd> duplicates
          </p>
        </div>
      </div>
    );
  }

  const el = selectedEl;
  const typeLabel = { text: 'Text', image: 'Image', qr: 'QR Code', rect: 'Rectangle', line: 'Line' }[el.type] || el.type;

  return (
    <div className="card" style={{ padding: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#3b5bdb', letterSpacing: '.6px', textTransform: 'uppercase' }}>
          {typeLabel} Element
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }} onClick={onDuplicate} title="Duplicate (Ctrl+D)">
            <Copy size={13} />
          </button>
          <button className="btn btn-danger btn-sm" style={{ padding: '4px 8px' }} onClick={onRemove} title="Delete (Del)">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Position */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        <div>
          <label className="form-label" style={{ fontSize: 11 }}>X</label>
          <input className="form-control" type="number" value={el.x}
            onChange={(e) => onElChange({ x: Number(e.target.value) })} />
        </div>
        <div>
          <label className="form-label" style={{ fontSize: 11 }}>Y</label>
          <input className="form-control" type="number" value={el.y}
            onChange={(e) => onElChange({ y: Number(e.target.value) })} />
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #f0f0f0', margin: '0 0 14px' }} />

      {/* Type-specific properties */}
      {el.type === 'text'  && <TextProps  el={el} onChange={onElChange} />}
      {el.type === 'image' && <ImageProps el={el} onChange={onElChange} />}
      {el.type === 'qr'   && <QrProps    el={el} onChange={onElChange} />}
      {el.type === 'rect'  && <RectProps  el={el} onChange={onElChange} />}
      {el.type === 'line'  && <LineProps  el={el} onChange={onElChange} />}
    </div>
  );
}

// ── Sub-property panels ───────────────────────────────────────────────────────
function TextProps({ el, onChange }) {
  return (
    <>
      <div className="form-group">
        <label className="form-label" style={{ fontSize: 11 }}>Field</label>
        <select className="form-control" value={el.field || 'name'} onChange={(e) => onChange({ field: e.target.value })}>
          {FIELD_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label" style={{ fontSize: 11 }}>Prefix Text</label>
        <input className="form-control" placeholder='e.g. "ID: " or "Name: "' value={el.prefix || ''}
          onChange={(e) => onChange({ prefix: e.target.value })} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: 11 }}>Font Size</label>
          <input className="form-control" type="number" min={6} max={200} value={el.fontSize || 16}
            onChange={(e) => onChange({ fontSize: Number(e.target.value) })} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: 11 }}>Color</label>
          <div style={{ display: 'flex', gap: 4 }}>
            <input type="color" value={el.color || '#212121'} onChange={(e) => onChange({ color: e.target.value })}
              style={{ width: 36, height: 36, border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', padding: 2 }} />
            <input className="form-control" value={el.color || '#212121'} onChange={(e) => onChange({ color: e.target.value })} style={{ flex: 1 }} />
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
          <input type="checkbox" checked={el.fontWeight === 'bold'} onChange={(e) => onChange({ fontWeight: e.target.checked ? 'bold' : 'normal' })} />
          Bold
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
          <input type="checkbox" checked={!!el.italic} onChange={(e) => onChange({ italic: e.target.checked })} />
          Italic
        </label>
      </div>
    </>
  );
}

function ImageProps({ el, onChange }) {
  return (
    <>
      <div className="form-group">
        <label className="form-label" style={{ fontSize: 11 }}>Field</label>
        <select className="form-control" value={el.field || 'photoUrl'} onChange={(e) => onChange({ field: e.target.value })}>
          {FIELD_OPTIONS.filter((f) => ['photoUrl', 'orgLogo'].includes(f.value)).map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: 11 }}>Width (px)</label>
          <input className="form-control" type="number" min={10} value={el.width || 100}
            onChange={(e) => onChange({ width: Number(e.target.value) })} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: 11 }}>Height (px)</label>
          <input className="form-control" type="number" min={10} value={el.height || 100}
            onChange={(e) => onChange({ height: Number(e.target.value) })} />
        </div>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginTop: 12, userSelect: 'none' }}>
        <input type="checkbox" checked={!!el.rounded} onChange={(e) => onChange({ rounded: e.target.checked })} />
        Circle / round shape
      </label>
    </>
  );
}

function QrProps({ el, onChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" style={{ fontSize: 11 }}>Width (px)</label>
        <input className="form-control" type="number" min={40} value={el.width || 90}
          onChange={(e) => onChange({ width: Number(e.target.value) })} />
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" style={{ fontSize: 11 }}>Height (px)</label>
        <input className="form-control" type="number" min={40} value={el.height || 90}
          onChange={(e) => onChange({ height: Number(e.target.value) })} />
      </div>
    </div>
  );
}

function RectProps({ el, onChange }) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: 11 }}>Width (px)</label>
          <input className="form-control" type="number" min={1} value={el.width || 200}
            onChange={(e) => onChange({ width: Number(e.target.value) })} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: 11 }}>Height (px)</label>
          <input className="form-control" type="number" min={1} value={el.height || 8}
            onChange={(e) => onChange({ height: Number(e.target.value) })} />
        </div>
      </div>
      <div className="form-group" style={{ marginTop: 8 }}>
        <label className="form-label" style={{ fontSize: 11 }}>Fill Color</label>
        <div style={{ display: 'flex', gap: 4 }}>
          <input type="color" value={el.color || '#3b5bdb'} onChange={(e) => onChange({ color: e.target.value })}
            style={{ width: 36, height: 36, border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', padding: 2 }} />
          <input className="form-control" value={el.color || '#3b5bdb'} onChange={(e) => onChange({ color: e.target.value })} style={{ flex: 1 }} />
        </div>
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" style={{ fontSize: 11 }}>Corner Radius</label>
        <input className="form-control" type="number" min={0} max={500} value={el.radius || 0}
          onChange={(e) => onChange({ radius: Number(e.target.value) })} />
      </div>
    </>
  );
}

function LineProps({ el, onChange }) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: 11 }}>Width (px)</label>
          <input className="form-control" type="number" min={1} value={el.width || 200}
            onChange={(e) => onChange({ width: Number(e.target.value) })} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: 11 }}>Thickness (px)</label>
          <input className="form-control" type="number" min={1} max={100} value={el.thickness || 2}
            onChange={(e) => onChange({ thickness: Number(e.target.value) })} />
        </div>
      </div>
      <div className="form-group" style={{ marginTop: 8, marginBottom: 0 }}>
        <label className="form-label" style={{ fontSize: 11 }}>Color</label>
        <div style={{ display: 'flex', gap: 4 }}>
          <input type="color" value={el.color || '#cccccc'} onChange={(e) => onChange({ color: e.target.value })}
            style={{ width: 36, height: 36, border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', padding: 2 }} />
          <input className="form-control" value={el.color || '#cccccc'} onChange={(e) => onChange({ color: e.target.value })} style={{ flex: 1 }} />
        </div>
      </div>
    </>
  );
}
