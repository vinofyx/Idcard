import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';
import { Building2, Upload, Users, UserPlus, Trash2, Mail, Shield, X } from 'lucide-react';
import { getOrgRules } from '../utils/orgRules';

const TABS = [
  { id: 'org',  label: 'Organization', icon: Building2 },
  { id: 'team', label: 'Team',         icon: Users },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('org');
  return (
    <div>
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: '2px solid var(--border)' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px',
              border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500,
              color: activeTab === t.id ? '#3b5bdb' : '#868e96',
              borderBottom: activeTab === t.id ? '2px solid #3b5bdb' : '2px solid transparent',
              marginBottom: -2, transition: 'color .15s',
            }}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'org'  && <OrgSettings />}
      {activeTab === 'team' && <TeamSettings />}
    </div>
  );
}

// ── Org Settings ──────────────────────────────────────────────────────────────
function OrgSettings() {
  const { organization, refreshOrg } = useAuth();
  const [orgForm, setOrgForm] = useState({
    name:     organization?.name     || '',
    type:     organization?.type     || 'school',
    idPrefix: organization?.idPrefix || '',
    idFormat: organization?.idFormat || '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // When type changes, suggest default prefix/format if fields are empty
  const handleTypeChange = (newType) => {
    const rules = getOrgRules(newType);
    setOrgForm((prev) => ({
      ...prev,
      type: newType,
      idPrefix: prev.idPrefix || rules.idPrefix,
      idFormat: prev.idFormat || rules.idFormat,
    }));
  };

  const saveOrg = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/organizations/me', orgForm);
      await refreshOrg();
      toast.success('Organization updated');
    } catch { toast.error('Save failed'); }
    setSaving(false);
  };

  const uploadLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      await api.post('/organizations/logo', fd);
      await refreshOrg();
      toast.success('Logo updated');
    } catch { toast.error('Upload failed'); }
    setUploading(false);
  };

  return (
    <div style={{ maxWidth: 520 }}>
      {/* Logo */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Organization Logo</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 80, height: 80, borderRadius: 10, background: '#f1f3f5', border: '2px dashed #dee2e6', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
            {organization?.logo
              ? <img src={organization.logo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : <Building2 size={28} color="#adb5bd" />}
          </div>
          <div>
            <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
              {uploading ? <span className="spinner" /> : <><Upload size={15} /> {organization?.logo ? 'Change Logo' : 'Upload Logo'}</>}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadLogo} disabled={uploading} />
            </label>
            <p style={{ fontSize: 12, color: '#868e96', marginTop: 6 }}>PNG, JPG up to 5MB. Appears on all ID cards.</p>
          </div>
        </div>
      </div>

      {/* Org details */}
      <div className="card">
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Organization Details</h2>
        <form onSubmit={saveOrg}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input className="form-control" value={orgForm.name} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select className="form-control" value={orgForm.type} onChange={(e) => handleTypeChange(e.target.value)}>
              <option value="school">🏫 School</option>
              <option value="college">🎓 College / University</option>
              <option value="corporate">🏢 Corporate / Company</option>
              <option value="institute">📚 Coaching / Institute</option>
            </select>
          </div>

          {/* ID Format section */}
          <div style={{ background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>🪪 Auto-ID Settings</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 100 }}>
                <label className="form-label" style={{ fontSize: 11 }}>PREFIX</label>
                <input
                  className="form-control"
                  value={orgForm.idPrefix}
                  onChange={(e) => setOrgForm({ ...orgForm, idPrefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) })}
                  placeholder={getOrgRules(orgForm.type).idPrefix}
                  style={{ fontFamily: 'monospace', letterSpacing: 1, textTransform: 'uppercase' }}
                  maxLength={6}
                />
              </div>
              <div style={{ flex: 2, minWidth: 180 }}>
                <label className="form-label" style={{ fontSize: 11 }}>FORMAT STRING</label>
                <input
                  className="form-control"
                  value={orgForm.idFormat}
                  onChange={(e) => setOrgForm({ ...orgForm, idFormat: e.target.value })}
                  placeholder={getOrgRules(orgForm.type).idFormat}
                  style={{ fontFamily: 'monospace' }}
                />
              </div>
            </div>
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
              Tokens: <code>{'{NNN}'}</code> = 3-digit counter · <code>{'{NNNN}'}</code> = 4-digit · <code>{'{YYYY}'}</code> = year
              {orgForm.idFormat && orgForm.idPrefix && (
                <> · Preview: <strong style={{ color: '#3b5bdb', fontFamily: 'monospace' }}>
                  {orgForm.idFormat
                    .replace('{NNN}', '001').replace('{NNNN}', '0001')
                    .replace('{YYYY}', new Date().getFullYear())}
                </strong></>
              )}
            </p>
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <span className="spinner" style={{ width: 15, height: 15, borderTopColor: '#fff' }} /> : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Team Settings ─────────────────────────────────────────────────────────────
function TeamSettings() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [pending, setPending]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole,  setInviteRole]  = useState('staff');
  const [inviting,    setInviting]    = useState(false);
  const [inviteLink,  setInviteLink]  = useState('');

  useEffect(() => { loadTeam(); }, []);

  const loadTeam = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/team');
      setMembers(data.members);
      setPending(data.pendingInvites);
    } catch { toast.error('Failed to load team'); }
    setLoading(false);
  };

  const sendInvite = async (e) => {
    e.preventDefault();
    setInviting(true);
    setInviteLink('');
    try {
      const { data } = await api.post('/team/invite', { email: inviteEmail, role: inviteRole });
      setInviteLink(data.inviteLink);
      setInviteEmail('');
      toast.success('Invite created!');
      loadTeam();
    } catch (err) {
      const msg = err.response?.data?.message || 'Invite failed';
      if (err.response?.data?.upgrade) toast.error(msg + ' — upgrade your plan.');
      else toast.error(msg);
    }
    setInviting(false);
  };

  const removeMember = async (userId) => {
    if (!confirm('Remove this member from your organization?')) return;
    try {
      await api.delete(`/team/${userId}`);
      toast.success('Member removed');
      loadTeam();
    } catch { toast.error('Failed to remove member'); }
  };

  const cancelInvite = async (inviteId) => {
    try {
      await api.delete(`/team/invites/${inviteId}`);
      toast.success('Invite cancelled');
      loadTeam();
    } catch { toast.error('Failed to cancel invite'); }
  };

  const ROLE_BADGE = { admin: 'badge-info', staff: 'badge-success', viewer: 'badge-warning' };

  return (
    <div style={{ maxWidth: 600 }}>
      {/* Invite form */}
      {user?.role === 'admin' && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Invite Team Member</h2>
          <form onSubmit={sendInvite}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: 2, minWidth: 200 }}>
                <label className="form-label">Email Address</label>
                <input
                  className="form-control"
                  type="email"
                  placeholder="colleague@school.edu"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              <div style={{ flex: 1, minWidth: 130 }}>
                <label className="form-label">Role</label>
                <select className="form-control" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                  <option value="staff">Staff (can upload, edit)</option>
                  <option value="viewer">Viewer (read-only)</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: 12 }} disabled={inviting}>
              {inviting ? <span className="spinner" style={{ width: 15, height: 15, borderTopColor: '#fff' }} /> : <><UserPlus size={15} /> Send Invite</>}
            </button>
          </form>

          {/* Show invite link (if email not configured) */}
          {inviteLink && (
            <div style={{ marginTop: 16, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#166534', marginBottom: 6 }}>📋 Share this invite link manually:</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  className="form-control"
                  value={inviteLink}
                  readOnly
                  style={{ fontSize: 12, flex: 1 }}
                  onClick={(e) => e.target.select()}
                />
                <button className="btn btn-secondary btn-sm" onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success('Copied!'); }}>
                  Copy
                </button>
              </div>
              <div style={{ fontSize: 11, color: '#868e96', marginTop: 4 }}>Link expires in 7 days.</div>
            </div>
          )}
        </div>
      )}

      {/* Members list */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
          Team Members <span style={{ fontWeight: 400, color: '#868e96', fontSize: 13 }}>({members.length})</span>
        </h2>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 24 }}><span className="spinner" /></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {members.map((m) => (
              <div key={m._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#f8f9fa', borderRadius: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#3b5bdb', flexShrink: 0 }}>
                  {m.name?.[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {m.name}
                    {m._id === user?._id && <span style={{ fontSize: 11, color: '#868e96' }}>(you)</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#868e96', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`badge ${ROLE_BADGE[m.role] || 'badge-info'}`}>{m.role}</span>
                  {user?.role === 'admin' && m._id !== user?._id && (
                    <button className="btn btn-danger btn-sm" onClick={() => removeMember(m._id)} title="Remove member">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending invites */}
      {pending.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>
            Pending Invites <span style={{ fontWeight: 400, color: '#868e96', fontSize: 13 }}>({pending.length})</span>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.map((inv) => (
              <div key={inv._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8 }}>
                <Mail size={15} color="#e67700" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 13 }}>
                  <span style={{ fontWeight: 500 }}>{inv.email}</span>
                  <span style={{ color: '#868e96', marginLeft: 8 }}>· {inv.role}</span>
                </div>
                <span className="badge badge-warning" style={{ fontSize: 11 }}>Pending</span>
                {user?.role === 'admin' && (
                  <button className="btn btn-ghost btn-sm" onClick={() => cancelInvite(inv._id)} title="Cancel invite">
                    <X size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
