import { isLiveCard } from '../cardApi';
import React, { useState } from 'react';
import { PageName, StatCard, Badge, Btn } from '../Layout';
import { IconCard, IconBuilding, IconUser, IconAlertTriangle, IconMerge, IconSparkle } from '../icons';
import { cardOwners, companies, employees, contacts, confirmedCards, incomingCards, formatDate } from '../data';

interface Props {
  navigate: (page: PageName, params?: Record<string, string>) => void;
  isAdmin: boolean;
}

export default function Admin({ navigate, isAdmin }: Props) {
  const [mergeDecision, setMergeDecision] = useState<Record<string, 'merge' | 'create' | null>>({});

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: '#FEF2F2' }}>
            <IconAlertTriangle size={24} style={{ color: '#DC2626' }} />
          </div>
          <h2 className="text-base font-semibold mb-1" style={{ color: '#0F172A' }}>Admin access required</h2>
          <p className="text-sm" style={{ color: '#64748B' }}>Contact your administrator to access this section.</p>
        </div>
      </div>
    );
  }

  const failed = incomingCards.filter(c => isLiveCard(c.id) && c.status === 'failed');
  const pending = incomingCards.filter(c => isLiveCard(c.id) && c.status === 'ready_for_review');
  const duplicateCandidates = companies.filter(c => c.duplicateCandidateOf);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>Admin Dashboard</h1>
        <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>Full system overview and management</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard label="Total Cards" value={confirmedCards.length + incomingCards.length} sub={`${confirmedCards.length} confirmed`} icon={IconCard} />
        <StatCard label="Companies" value={companies.length} sub="Unique orgs" icon={IconBuilding} />
        <StatCard label="Contacts" value={contacts.length} sub="Mapped people" icon={IconUser} />
        <StatCard label="Team Members" value={employees.length} sub="Active users" icon={IconUser} accent="#7C3AED" />
        <StatCard label="Pending Review" value={pending.length} sub={`${failed.length} failed`} icon={IconSparkle} accent="#F59E0B" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Employee cards overview */}
        <div className="bg-white rounded-xl border" style={{ borderColor: '#E2E8F0' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: '#F1F5F9' }}>
            <h3 className="text-sm font-semibold" style={{ color: '#0F172A' }}>Cards per Employee</h3>
          </div>
          <div className="divide-y" style={{ borderColor: '#F1F5F9' }}>
            {employees.map(emp => {
              const cardCount = confirmedCards.filter(c => cardOwners(c).includes(emp.id)).length;
              const maxCards = 5;
              return (
                <div key={emp.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0" style={{ background: emp.avatarColor }}>
                    {emp.name.slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate" style={{ color: '#0F172A' }}>{emp.name}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
                        <div className="h-full rounded-full" style={{ width: `${(cardCount / maxCards) * 100}%`, background: emp.avatarColor }} />
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold shrink-0" style={{ color: '#0F172A', fontFamily: 'DM Mono, monospace' }}>{cardCount}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Company overview */}
        <div className="bg-white rounded-xl border" style={{ borderColor: '#E2E8F0' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: '#F1F5F9' }}>
            <h3 className="text-sm font-semibold" style={{ color: '#0F172A' }}>Cards per Company</h3>
          </div>
          <div className="divide-y" style={{ borderColor: '#F1F5F9' }}>
            {companies.slice(0, 6).map(company => {
              const maxCards = 12;
              return (
                <button
                  key={company.id}
                  onClick={() => navigate('company-detail', { companyId: company.id })}
                  className="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                    {company.nameEn[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate" style={{ color: '#0F172A' }}>{company.name}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
                        <div className="h-full rounded-full" style={{ width: `${(company.cardCount / maxCards) * 100}%`, background: '#2563EB' }} />
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold shrink-0" style={{ color: '#0F172A', fontFamily: 'DM Mono, monospace' }}>{company.cardCount}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* AI failures + issues */}
        <div className="space-y-4">
          {/* Failed cards */}
          <div className="bg-white rounded-xl border" style={{ borderColor: '#E2E8F0' }}>
            <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: '#F1F5F9' }}>
              <h3 className="text-sm font-semibold" style={{ color: '#0F172A' }}>다시 읽어야 할 명함</h3>
              <Badge variant="error">{failed.length}</Badge>
            </div>
            <div className="p-3 space-y-2">
              {failed.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: '#94A3B8' }}>No failures 🎉</p>
              ) : (
                failed.map(card => {
                  const uploader = employees.find(e => e.id === card.ownerId);
                  return (
                    <div key={card.id} className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: '#FEF2F2' }}>
                      <IconAlertTriangle size={13} style={{ color: '#DC2626', flexShrink: 0 }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium" style={{ color: '#991B1B' }}>명함 읽기 실패</div>
                        <div className="text-xs truncate" style={{ color: '#DC2626' }}>by {uploader?.name} · {formatDate(card.uploadedAt)}</div>
                      </div>
                      <Btn variant="secondary" size="sm" onClick={() => navigate('incoming-cards')}>수신 명함 보기</Btn>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Pending queue */}
          <div className="bg-white rounded-xl border" style={{ borderColor: '#E2E8F0' }}>
            <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: '#F1F5F9' }}>
              <h3 className="text-sm font-semibold" style={{ color: '#0F172A' }}>검토 대기</h3>
              <Badge variant="warning">{pending.length}</Badge>
            </div>
            <div className="p-3">
              <Btn variant="secondary" size="sm" onClick={() => navigate('incoming-cards')}>View all pending</Btn>
            </div>
          </div>
        </div>
      </div>

      {/* Duplicate company matching */}
      {duplicateCandidates.length > 0 && (
        <div className="bg-white rounded-xl border" style={{ borderColor: '#E2E8F0' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: '#F1F5F9' }}>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold" style={{ color: '#0F172A' }}>Duplicate Company Candidates</h3>
              <Badge variant="warning">{duplicateCandidates.length}</Badge>
              <Badge variant="ai">AI-detected</Badge>
            </div>
            <p className="text-xs" style={{ color: '#64748B' }}>AI detected possible duplicates based on name similarity, domain, and address matching</p>
          </div>
          <div className="p-5 space-y-4">
            {duplicateCandidates.map(dupe => {
              const decision = mergeDecision[dupe.id];
              return (
                <div key={dupe.id} className="border rounded-xl overflow-hidden" style={{ borderColor: '#E2E8F0' }}>
                  <div className="px-4 py-3" style={{ background: '#FFFBEB', borderBottom: '1px solid #FDE68A' }}>
                    <div className="flex items-center gap-2">
                      <IconAlertTriangle size={14} style={{ color: '#D97706' }} />
                      <span className="text-xs font-semibold" style={{ color: '#92400E' }}>
                        Possible duplicate detected
                      </span>
                      <span className="ml-auto text-xs font-bold" style={{ color: '#D97706', fontFamily: 'DM Mono, monospace' }}>
                        {dupe.similarity}% similarity
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="rounded-lg p-3 border" style={{ borderColor: '#BFDBFE', background: '#EFF6FF' }}>
                        <div className="text-xs font-medium mb-2" style={{ color: '#1E40AF' }}>Detected (New)</div>
                        <div className="text-sm font-bold" style={{ color: '#0F172A' }}>{dupe.nameEn}</div>
                        <div className="text-xs mt-1" style={{ color: '#64748B', fontFamily: 'DM Mono, monospace' }}>{dupe.domain}</div>
                        <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{dupe.address}</div>
                      </div>
                      <div className="rounded-lg p-3 border" style={{ borderColor: '#DDD6FE', background: '#F5F3FF' }}>
                        <div className="text-xs font-medium mb-2" style={{ color: '#6D28D9' }}>Existing Company</div>
                        <div className="text-sm font-bold" style={{ color: '#0F172A' }}>{dupe.duplicateCandidateOf}</div>
                        <div className="text-xs mt-1" style={{ color: '#64748B' }}>—</div>
                      </div>
                    </div>

                    {!decision ? (
                      <div className="flex gap-3">
                        <button
                          onClick={() => setMergeDecision(v => ({ ...v, [dupe.id]: 'merge' }))}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                          style={{ background: '#2563EB' }}
                        >
                          <IconMerge size={14} />
                          Merge with Existing
                        </button>
                        <button
                          onClick={() => setMergeDecision(v => ({ ...v, [dupe.id]: 'create' }))}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border"
                          style={{ borderColor: '#E2E8F0', color: '#374151', background: 'white' }}
                        >
                          Keep as New Company
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#ECFDF5' }}>
                        <span className="text-xs font-semibold" style={{ color: '#059669' }}>
                          {decision === 'merge' ? '✓ Will merge with existing' : '✓ Will create as new company'}
                        </span>
                        <button onClick={() => setMergeDecision(v => ({ ...v, [dupe.id]: null }))} className="ml-auto text-xs" style={{ color: '#64748B' }}>Undo</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div className="bg-white rounded-xl border" style={{ borderColor: '#E2E8F0' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: '#F1F5F9' }}>
          <h3 className="text-sm font-semibold" style={{ color: '#0F172A' }}>Recent Activity</h3>
        </div>
        <div className="divide-y" style={{ borderColor: '#F1F5F9' }}>
          {[...confirmedCards].sort((a, b) => new Date(b.reviewedAt || '').getTime() - new Date(a.reviewedAt || '').getTime()).slice(0, 5).map(card => {
            const owner = employees.find(e => e.id === card.ownerId);
            return (
              <div key={card.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: '#10B981' }} />
                <div className="flex-1 text-sm" style={{ color: '#374151' }}>
                  <span className="font-medium">{owner?.name}</span> confirmed card —{' '}
                  <span style={{ color: '#0F172A' }}>{card.extracted.name.value}</span>
                  <span style={{ color: '#94A3B8' }}> at {card.extracted.company.value}</span>
                </div>
                <div className="text-xs shrink-0" style={{ color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>
                  {formatDate(card.reviewedAt || card.uploadedAt)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
