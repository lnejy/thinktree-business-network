import React, { useState } from 'react';
import { IconCard, IconMail, IconSparkle } from '../icons';

interface LoginProps {
  onLogin: (email: string, isAdmin: boolean) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('minsu.kim@cardsync.io');
  const [password, setPassword] = useState('••••••••');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const admin = email.includes('admin') || email.includes('yerin');
      onLogin(email, admin);
      setLoading(false);
    }, 900);
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#F8FAFC' }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 p-12" style={{ background: '#0F172A' }}>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg" style={{ background: '#2563EB' }}>
            <IconCard size={18} className="text-white" />
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">CardSync</span>
        </div>

        <div>
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-xs font-medium px-2 py-1 rounded" style={{ background: '#1E293B', color: '#64748B', fontFamily: 'DM Mono, monospace' }}>
                AI-Powered
              </span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-3 leading-tight" style={{ letterSpacing: '-0.02em' }}>
              B2B Business Card<br />Management Platform
            </h2>
            <p className="text-base" style={{ color: '#94A3B8', lineHeight: '1.6' }}>
              Capture, organize, and visualize your<br />client relationships at enterprise scale.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { label: 'Mobile Capture', desc: 'Photograph cards with your phone' },
              { label: 'AI Recognition', desc: 'Automatically fills in card details' },
              { label: 'Org Visualization', desc: 'Auto-build client organization charts' },
            ].map(({ label, desc }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: '#2563EB' }} />
                <div>
                  <div className="text-sm font-medium text-white">{label}</div>
                  <div className="text-xs" style={{ color: '#64748B' }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs" style={{ color: '#334155' }}>
          © 2025 CardSync Inc. Enterprise Edition
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[400px]">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6 lg:hidden">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: '#2563EB' }}>
                <IconCard size={16} className="text-white" />
              </div>
              <span className="font-semibold text-base" style={{ color: '#0F172A' }}>CardSync</span>
            </div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>Sign in</h1>
            <p className="text-sm" style={{ color: '#64748B' }}>Enter your credentials to access the dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Email</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }}>
                  <IconMail size={15} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border rounded-lg pl-9 pr-4 py-2.5 text-sm transition-colors outline-none"
                  style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#2563EB')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#E2E8F0')}
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium" style={{ color: '#374151' }}>Password</label>
                <button type="button" className="text-xs font-medium" style={{ color: '#2563EB' }}>Forgot password?</button>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border rounded-lg px-4 py-2.5 text-sm transition-colors outline-none"
                style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
                onFocus={e => (e.currentTarget.style.borderColor = '#2563EB')}
                onBlur={e => (e.currentTarget.style.borderColor = '#E2E8F0')}
                placeholder="Enter password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
              style={{ background: loading ? '#93C5FD' : '#2563EB' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 p-4 rounded-lg" style={{ background: '#F0F4FF', border: '1px solid #DBEAFE' }}>
            <div className="flex items-start gap-2">
              <IconSparkle size={14} style={{ color: '#2563EB', marginTop: 1 }} />
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: '#1D4ED8' }}>Demo Accounts</p>
                <div className="space-y-1" style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#475569' }}>
                  <div>minsu.kim@cardsync.io — Member</div>
                  <div>yerin.choi@cardsync.io — Admin</div>
                  <div className="text-xs mt-1" style={{ color: '#94A3B8' }}>Any password works</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-center gap-4">
            <button
              onClick={() => { setEmail('minsu.kim@cardsync.io'); }}
              className="text-xs px-3 py-1.5 rounded border transition-colors"
              style={{ borderColor: '#E2E8F0', color: '#475569' }}
            >
              Login as Member
            </button>
            <button
              onClick={() => { setEmail('yerin.choi@cardsync.io'); }}
              className="text-xs px-3 py-1.5 rounded border transition-colors"
              style={{ borderColor: '#E2E8F0', color: '#475569' }}
            >
              Login as Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
