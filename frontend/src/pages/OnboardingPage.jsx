import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';
import { CreditCard, ArrowRight, ArrowLeft, Check, Upload, RefreshCw } from 'lucide-react';
import { ORG_RULES } from '../utils/orgRules';

// ── Org type cards ────────────────────────────────────────────────────────────
const ORG_TYPES = [
  { value: 'school',    ...ORG_RULES.school    },
  { value: 'college',   ...ORG_RULES.college   },
  { value: 'corporate', ...ORG_RULES.corporate },
  { value: 'institute', ...ORG_RULES.institute },
];

// ── Dot progress indicator ────────────────────────────────────────────────────
function StepDots({ step, total = 3 }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 32 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === step ? 24 : 8, height: 8, borderRadius: 4,
          background: i <= step ? '#3b5bdb' : '#e9ecef',
          transition: 'all .3s ease',
        }} />
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const { organization, refreshOrg } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Form state
  const [orgType,     setOrgType]     = useState(organization?.type || 'school');
  const [orgName,     setOrgName]     = useState(organization?.name || '');
  const [autoId,      setAutoId]      = useState(true);
  const [idPrefix,    setIdPrefix]    = useState('');
  const [logo,        setLogo]        = useState(null);
  const [logoPreview, setLogoPreview] = useState(organization?.logo || '');

  // Sync prefix when type changes
  useEffect(() => {
    const rules = ORG_RULES[orgType];
    setIdPrefix(rules?.idPrefix || 'SCH');
  }, [orgType]);

  const rules = ORG_RULES[orgType] || ORG_RULES.school;
  // Derive the format string using the user's custom prefix (may differ from rule default)
  const customPrefix = (idPrefix || rules.idPrefix).trim().toUpperCase();
  const customFormat = (rules.idFormat || `${rules.idPrefix}-{NNN}`)
    .replace(rules.idPrefix, customPrefix);
  const sampleId = autoId
    ? customFormat
        .replace('{NNN}', '001')
        .replace('{NNNN}', '0001')
        .replace('{YYYY}', new Date().getFullYear())
        .replace(/\{[^}]+\}/g, '?') // fallback for unknown tokens
    : 'You enter manually';

  const handleLogoChange = (file) => {
    if (!file) return;
    setLogo(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  // ── Step 1: Choose type ───────────────────────────────────────────────────
  const handleTypeNext = () => {
    setStep(1);
  };

  // ── Step 2: Details + ID Format ──────────────────────────────────────────
  const handleSetup = async () => {
    if (!orgName.trim()) { toast.error('Please enter your organization name'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', orgName.trim());
      fd.append('type', orgType);
      if (autoId) {
        fd.append('idPrefix', customPrefix);
        fd.append('idFormat', customFormat);
      }
      if (logo) fd.append('logo', logo);

      const { data } = await api.put('/organizations/me/setup', fd);
      await refreshOrg();
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Setup failed');
    }
    setSaving(false);
  };

  const handleSkip = async () => {
    setSaving(true);
    try {
      await api.put('/organizations/me/setup', JSON.stringify({ onboardingDone: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
      await refreshOrg();
      navigate('/dashboard');
    } catch {
      navigate('/dashboard');
    }
    setSaving(false);
  };

  // ── Step 3: Done — auto-redirect ─────────────────────────────────────────
  useEffect(() => {
    if (step === 2) {
      const t = setTimeout(() => navigate('/dashboard'), 2500);
      return () => clearTimeout(t);
    }
  }, [step, navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e2a4a 0%, #2d4a7a 60%, #1e3a8a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 580,
        padding: '40px 44px', boxShadow: '0 24px 80px rgba(0,0,0,.35)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 28 }}>
          <CreditCard size={26} color="#3b5bdb" />
          <span style={{ fontSize: 20, fontWeight: 800, color: '#1e2a4a' }}>IDFlow</span>
        </div>

        <StepDots step={step} />

        {/* ── STEP 0: Choose type ── */}
        {step === 0 && (
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', textAlign: 'center', marginBottom: 8 }}>
              What kind of organization are you?
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 28 }}>
              We'll customize IDFlow to match your exact needs.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
              {ORG_TYPES.map((t) => {
                const isSel = orgType === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => setOrgType(t.value)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: 8, padding: '20px 16px', borderRadius: 12, cursor: 'pointer',
                      border: `2px solid ${isSel ? '#3b5bdb' : '#e5e7eb'}`,
                      background: isSel ? '#edf2ff' : '#fafafa',
                      transition: 'all .15s',
                    }}
                    onMouseEnter={(e) => { if (!isSel) { e.currentTarget.style.borderColor = '#c7d2fe'; e.currentTarget.style.background = '#f5f7ff'; } }}
                    onMouseLeave={(e) => { if (!isSel) { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#fafafa'; } }}
                  >
                    <span style={{ fontSize: 32 }}>{t.emoji}</span>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: isSel ? '#3b5bdb' : '#111827' }}>{t.label}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{t.description}</div>
                    </div>
                    {isSel && (
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#3b5bdb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={12} color="#fff" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <button className="btn btn-primary btn-block btn-lg" onClick={handleTypeNext}>
              Continue <ArrowRight size={18} />
            </button>
            <button
              onClick={handleSkip}
              style={{ display: 'block', width: '100%', textAlign: 'center', marginTop: 14, fontSize: 13, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Skip setup for now
            </button>
          </div>
        )}

        {/* ── STEP 1: Details + ID Format ── */}
        {step === 1 && (
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', textAlign: 'center', marginBottom: 6 }}>
              {rules.emoji} Tell us about your {rules.label.split('/')[0].trim()}
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 28 }}>
              This info will appear on every ID card you generate.
            </p>

            {/* Name */}
            <div className="form-group">
              <label className="form-label">Organization Name *</label>
              <input
                className="form-control"
                placeholder={`e.g. ${orgType === 'school' ? 'Delhi Public School' : orgType === 'college' ? 'IIT Delhi' : orgType === 'corporate' ? 'Infosys Limited' : 'Career Point Institute'}`}
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                autoFocus
                style={{ fontSize: 15 }}
              />
            </div>

            {/* Logo */}
            <div className="form-group">
              <label className="form-label">Logo (optional)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    width: 72, height: 72, borderRadius: 10, border: `2px dashed ${logoPreview ? '#3b5bdb' : '#d1d5db'}`,
                    background: logoPreview ? '#f5f7ff' : '#fafafa', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', flexShrink: 0,
                  }}
                >
                  {logoPreview
                    ? <img src={logoPreview} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    : <Upload size={22} color="#9ca3af" />}
                </div>
                <div>
                  <label className="btn btn-secondary" style={{ cursor: 'pointer', fontSize: 13 }}>
                    <Upload size={14} /> {logoPreview ? 'Change Logo' : 'Upload Logo'}
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleLogoChange(e.target.files?.[0])} />
                  </label>
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>PNG or JPG · Appears on all ID cards</p>
                  {logoPreview && (
                    <button type="button" onClick={() => { setLogo(null); setLogoPreview(''); }} style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2 }}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ID Format */}
            <div style={{ background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: 10, padding: '16px 18px', marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>
                🪪 ID Number Format
              </div>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 10 }}>
                <input type="radio" checked={autoId} onChange={() => setAutoId(true)} style={{ marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>Auto-generate IDs <span style={{ background: '#dcfce7', color: '#166534', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, marginLeft: 4 }}>Recommended</span></div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>We assign unique IDs automatically when uploading data</div>
                </div>
              </label>

              {autoId && (
                <div style={{ marginLeft: 26, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>ID PREFIX</label>
                      <input
                        className="form-control"
                        value={idPrefix}
                        onChange={(e) => setIdPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                        style={{ width: 90, textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: 1 }}
                        maxLength={6}
                      />
                    </div>
                    <div style={{ marginTop: 18 }}>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>IDs will look like</div>
                      <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: '#3b5bdb', background: '#edf2ff', padding: '3px 10px', borderRadius: 6, marginTop: 2 }}>
                        {sampleId}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input type="radio" checked={!autoId} onChange={() => setAutoId(false)} style={{ marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>Enter IDs manually</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>You'll provide each person's ID number yourself</div>
                </div>
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => setStep(0)} style={{ gap: 6 }}>
                <ArrowLeft size={15} /> Back
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSetup} disabled={saving || !orgName.trim()}>
                {saving
                  ? <><span className="spinner" style={{ width: 16, height: 16, borderTopColor: '#fff' }} /> Saving…</>
                  : <>Finish Setup <ArrowRight size={16} /></>}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Done ── */}
        {step === 2 && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
              boxShadow: '0 8px 24px rgba(34,197,94,.35)',
            }}>
              <Check size={34} color="#fff" strokeWidth={3} />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 8 }}>You're all set!</h1>
            <p style={{ fontSize: 15, color: '#6b7280', marginBottom: 24 }}>
              {orgName || organization?.name}
            </p>

            {/* Summary chips */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 32 }}>
              <span style={{ background: '#edf2ff', color: '#3b5bdb', fontSize: 13, fontWeight: 600, padding: '5px 14px', borderRadius: 20 }}>
                {rules.emoji} {rules.label}
              </span>
              {autoId && (
                <span style={{ background: '#dcfce7', color: '#166534', fontSize: 13, fontWeight: 600, padding: '5px 14px', borderRadius: 20, fontFamily: 'monospace' }}>
                  🪪 {sampleId}
                </span>
              )}
              {logoPreview && (
                <span style={{ background: '#fff7ed', color: '#ea580c', fontSize: 13, fontWeight: 600, padding: '5px 14px', borderRadius: 20 }}>
                  🖼 Logo uploaded
                </span>
              )}
            </div>

            <div style={{ color: '#9ca3af', fontSize: 13, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <RefreshCw size={14} style={{ animation: 'spin .8s linear infinite' }} />
              Taking you to your dashboard…
            </div>

            <button className="btn btn-primary btn-lg" onClick={() => navigate('/dashboard')}>
              Go to Dashboard <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
