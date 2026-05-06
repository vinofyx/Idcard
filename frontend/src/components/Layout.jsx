import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Upload, Users, Layout as LayoutIcon,
  Settings, LogOut, CreditCard, BarChart2, Zap, PenLine,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/upload',     icon: Upload,          label: 'Upload Data' },
  { to: '/manual',     icon: PenLine,         label: 'Manual Entry' },
  { to: '/records',    icon: Users,           label: 'Records' },
  { to: '/templates',  icon: LayoutIcon,      label: 'Templates' },
  { to: '/analytics',  icon: BarChart2,       label: 'Analytics' },
  { to: '/billing',    icon: Zap,             label: 'Billing' },
  { to: '/settings',   icon: Settings,        label: 'Settings' },
];

export default function Layout() {
  const { user, organization, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 240, background: '#1e2a4a', color: '#fff',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
        transform: sidebarOpen ? 'translateX(0)' : undefined,
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CreditCard size={24} color="#748ffc" />
            <span style={{ fontWeight: 700, fontSize: 18 }}>IDFlow</span>
          </div>
          {organization && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {organization.name}
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 20px', color: isActive ? '#748ffc' : '#94a3b8',
              background: isActive ? 'rgba(116,143,252,.1)' : 'transparent',
              borderLeft: isActive ? '3px solid #748ffc' : '3px solid transparent',
              fontSize: 14, fontWeight: isActive ? 600 : 400,
              textDecoration: 'none', transition: 'all .15s',
            })}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,.1)' }}>
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
          <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ color: '#ef4444', paddingLeft: 0 }}>
            <LogOut size={15} /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: 240, flex: 1, minWidth: 0 }}>
        {/* Top bar */}
        <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '12px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
          <div />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <span style={{ background: '#edf2ff', color: '#3b5bdb', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
              {organization?.plan?.toUpperCase() || 'FREE'}
            </span>
          </div>
        </div>

        <div style={{ padding: '28px' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
