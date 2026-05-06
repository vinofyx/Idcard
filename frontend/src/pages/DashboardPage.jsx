import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  Users, Upload, Layout, FileText, ArrowRight,
  TrendingUp, CheckCircle, Clock, AlertTriangle, BarChart2,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, organization } = useAuth();
  const [stats, setStats]       = useState(null);
  const [templates, setTemplates] = useState(0);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, tplRes] = await Promise.all([
          api.get('/records/stats'),
          api.get('/templates'),
        ]);
        setStats(statsRes.data);
        setTemplates(tplRes.data.length);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const statCards = [
    { label: 'Total Records',  value: stats?.total     ?? '—', icon: Users,     color: '#3b5bdb', bg: '#edf2ff' },
    { label: 'IDs Generated',  value: stats?.generated ?? '—', icon: FileText,  color: '#2f9e44', bg: '#ebfbee' },
    { label: 'Upload Batches', value: stats?.batches   ?? '—', icon: Upload,    color: '#e67700', bg: '#fff3bf' },
    { label: 'Card Templates', value: templates,               icon: Layout,    color: '#c2255c', bg: '#ffe0f0' },
  ];

  const pendingCount = stats ? (stats.total - stats.generated) : 0;
  const maxDeptCount = stats?.departments?.length
    ? Math.max(...stats.departments.map((d) => d.count))
    : 1;

  return (
    <div>
      <div className="page-header">
        <h1>Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
        <p>Here's what's happening with <strong>{organization?.name}</strong></p>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        <Link to="/upload"    className="btn btn-primary"><Upload size={16} /> Upload Data</Link>
        <Link to="/manual"    className="btn btn-secondary"><FileText size={16} /> Manual Entry</Link>
        <Link to="/templates" className="btn btn-secondary"><Layout size={16} /> Templates</Link>
        <Link to="/records"   className="btn btn-secondary"><Users size={16} /> All Records</Link>
      </div>

      {/* ── Expiry Alert ── */}
      {stats?.expired > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff8f0', border: '1px solid #fed7aa', borderRadius: 10, padding: '12px 18px', marginBottom: 24 }}>
          <AlertTriangle size={18} color="#ea580c" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 14, color: '#7c2d12' }}>
            <strong>{stats.expired} ID{stats.expired > 1 ? 's' : ''}</strong> have expired — consider renewing or regenerating them.
          </span>
          <Link to="/records" style={{ marginLeft: 'auto', fontSize: 13, color: '#ea580c', fontWeight: 600, whiteSpace: 'nowrap' }}>View Records →</Link>
        </div>
      )}

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ background: bg, padding: 12, borderRadius: 10, flexShrink: 0 }}>
              <Icon size={22} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 700 }}>
                {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : value}
              </div>
              <div style={{ fontSize: 13, color: '#868e96' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Left column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Recent Batches */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600 }}>Recent Batches</h2>
              <Link to="/records" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>View all <ArrowRight size={13} /></Link>
            </div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 24 }}><span className="spinner" /></div>
            ) : !stats?.recentBatches?.length ? (
              <div className="empty-state" style={{ padding: '28px 0' }}>
                <TrendingUp size={36} />
                <p>No uploads yet.</p>
                <Link to="/upload" className="btn btn-primary" style={{ marginTop: 12, display: 'inline-flex' }}>
                  <Upload size={14} /> Upload first file
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {stats.recentBatches.map((b) => (
                  <Link
                    key={b._id}
                    to={`/records?batchId=${b._id}`}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 8, background: '#f8f9fa', textDecoration: 'none', color: 'inherit', transition: 'background .15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#edf2ff')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#f8f9fa')}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>
                        Batch <code style={{ fontSize: 11, background: '#e9ecef', padding: '1px 5px', borderRadius: 3 }}>…{b._id.slice(-8)}</code>
                      </div>
                      <div style={{ fontSize: 11, color: '#868e96', marginTop: 2 }}>
                        {new Date(b.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <span className="badge badge-info">{b.count} records</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Department Breakdown */}
          {stats?.departments?.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <BarChart2 size={16} color="#748ffc" />
                <h2 style={{ fontSize: 15, fontWeight: 600 }}>By Department</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {stats.departments.map((d) => (
                  <div key={d._id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{d._id}</span>
                      <span style={{ color: '#6b7280', fontWeight: 600 }}>{d.count}</span>
                    </div>
                    <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(d.count / maxDeptCount) * 100}%`, background: 'linear-gradient(90deg,#748ffc,#5c7cfa)', borderRadius: 3, transition: 'width .6s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Generation Progress */}
          {stats && stats.total > 0 && (
            <div className="card">
              <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Generation Progress</h2>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: '#2f9e44', fontWeight: 500 }}>{stats.generated} generated</span>
                <span style={{ color: '#868e96' }}>{pendingCount} pending</span>
              </div>
              <div style={{ height: 10, background: '#e9ecef', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'linear-gradient(90deg,#2f9e44,#40c057)', borderRadius: 5, width: `${stats.total ? (stats.generated / stats.total) * 100 : 0}%`, transition: 'width .4s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#868e96', marginTop: 6 }}>
                <span>{stats.total ? Math.round((stats.generated / stats.total) * 100) : 0}% complete</span>
                {stats.expired > 0 && (
                  <span style={{ color: '#ea580c' }}>{stats.expired} expired</span>
                )}
              </div>
            </div>
          )}

          {/* Recently Generated */}
          {stats?.recentGenerated?.length > 0 && (
            <div className="card">
              <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Recently Generated</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stats.recentGenerated.map((r) => (
                  <div key={r._id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                    <CheckCircle size={15} color="#2f9e44" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: '#868e96' }}>{r.department || r.idNumber || ''}</div>
                    </div>
                    <div style={{ fontSize: 11, color: '#868e96', flexShrink: 0 }}>
                      {new Date(r.updatedAt).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Get Started card for fresh accounts */}
          {!loading && stats?.total === 0 && (
            <div className="card" style={{ borderLeft: '4px solid #3b5bdb' }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>🚀 Get Started in 3 Steps</h3>
              <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, color: '#495057' }}>
                <li><strong>Upload Excel</strong> — student or employee data file</li>
                <li><strong>Map columns</strong> — Name, ID, Department auto-detected</li>
                <li><strong>Generate IDs</strong> — download print-ready PDFs instantly</li>
              </ol>
              <Link to="/upload" className="btn btn-primary" style={{ marginTop: 14, display: 'inline-flex' }}>
                Start Now <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
