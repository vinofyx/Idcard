import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';
import { CreditCard, UserPlus } from 'lucide-react';

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const token = searchParams.get('token');

  const [form, setForm]     = useState({ name: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [existing, setExisting] = useState(false); // existing user just needs to log in

  useEffect(() => {
    if (!token) navigate('/login');
  }, [token]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/team/accept', { token, ...form });
      localStorage.setItem('token', data.token);
      toast.success(`Welcome to ${data.organization?.name}!`);
      window.location.href = '/dashboard';
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to accept invite';
      setError(msg);
      if (msg.includes('already')) setExisting(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e2a4a 0%, #3b5bdb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <CreditCard size={28} color="#3b5bdb" />
            <span style={{ fontSize: 22, fontWeight: 700, color: '#1e2a4a' }}>IDFlow</span>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Accept Invitation</h2>
          <p style={{ color: '#868e96', fontSize: 14 }}>Create your account to join the team</p>
        </div>

        {error && (
          <div style={{ background: '#fff5f5', border: '1px solid #ffc9c9', color: '#e03131', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {error}
            {existing && <div style={{ marginTop: 6 }}><Link to="/login">Sign in to your existing account →</Link></div>}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Your Name</label>
            <input className="form-control" name="name" placeholder="Priya Sharma" value={form.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Create Password</label>
            <input className="form-control" type="password" name="password" placeholder="Min 6 characters" value={form.password} onChange={handleChange} required minLength={6} />
          </div>
          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
            {loading
              ? <span className="spinner" style={{ borderTopColor: '#fff' }} />
              : <><UserPlus size={16} /> Join Team</>}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#868e96' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
