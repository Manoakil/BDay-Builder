import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import '../../style/Admin.css';

export default function AdminLayout({ children, role = 'admin' }) {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const userName = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}").full_name || "Admin"; } catch { return "Admin"; } })();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const navLinks = role === 'super_admin' ? [
    { name: 'Dashboard', path: '/super-admin' },
    { name: 'Organizations', path: '/super-admin/organizations' },
    { name: 'Users', path: '/super-admin/users' },
    { name: 'Analytics', path: '/super-admin/analytics' },
    { name: 'Audit Logs', path: '/super-admin/audit' },
    { name: 'Subscriptions', path: '/super-admin/subscriptions' },
  ] : [
    { name: 'Dashboard', path: '/admin' },
    { name: 'Birthday Event', path: '/admin/birthday' },
    { name: 'Users & Invites', path: '/admin/users' },
    { name: 'Wishes', path: '/admin/wishes' },
    { name: 'Memories', path: '/admin/memories' },
    { name: 'Memory Line', path: '/admin/timeline' },
    { name: 'Secret Vault', path: '/admin/vault' },
    { name: 'Wish Book', path: '/admin/wish-book' },
    { name: 'Guest Portal (Wish)', path: '/wisher' },
    { name: 'Settings', path: '/admin/settings' },
  ];

  return (
    <div className="dashboard-container">
      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div className="admin-mobile-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* SIDEBAR */}
      <aside className={`admin-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">🎂</div>
          <span className="sidebar-title">Birthday Builder</span>
          <button className="admin-mobile-close" onClick={() => setIsMobileMenuOpen(false)}>✕</button>
        </div>
        
        <nav className="sidebar-nav">
          {navLinks.map((link) => (
            <NavLink 
              key={link.name} 
              to={link.path}
              end={link.path === '/admin' || link.path === '/super-admin'}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {link.name}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="admin-btn secondary" style={{width: '100%'}} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="admin-main">
        <header className="admin-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button className="admin-mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
              ☰
            </button>
            <div className="header-title">
              {role === 'super_admin' ? 'Super Admin Portal' : 'Organization Portal'}
            </div>
          </div>
          <div className="header-actions">
            <span>Hello, {userName}</span>
            <div style={{width: 32, height: 32, borderRadius: '50%', background: 'var(--admin-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'}}>
              {userName.charAt(0)}
            </div>
          </div>
        </header>

        <div className="admin-content">
          {children}
        </div>
      </main>
    </div>
  );
}
