import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, Users, FileText, BarChart2 } from 'lucide-react';

export default function AnalyticsPage() {
  const { organization } = useAuth();
  const [data, setData] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/analytics/overview?days=${days}`)
      .then(({ data: d }) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Analytics</h1>
          <p>ID generation trends for {organization?.name}</p>
        </div>
        <select className="form-control" style={{ width: 140 }} value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><span className="spinner" /></div>
      ) : !data ? (
        <div className="card empty-state"><TrendingUp size={40} /><p>No analytics data yet.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Summary stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
            {[
              { label: 'Total Generated', value: data.byStatus?.find((s) => s._id === 'generated')?.count ?? 0, icon: FileText, color: '#2f9e44', bg: '#ebfbee' },
              { label: 'Pending', value: data.byStatus?.find((s) => s._id === 'pending')?.count ?? 0, icon: TrendingUp, color: '#e67700', bg: '#fff3bf' },
              { label: 'Departments', value: data.byDepartment?.length ?? 0, icon: Users, color: '#3b5bdb', bg: '#edf2ff' },
              { label: 'Upload Batches', value: data.topBatches?.length ?? 0, icon: BarChart2, color: '#c2255c', bg: '#ffe0f0' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ background: bg, padding: 10, borderRadius: 8 }}><Icon size={20} color={color} /></div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
                  <div style={{ fontSize: 12, color: '#868e96' }}>{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Time-series chart */}
          <div className="card">
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>IDs Generated — Last {days} Days</h2>
            {data.timeSeries?.length ? (
              <LineChart data={data.timeSeries} />
            ) : (
              <div className="empty-state" style={{ padding: '24px 0' }}><p>No generation activity in this period.</p></div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Department breakdown */}
            <div className="card">
              <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>By Department / Class</h2>
              {data.byDepartment?.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {data.byDepartment.map((d) => (
                    <DeptBar key={d._id} label={d._id || 'Unknown'} total={d.total} generated={d.generated} />
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '20px 0' }}><p>No department data.</p></div>
              )}
            </div>

            {/* Top batches */}
            <div className="card">
              <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Top Upload Batches</h2>
              {data.topBatches?.length ? (
                <table className="table">
                  <thead><tr><th>Batch</th><th>Records</th><th>Generated</th></tr></thead>
                  <tbody>
                    {data.topBatches.map((b) => (
                      <tr key={b._id}>
                        <td><code style={{ fontSize: 11, background: '#f1f3f5', padding: '2px 6px', borderRadius: 4 }}>…{b._id.slice(-8)}</code></td>
                        <td>{b.total}</td>
                        <td>
                          <span className={`badge badge-${b.generated === b.total ? 'success' : 'warning'}`}>
                            {b.generated}/{b.total}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state" style={{ padding: '20px 0' }}><p>No batch data.</p></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SVG Line Chart ────────────────────────────────────────────────────────────
function LineChart({ data }) {
  const W = 600, H = 140, PAD = { top: 10, right: 10, bottom: 30, left: 36 };
  const maxVal = Math.max(...data.map((d) => d.count), 1);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const xScale = (i) => PAD.left + (i / (data.length - 1 || 1)) * innerW;
  const yScale = (v) => PAD.top + innerH - (v / maxVal) * innerH;

  const points = data.map((d, i) => `${xScale(i)},${yScale(d.count)}`).join(' ');
  const areaPoints = [
    `${xScale(0)},${PAD.top + innerH}`,
    ...data.map((d, i) => `${xScale(i)},${yScale(d.count)}`),
    `${xScale(data.length - 1)},${PAD.top + innerH}`,
  ].join(' ');

  // Show every Nth label to avoid overcrowding
  const labelEvery = Math.ceil(data.length / 8);

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, display: 'block' }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const y = PAD.top + innerH * (1 - f);
          return (
            <g key={f}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#e9ecef" strokeWidth={1} />
              <text x={PAD.left - 4} y={y + 4} fontSize={9} fill="#adb5bd" textAnchor="end">
                {Math.round(maxVal * f)}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <polygon points={areaPoints} fill="#3b5bdb" fillOpacity={0.08} />

        {/* Line */}
        <polyline points={points} fill="none" stroke="#3b5bdb" strokeWidth={2} strokeLinejoin="round" />

        {/* Dots + labels */}
        {data.map((d, i) => (
          <g key={i}>
            {d.count > 0 && (
              <circle cx={xScale(i)} cy={yScale(d.count)} r={3} fill="#3b5bdb" />
            )}
            {i % labelEvery === 0 && (
              <text x={xScale(i)} y={H - 4} fontSize={8} fill="#868e96" textAnchor="middle">
                {d.date.slice(5)} {/* MM-DD */}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── Department bar ────────────────────────────────────────────────────────────
function DeptBar({ label, total, generated }) {
  const pct = total ? (generated / total) * 100 : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{label}</span>
        <span style={{ color: '#868e96', fontSize: 12 }}>{generated}/{total}</span>
      </div>
      <div style={{ height: 6, background: '#e9ecef', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#2f9e44' : '#3b5bdb', borderRadius: 3, transition: 'width .4s' }} />
      </div>
    </div>
  );
}
