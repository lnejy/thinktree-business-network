import React, { useState } from 'react';
import { PageName, Badge, Btn } from '../Layout';
import { IconSearch, IconFilter, IconBuilding, IconUser, IconCard, IconArrowRight, IconAlertTriangle } from '../icons';
import { companies } from '../data';
import { PendingCardsNotice } from '../components/PendingCardsNotice';

interface Props {
  navigate: (page: PageName, params?: Record<string, string>) => void;
}

const industryColors: Record<string, string> = {
  '전자/반도체': '#2563EB',
  'IT 서비스': '#7C3AED',
  '통신': '#059669',
  'IT/플랫폼': '#D97706',
  '자동차': '#DC2626',
  'SaaS': '#0891B2',
};

export default function Companies({ navigate }: Props) {
  const [search, setSearch] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('all');
  const [view, setView] = useState<'grid' | 'table'>('grid');

  const industries = [...new Set(companies.map(c => c.industry))];

  const filtered = companies.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q) || c.domain.toLowerCase().includes(q);
    const matchIndustry = filterIndustry === 'all' || c.industry === filterIndustry;
    return matchSearch && matchIndustry;
  });

  const duplicates = companies.filter(c => c.duplicateCandidateOf);

  return (
    <div className="p-6 space-y-5">
      <PendingCardsNotice navigate={navigate} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>Companies</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
            <span style={{ fontFamily: 'DM Mono, monospace', color: '#2563EB' }}>{companies.length}</span> registered client organizations
          </p>
        </div>
      </div>

      {/* Duplicate alert */}
      {duplicates.length > 0 && (
        <button
          onClick={() => navigate('admin')}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left"
          style={{ background: '#FEF2F2', border: '1px solid #FCA5A5' }}
        >
          <IconAlertTriangle size={16} style={{ color: '#DC2626', flexShrink: 0 }} />
          <span className="text-sm font-medium" style={{ color: '#991B1B' }}>
            {duplicates.length} potential duplicate company detected — review in Admin
          </span>
          <IconArrowRight size={14} className="ml-auto" style={{ color: '#EF4444' }} />
        </button>
      )}

      {/* Search + filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }}>
            <IconSearch size={15} />
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search companies…"
            className="w-full border rounded-lg pl-9 pr-4 py-2 text-sm outline-none"
            style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
            onFocus={e => (e.currentTarget.style.borderColor = '#2563EB')}
            onBlur={e => (e.currentTarget.style.borderColor = '#E2E8F0')}
          />
        </div>
        <select
          value={filterIndustry}
          onChange={e => setFilterIndustry(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm outline-none"
          style={{ borderColor: '#E2E8F0', color: '#374151' }}
        >
          <option value="all">All Industries</option>
          {industries.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
        <div className="flex items-center border rounded-lg overflow-hidden" style={{ borderColor: '#E2E8F0' }}>
          <button onClick={() => setView('grid')} className="p-2 transition-colors" style={{ background: view === 'grid' ? '#EFF6FF' : 'white', color: view === 'grid' ? '#2563EB' : '#94A3B8' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          </button>
          <button onClick={() => setView('table')} className="p-2 transition-colors" style={{ background: view === 'table' ? '#EFF6FF' : 'white', color: view === 'table' ? '#2563EB' : '#94A3B8' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
        </div>
      </div>

      {/* Grid */}
      {view === 'grid' && (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map(company => {
            const color = industryColors[company.industry] || '#2563EB';
            return (
              <button
                key={company.id}
                onClick={() => navigate('company-detail', { companyId: company.id })}
                className="bg-white rounded-xl border p-5 text-left transition-all hover:shadow-md group"
                style={{ borderColor: '#E2E8F0' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center justify-center w-11 h-11 rounded-xl text-lg font-bold" style={{ background: `${color}12`, color }}>
                    {company.nameEn[0]}
                  </div>
                  {company.duplicateCandidateOf && (
                    <Badge variant="warning">Duplicate?</Badge>
                  )}
                </div>

                <div className="mb-1 font-semibold" style={{ color: '#0F172A' }}>{company.name}</div>
                <div className="text-xs mb-1" style={{ color: '#94A3B8' }}>{company.nameEn}</div>
                <div className="text-xs mb-3" style={{ color: '#64748B', fontFamily: 'DM Mono, monospace' }}>{company.domain}</div>

                <div className="mb-3">
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: `${color}12`, color }}>{company.industry}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3" style={{ borderTop: '1px solid #F1F5F9' }}>
                  <div className="text-center">
                    <div className="text-sm font-bold" style={{ color: '#0F172A', fontFamily: 'DM Mono, monospace' }}>{company.cardCount}</div>
                    <div className="text-xs" style={{ color: '#94A3B8' }}>Cards</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold" style={{ color: '#0F172A', fontFamily: 'DM Mono, monospace' }}>{company.contactCount}</div>
                    <div className="text-xs" style={{ color: '#94A3B8' }}>Contacts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold" style={{ color: '#0F172A', fontFamily: 'DM Mono, monospace' }}>{company.connectedEmployeeCount}</div>
                    <div className="text-xs" style={{ color: '#94A3B8' }}>Internal</div>
                  </div>
                </div>

                <div className="flex items-center gap-1 mt-3 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#2563EB' }}>
                  View details <IconArrowRight size={12} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Table */}
      {view === 'table' && (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#E2E8F0' }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #F1F5F9', background: '#FAFAFA' }}>
                {['Company', 'Industry', 'Domain', 'Cards', 'Contacts', 'Departments', 'Internal Connections'].map(col => (
                  <th key={col} className="text-left px-4 py-3 text-xs font-medium" style={{ color: '#64748B' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(company => {
                const color = industryColors[company.industry] || '#2563EB';
                return (
                  <tr
                    key={company.id}
                    onClick={() => navigate('company-detail', { companyId: company.id })}
                    className="border-b cursor-pointer hover:bg-gray-50 transition-colors"
                    style={{ borderColor: '#F1F5F9' }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0" style={{ background: `${color}12`, color }}>
                          {company.nameEn[0]}
                        </div>
                        <div>
                          <div className="text-sm font-medium" style={{ color: '#0F172A' }}>{company.name}</div>
                          <div className="text-xs" style={{ color: '#94A3B8' }}>{company.nameEn}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded" style={{ background: `${color}12`, color }}>{company.industry}</span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#64748B', fontFamily: 'DM Mono, monospace' }}>{company.domain}</td>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: '#0F172A', fontFamily: 'DM Mono, monospace' }}>{company.cardCount}</td>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: '#0F172A', fontFamily: 'DM Mono, monospace' }}>{company.contactCount}</td>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: '#0F172A', fontFamily: 'DM Mono, monospace' }}>{company.departmentCount}</td>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: '#0F172A', fontFamily: 'DM Mono, monospace' }}>{company.connectedEmployeeCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
