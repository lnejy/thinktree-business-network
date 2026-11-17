import React, { useState } from 'react';
import {
  IconDashboard, IconCard, IconPlus, IconBuilding, IconSitemap,
  IconNetwork, IconSearch, IconSettings, IconAdmin, IconInbox,
  IconBell, IconChevronDown, IconLogOut, IconSparkle
} from './icons';

export type PageName =
  | 'login' | 'dashboard' | 'my-cards' | 'add-card' | 'incoming-cards'
  | 'ai-recognition' | 'companies' | 'company-detail' | 'org-chart'
  | 'business-network' | 'search' | 'admin' | 'card-detail' | 'mobile-capture' | 'settings';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: PageName;
  navigate: (page: PageName, params?: Record<string, string>) => void;
  isAdmin: boolean;
  userName: string;
  onLogout: () => Promise<void>;
  pendingCount?: number;
}

const navItems: Array<{ id: PageName; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; badge?: boolean }> = [
  { id: 'dashboard', label: 'Dashboard', icon: IconDashboard },
  { id: 'my-cards', label: 'My Cards', icon: IconCard },
  { id: 'incoming-cards', label: 'Incoming Cards', icon: IconInbox, badge: true },
  { id: 'companies', label: 'Companies', icon: IconBuilding },
  { id: 'org-chart', label: 'Organization', icon: IconSitemap },
  { id: 'business-network', label: 'Business Network', icon: IconNetwork },
  { id: 'search', label: 'Search', icon: IconSearch },
];

const adminItems: Array<{ id: PageName; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
  { id: 'admin', label: 'Admin', icon: IconAdmin },
  { id: 'settings', label: 'Settings', icon: IconSettings },
];

