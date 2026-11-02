import { refreshCards, request, isLiveCard, type LiveCard } from '../cardApi';
import React, { useState } from 'react';
import { PageName, StatusBadge, ConfidenceBadge, Btn } from '../Layout';
import { IconSearch, IconFilter, IconRefresh, IconAlertTriangle, IconSparkle } from '../icons';
import { incomingCards, employees, formatDateTime } from '../data';

interface Props {
  navigate: (page: PageName, params?: Record<string, string>) => void;
}

export default function IncomingCards({ navigate }: Props) {
  const [error, setError] = useState('');
  const retry = async (id: string) => {
    try { await request(`/api/cards/${id}/retry`, { method: 'POST' }); await refreshCards(); setError(''); }
    catch (e) { setError((e as Error).message); }
  };
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const pending = incomingCards.filter(c => c.status === 'ready_for_review' || (c.status === 'ai_structuring' || c.status === 'ocr_processing'));
  const failed = incomingCards.filter(c => c.status === 'failed');

  const filtered = incomingCards.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (c.extracted.company.value || '').toLowerCase().includes(q) ||
      (c.extracted.name.value || '').toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statusCounts = {
    ready_for_review: incomingCards.filter(c => c.status === 'ready_for_review').length,
    ai_structuring: incomingCards.filter(c => (c.status === 'ai_structuring' || c.status === 'ocr_processing')).length,
    failed: incomingCards.filter(c => c.status === 'failed').length,
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>Incoming Cards</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>Review mobile-captured cards after AI processing</p>
        </div>
        <Btn variant="secondary" size="sm" icon={IconRefresh} onClick={() => { refreshCards().then(() => setError('')).catch(e => setError(e.message)); }}>Refresh</Btn>
      </div>

      {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Incoming', value: incomingCards.length, color: '#475569', bg: '#F8FAFC' },
          { label: 'Ready for Review', value: statusCounts.ready_for_review, color: '#D97706', bg: '#FFFBEB' },
          { label: 'AI Processing', value: statusCounts.ai_structuring, color: '#7C3AED', bg: '#F5F3FF' },
          { label: 'Failed', value: statusCounts.failed, color: '#DC2626', bg: '#FEF2F2' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="rounded-xl border px-4 py-3" style={{ borderColor: '#E2E8F0', background: bg }}>
            <div className="text-xs mb-1" style={{ color: '#64748B' }}>{label}</div>
            <div className="text-xl font-bold" style={{ color, fontFamily: 'DM Mono, monospace' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* AI processing banner */}
      {statusCounts.ai_structuring > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
          <div className="flex items-center justify-center w-7 h-7 rounded-lg" style={{ background: '#EDE9FE' }}>
            <IconSparkle size={14} style={{ color: '#7C3AED' }} />
          </div>
          <div className="flex-1">
            <span className="text-sm font-medium" style={{ color: '#6D28D9' }}>
              AI is processing {statusCounts.ai_structuring} card{statusCounts.ai_structuring > 1 ? 's' : ''}
            </span>
            <span className="text-xs ml-2" style={{ color: '#8B5CF6' }}>OCR extraction in progress — this typically takes 10–30 seconds</span>
          </div>
          <div className="w-4 h-4 border-2 rounded-full border-t-transparent animate-spin" style={{ borderColor: '#7C3AED', borderTopColor: 'transparent' }} />
        </div>
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
            placeholder="Search by company or name…"
            className="w-full border rounded-lg pl-9 pr-4 py-2 text-sm outline-none"
            style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
            onFocus={e => (e.currentTarget.style.borderColor = '#2563EB')}
            onBlur={e => (e.currentTarget.style.borderColor = '#E2E8F0')}
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm outline-none"
          style={{ borderColor: '#E2E8F0', color: '#374151' }}
        >
          <option value="all">All Status</option>
          <option value="ready_for_review">Ready for Review</option>
          <option value="ocr_processing">OCR Processing</option>
          <option value="ai_structuring">AI Processing</option>
          <option value="failed">Failed</option>
          <option value="reviewed">Reviewed</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-x-auto" style={{ borderColor: '#E2E8F0' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid #F1F5F9', background: '#FAFAFA' }}>
              {['Card Preview', 'Uploaded By', 'Upload Time', 'Detected Company', 'Detected Name', 'Status', 'Confidence', 'Action'].map(col => (
                <th key={col} className="text-left px-4 py-3 text-xs font-medium" style={{ color: '#64748B' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(card => {
              const uploader = employees.find(e => e.id === card.ownerId);
              const isReady = card.status === 'ready_for_review';
              const isFailed = card.status === 'failed';
              const isProcessing = card.status === 'ai_structuring' || card.status === 'ocr_processing';

              return (
                <tr
                  key={card.id}
                  className="border-b transition-colors"
                  style={{
                    borderColor: '#F1F5F9',
                    background: isReady ? '#FFFEFB' : isFailed ? '#FFF9F9' : 'white',
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="w-16 h-10 rounded flex items-center justify-center text-xs font-bold relative overflow-hidden" style={{ background: isProcessing ? '#F5F3FF' : '#EFF6FF' }}>
                      {isProcessing ? (
                        <div className="ai-shimmer absolute inset-0" />
                      ) : (
                        <span style={{ color: '#2563EB', fontFamily: 'DM Mono, monospace', position: 'relative' }}>
                          {card.extracted.name.value ? card.extracted.name.value.slice(0, 2) : '??'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0" style={{ background: uploader?.avatarColor || '#94A3B8' }}>
                        {uploader?.name.slice(0, 1)}
                      </div>
                      <div>
                        <div className="text-xs font-medium" style={{ color: '#0F172A' }}>{uploader?.name}</div>
                        <div className="text-xs" style={{ color: '#94A3B8' }}>{uploader?.department}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#64748B', fontFamily: 'DM Mono, monospace' }}>
                    {formatDateTime(card.uploadedAt)}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: '#0F172A' }}>
                    {(card as LiveCard).source === 'sample' && <span className="text-xs text-violet-600">[샘플] </span>}{!isLiveCard(card.id) && <span className="text-xs text-slate-400">[예시] </span>}{card.extracted.company.value || (
                      <span style={{ color: '#94A3B8' }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: '#374151' }}>
                    {card.extracted.name.value || (
                      <span style={{ color: '#94A3B8' }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {isProcessing && <div className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#7C3AED', borderTopColor: 'transparent' }} />}
                      <StatusBadge status={card.status} />
                    </div>
                    {(card as LiveCard).error && <p className="text-xs text-red-600 mt-1 max-w-48">{(card as LiveCard).error}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {card.confidence > 0 ? (
                      <ConfidenceBadge score={card.confidence} />
                    ) : (
                      <span style={{ color: '#CBD5E1', fontSize: '12px' }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {(isReady || card.status === 'reviewed') && (
                      <button
                        onClick={() => navigate('ai-recognition', { cardId: card.id })}
                        className="text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
                        style={{ background: '#FEF3C7', color: '#D97706', border: '1px solid #FDE68A' }}
                      >
                        Review →
                      </button>
                    )}
                    {isFailed && (
                      <button disabled={!isLiveCard(card.id)} onClick={() => retry(card.id)} title={(card as LiveCard).error || '예시 명함은 재시도할 수 없습니다'} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 disabled:opacity-40">
                        <IconAlertTriangle size={12} />
                        Retry
                      </button>
                    )}
                    {isProcessing && (
                      <span className="text-xs" style={{ color: '#94A3B8' }}>Processing…</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
