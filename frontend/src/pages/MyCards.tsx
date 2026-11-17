import React, { useState } from 'react';
import { PageName, Badge, Btn } from '../Layout';
import { IconSearch, IconFilter, IconPlus, IconGrid, IconList, IconCard } from '../icons';
import { cardOwners, confirmedCards, employees, formatDate } from '../data';

interface Props {
  navigate: (page: PageName, params?: Record<string, string>) => void;
  userId: string;
}

export default function MyCards({ navigate, userId }: Props) {
  const [view, setView] = useState<'table' | 'grid'>('table');
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState('all');

  const myCards = confirmedCards.filter(c => cardOwners(c).includes(userId));
  const companies = [...new Set(myCards.map(c => c.extracted.company.value))];

  const filtered = myCards.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      c.extracted.name.value.toLowerCase().includes(q) ||
      c.extracted.company.value.toLowerCase().includes(q) ||
      c.extracted.email.value.toLowerCase().includes(q);
    const matchCompany = filterCompany === 'all' || c.extracted.company.value === filterCompany;
    return matchSearch && matchCompany;
  });

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>My Cards</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
            <span style={{ fontFamily: 'DM Mono, monospace', color: '#2563EB' }}>{myCards.length}</span> confirmed cards
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="secondary" size="sm" icon={IconFilter}>Filter</Btn>
          <Btn variant="primary" size="sm" icon={IconPlus} onClick={() => navigate('add-card')}>Add Card</Btn>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }}>
            <IconSearch size={15} />
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, company, email…"
            className="w-full border rounded-lg pl-9 pr-4 py-2 text-sm outline-none transition-colors"
            style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
            onFocus={e => (e.currentTarget.style.borderColor = '#2563EB')}
            onBlur={e => (e.currentTarget.style.borderColor = '#E2E8F0')}
          />
        </div>
        <select
          value={filterCompany}
          onChange={e => setFilterCompany(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm outline-none"
          style={{ borderColor: '#E2E8F0', color: '#374151' }}
        >
          <option value="all">All Companies</option>
          {companies.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex items-center border rounded-lg overflow-hidden" style={{ borderColor: '#E2E8F0' }}>
          <button
            onClick={() => setView('table')}
            className="p-2 transition-colors"
            style={{ background: view === 'table' ? '#EFF6FF' : 'white', color: view === 'table' ? '#2563EB' : '#94A3B8' }}
          >
            <IconList size={15} />
          </button>
          <button
            onClick={() => setView('grid')}
            className="p-2 transition-colors"
            style={{ background: view === 'grid' ? '#EFF6FF' : 'white', color: view === 'grid' ? '#2563EB' : '#94A3B8' }}
          >
            <IconGrid size={15} />
          </button>
        </div>
      </div>

      {/* Table view */}
      {view === 'table' && (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#E2E8F0' }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #F1F5F9', background: '#FAFAFA' }}>
                {['Card', 'Name', 'Company', 'Department', 'Position', 'Contact', 'Registered'].map(col => (
                  <th key={col} className="text-left px-4 py-3 text-xs font-medium" style={{ color: '#64748B' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-sm" style={{ color: '#94A3B8' }}>
                    No cards found
                  </td>
                </tr>
              ) : (
                filtered.map(card => (
                  <tr
                    key={card.id}
                    onClick={() => navigate('card-detail', { cardId: card.id })}
                    className="border-b cursor-pointer transition-colors hover:bg-gray-50"
                    style={{ borderColor: '#F1F5F9' }}
                  >
                    <td className="px-4 py-3">
                      <div className="w-12 h-8 rounded flex items-center justify-center text-xs font-bold" style={{ background: '#EFF6FF', color: '#2563EB', fontFamily: 'DM Mono, monospace' }}>
                        {card.extracted.name.value.slice(0, 2)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium" style={{ color: '#0F172A' }}>{card.extracted.name.value}</div>
                      <div className="text-xs" style={{ color: '#94A3B8' }}>{card.extracted.nameEn.value}</div>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: '#374151' }}>{card.extracted.company.value}</td>
                    <td className="px-4 py-3 text-xs max-w-[200px] truncate" style={{ color: '#64748B' }}>{card.extracted.department.value}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#F1F5F9', color: '#475569' }}>
                        {card.extracted.position.value}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs" style={{ color: '#374151' }}>{card.extracted.phone.value}</div>
                      <div className="text-xs" style={{ color: '#94A3B8' }}>{card.extracted.email.value}</div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>
                      {formatDate(card.reviewedAt || card.uploadedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Grid view */}
      {view === 'grid' && (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map(card => (
            <button
              key={card.id}
              onClick={() => navigate('card-detail', { cardId: card.id })}
              className="bg-white rounded-xl border p-4 text-left transition-all hover:shadow-md"
              style={{ borderColor: '#E2E8F0' }}
            >
              <div className="w-full h-20 rounded-lg mb-3 flex items-center justify-center" style={{ background: '#EFF6FF' }}>
                <div className="text-center">
                  <div className="text-xl font-bold" style={{ color: '#2563EB', fontFamily: 'DM Mono, monospace' }}>
                    {card.extracted.name.value.slice(0, 2)}
                  </div>
                  <div className="text-xs mt-1" style={{ color: '#93C5FD' }}>{card.extracted.company.value}</div>
                </div>
              </div>
              <div className="font-semibold text-sm mb-0.5" style={{ color: '#0F172A' }}>{card.extracted.name.value}</div>
              <div className="text-xs mb-1" style={{ color: '#64748B' }}>{card.extracted.position.value}</div>
              <div className="text-xs truncate" style={{ color: '#94A3B8' }}>{card.extracted.company.value}</div>
              <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid #F1F5F9' }}>
                <span className="text-xs" style={{ color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>
                  {formatDate(card.reviewedAt || card.uploadedAt)}
                </span>
                <Badge variant="success">Confirmed</Badge>
              </div>
            </button>
          ))}
          {/* Add card button */}
          <button
            onClick={() => navigate('add-card')}
            className="rounded-xl border-2 border-dashed p-4 flex flex-col items-center justify-center gap-2 transition-colors hover:bg-gray-50"
            style={{ borderColor: '#CBD5E1', minHeight: '180px' }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#F1F5F9' }}>
              <IconPlus size={18} style={{ color: '#94A3B8' }} />
            </div>
            <span className="text-sm font-medium" style={{ color: '#94A3B8' }}>Add new card</span>
          </button>
        </div>
      )}
    </div>
  );
}