export default function Layout({ children, currentPage, navigate, isAdmin, userName, onLogout, pendingCount = 0 }: LayoutProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ||
    (userName.length >= 2 ? userName.slice(0, 2) : userName);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F8FAFC' }}>
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r bg-white" style={{ borderColor: '#E2E8F0' }}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 h-16 border-b shrink-0" style={{ borderColor: '#E2E8F0' }}>
          <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: '#2563EB' }}>
            <IconCard size={16} className="text-white" />
          </div>
          <div>
            <div className="font-semibold text-sm" style={{ color: '#0F172A', letterSpacing: '-0.01em' }}>ThinkTree</div>
            <div className="text-xs" style={{ color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>B2B Network</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-0.5">
            {navItems.map(({ id, label, icon: Icon, badge }) => {
              const active = currentPage === id;
              return (
                <button
                  key={id}
                  onClick={() => navigate(id as PageName)}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium transition-all duration-100 relative"
                  style={{
                    background: active ? '#EFF6FF' : 'transparent',
                    color: active ? '#2563EB' : '#475569',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                  {badge && pendingCount > 0 && (
                    <span className="ml-auto text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ background: '#EF4444', color: 'white', fontFamily: 'DM Mono, monospace', fontSize: '10px' }}>
                      {pendingCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-4" style={{ borderTop: '1px solid #F1F5F9' }}>
            <div className="px-3 pb-2">
              <span className="text-xs font-medium uppercase" style={{ color: '#94A3B8', letterSpacing: '0.08em' }}>Admin</span>
            </div>
            <div className="space-y-0.5">
              {adminItems.map(({ id, label, icon: Icon }) => {
                const active = currentPage === id;
                return (
                  <button
                    key={id}
                    onClick={() => navigate(id as PageName)}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium transition-all duration-100"
                    style={{
                      background: active ? '#EFF6FF' : 'transparent',
                      color: active ? '#2563EB' : '#475569',
                      opacity: !isAdmin && id === 'admin' ? 0.4 : 1,
                    }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                    {!isAdmin && id === 'admin' && (
                      <span className="ml-auto text-xs px-1.5 py-0.5 rounded" style={{ background: '#F1F5F9', color: '#94A3B8' }}>Admin only</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* User */}
        <div className="px-3 py-3 border-t relative" style={{ borderColor: '#E2E8F0' }}>
          {userMenuOpen && (
            <div className="absolute bottom-16 left-3 right-3 bg-white border rounded-lg shadow-lg py-1 z-50" style={{ borderColor: '#E2E8F0' }}>
              <button onClick={() => { setUserMenuOpen(false); void onLogout(); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50 transition-colors" style={{ color: '#EF4444' }}>
                <IconLogOut size={14} />로그아웃
              </button>
            </div>
          )}
          <button
            onClick={() => setUserMenuOpen(v => !v)}
            aria-label="계정 메뉴"
            aria-expanded={userMenuOpen}
            className="flex items-center gap-2.5 w-full px-2 py-2 rounded-md hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-semibold shrink-0" style={{ background: '#2563EB' }}>
              {initials}
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="text-xs font-medium truncate" style={{ color: '#0F172A' }}>{userName}</div>
              <div className="text-xs truncate" style={{ color: '#94A3B8' }}>{isAdmin ? 'Administrator' : 'Member'}</div>
            </div>
            <IconChevronDown size={12} className="shrink-0" style={{ color: '#94A3B8' }} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-4 px-6 h-16 border-b bg-white shrink-0" style={{ borderColor: '#E2E8F0' }}>
          <div className="flex-1 min-w-0">
            <Breadcrumb currentPage={currentPage} />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('search')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm border transition-colors hover:bg-gray-50"
              style={{ borderColor: '#E2E8F0', color: '#94A3B8' }}
            >
              <IconSearch size={14} />
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px' }}>⌘K</span>
            </button>
            <button
              onClick={() => navigate('incoming-cards')}
              className="relative p-2 rounded-md hover:bg-gray-50 transition-colors"
              style={{ color: '#64748B' }}
            >
              <IconBell size={18} />
              {pendingCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: '#EF4444' }} />
              )}
            </button>
            <button
              onClick={() => navigate('add-card')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-white transition-colors"
              style={{ background: '#2563EB' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1D4ED8')}
              onMouseLeave={e => (e.currentTarget.style.background = '#2563EB')}
            >
              <IconPlus size={14} />
              Add Card
            </button>
          </div>
        </header>

        {/* Content */}
        <nav className="md:hidden flex gap-2 px-3 py-2 bg-white border-b overflow-x-auto shrink-0" aria-label="모바일 메뉴">
          {navItems.map(({ id, label }) => <button key={id} onClick={() => navigate(id)} className={`shrink-0 text-xs rounded-full px-3 py-2 ${currentPage === id ? 'bg-blue-50 text-blue-600' : 'text-slate-500'}`}>{label}</button>)}
          <button onClick={() => void onLogout()} className="shrink-0 rounded-full px-3 py-2 text-xs text-slate-600">로그아웃</button>
        </nav>
        <main className="flex-1 overflow-auto">
          <div className="fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function Breadcrumb({ currentPage }: { currentPage: PageName }) {
  const labels: Record<string, string> = {
    dashboard: 'Dashboard',
    'my-cards': 'My Cards',
    'add-card': 'Add Card',
    'incoming-cards': '수신 명함',
    'ai-recognition': '명함 검토',
    companies: 'Companies',
    'company-detail': 'Company Detail',
    'org-chart': 'Organization Chart',
    'business-network': 'Business Network',
    search: 'Search',
    admin: 'Admin Dashboard',
    'card-detail': 'Card Detail',
    'mobile-capture': 'Mobile Capture Preview',
    settings: 'Settings',
  };
  return (
    <h1 className="text-base font-semibold" style={{ color: '#0F172A' }}>
      {labels[currentPage] || currentPage}
    </h1>
  );
}

// ─── Shared UI components used across pages ──────────────────────────

export function Badge({ children, variant = 'default', className = '' }: {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'ai' | 'muted';
  className?: string;
}) {
  const styles: Record<string, { background: string; color: string }> = {
    default: { background: '#F1F5F9', color: '#475569' },
    success: { background: '#ECFDF5', color: '#059669' },
    warning: { background: '#FFFBEB', color: '#D97706' },
    error: { background: '#FEF2F2', color: '#DC2626' },
    info: { background: '#EFF6FF', color: '#2563EB' },
    ai: { background: '#F5F3FF', color: '#7C3AED' },
    muted: { background: '#F8FAFC', color: '#94A3B8' },
  };
  const s = styles[variant];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${className}`} style={{ ...s, fontFamily: 'DM Mono, monospace' }}>
      {children}
    </span>
  );
}

export function StatCard({ label, value, sub, trend, icon: Icon, accent }: {
  label: string; value: string | number; sub?: string; trend?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-xl border p-5" style={{ borderColor: '#E2E8F0' }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium mb-2" style={{ color: '#64748B' }}>{label}</div>
          <div className="text-2xl font-bold" style={{ color: '#0F172A', fontFamily: 'DM Mono, monospace', letterSpacing: '-0.02em' }}>{value}</div>
          {sub && <div className="text-xs mt-1" style={{ color: '#94A3B8' }}>{sub}</div>}
          {trend && <div className="text-xs mt-1 font-medium" style={{ color: '#10B981' }}>{trend}</div>}
        </div>
        {Icon && (
          <div className="p-2.5 rounded-lg" style={{ background: accent ? `${accent}15` : '#F0F4FF', color: accent || '#2563EB' }}>
            <Icon size={18} />
          </div>
        )}
      </div>
    </div>
  );
}

export function CardImage({ initials, company }: { initials: string; company: string }) {
  const colors = ['#2563EB', '#7C3AED', '#059669', '#D97706', '#DC2626', '#0891B2'];
  const color = colors[company.charCodeAt(0) % colors.length];
  return (
    <div className="w-full h-full rounded-md flex flex-col items-center justify-center gap-1" style={{ background: `${color}10`, border: `1px dashed ${color}30` }}>
      <div className="text-lg font-bold" style={{ color, fontFamily: 'DM Mono, monospace' }}>{initials}</div>
      <div className="text-xs text-center px-2 leading-tight" style={{ color: `${color}80`, fontSize: '10px' }}>{company}</div>
    </div>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-sm font-semibold" style={{ color: '#0F172A' }}>{title}</h2>
      {action}
    </div>
  );
}

export function Btn({ children, variant = 'primary', onClick, size = 'md', icon: Icon, disabled }: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  onClick?: () => void;
  size?: 'sm' | 'md';
  icon?: React.ComponentType<{ size?: number }>;
  disabled?: boolean;
}) {
  const styles = {
    primary: { background: '#2563EB', color: 'white', border: 'none' },
    secondary: { background: 'white', color: '#374151', border: '1px solid #E2E8F0' },
    ghost: { background: 'transparent', color: '#374151', border: 'none' },
    danger: { background: 'white', color: '#DC2626', border: '1px solid #FCA5A5' },
  };
  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-md font-medium transition-all ${pad}`}
      style={{ ...styles[variant], opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}
