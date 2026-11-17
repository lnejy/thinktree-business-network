import { isLiveCard } from '../cardApi';
import React from 'react';
import { PageName, StatCard, Badge, SectionHeader, Btn } from '../Layout';
import { IconCard, IconBuilding, IconUser, IconInbox, IconArrowRight, IconSparkle, IconRefresh } from '../icons';
import { employees, confirmedCards, incomingCards, companies, contacts, formatDateTime } from '../data';

interface Props {
  navigate: (page: PageName, params?: Record<string, string>) => void;
  isAdmin: boolean;
  userId: string;
}

export default function Dashboard({ navigate, isAdmin, userId }: Props) {
  const myCards = confirmedCards.filter(c => c.ownerId === userId);
  const pending = incomingCards.filter(c => isLiveCard(c.id) && c.status === 'ready_for_review');
  const failed = incomingCards.filter(c => isLiveCard(c.id) && c.status === 'failed');

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      {/* Pending banner */}
      {pending.length > 0 && (
        <button
          onClick={() => navigate('incoming-cards')}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left transition-all"
          style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0" style={{ background: '#FEF3C7' }}>
            <IconInbox size={16} style={{ color: '#D97706' }} />
          </div>
          <div className="flex-1">
            <span className="text-sm font-semibold" style={{ color: '#92400E' }}>
              {pending.length} card{pending.length > 1 ? 's' : ''} waiting for your review
            </span>
            <span className="text-xs ml-2" style={{ color: '#B45309' }}>저장하기 전에 정보를 확인하세요.</span>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium" style={{ color: '#D97706' }}>
            Review now <IconArrowRight size={13} />
          </div>
        </button>
      )}

      {/* Stats */}
      <div>
        <div className="grid grid-cols-4 gap-4 mb-4">
          <StatCard label="My Registered Cards" value={myCards.length} sub="Confirmed & saved" icon={IconCard} />
          <StatCard label="Client Companies" value={companies.length} sub="Unique organizations" icon={IconBuilding} />
          <StatCard label="Client Contacts" value={contacts.length} sub="Across all companies" icon={IconUser} />
          <StatCard
            label="검토 대기"
            value={pending.length}
            sub={failed.length > 0 ? `${failed.length} failed` : 'From mobile uploads'}
            icon={IconInbox}
            accent={pending.length > 0 ? '#F59E0B' : undefined}
          />
        </div>

        {isAdmin && (
          <div className="grid grid-cols-4 gap-4 p-4 rounded-xl" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#94A3B8' }} />
              <span className="text-xs" style={{ color: '#64748B' }}>Total cards</span>
              <span className="text-xs font-bold ml-auto" style={{ color: '#0F172A', fontFamily: 'DM Mono, monospace' }}>{confirmedCards.length + incomingCards.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#94A3B8' }} />
              <span className="text-xs" style={{ color: '#64748B' }}>Total employees</span>
              <span className="text-xs font-bold ml-auto" style={{ color: '#0F172A', fontFamily: 'DM Mono, monospace' }}>{employees.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#F59E0B' }} />
              <span className="text-xs" style={{ color: '#64748B' }}>검토 대기</span>
              <span className="text-xs font-bold ml-auto" style={{ color: '#D97706', fontFamily: 'DM Mono, monospace' }}>{pending.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#EF4444' }} />
              <span className="text-xs" style={{ color: '#64748B' }}>명함 읽기 실패</span>
              <span className="text-xs font-bold ml-auto" style={{ color: '#EF4444', fontFamily: 'DM Mono, monospace' }}>{failed.length}</span>
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Recent cards */}
        <div className="col-span-2 bg-white rounded-xl border" style={{ borderColor: '#E2E8F0' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#F1F5F9' }}>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: '#0F172A' }}>Recent Cards</h2>
              <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Your most recently confirmed cards</p>
            </div>
            <Btn variant="ghost" size="sm" onClick={() => navigate('my-cards')}>View all</Btn>
          </div>
          <div className="divide-y" style={{ borderColor: '#F1F5F9' }}>
            {confirmedCards.slice(0, 4).map(card => {
              const initials = card.extracted.name.value.slice(0, 2);
              return (
                <button
                  key={card.id}
                  onClick={() => navigate('card-detail', { cardId: card.id })}
                  className="flex items-center gap-3 w-full px-5 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-7 rounded shrink-0 overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold rounded" style={{ background: '#EFF6FF', color: '#2563EB', fontFamily: 'DM Mono, monospace' }}>
                      {initials}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: '#0F172A' }}>{card.extracted.name.value}</span>
                      <span className="text-xs" style={{ color: '#94A3B8' }}>{card.extracted.position.value}</span>
                    </div>
                    <div className="text-xs truncate" style={{ color: '#64748B' }}>{card.extracted.company.value} · {card.extracted.department.value}</div>
                  </div>
                  <div className="text-xs shrink-0" style={{ color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>{card.reviewedAt?.slice(0, 10)}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Incoming cards */}
          <div className="bg-white rounded-xl border" style={{ borderColor: '#E2E8F0' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#F1F5F9' }}>
              <h2 className="text-sm font-semibold" style={{ color: '#0F172A' }}>Incoming Cards</h2>
              <Btn variant="ghost" size="sm" onClick={() => navigate('incoming-cards')}>View all</Btn>
            </div>
            <div className="p-4 space-y-2.5">
              {incomingCards.filter(c => isLiveCard(c.id)).slice(0, 3).map(card => {
                const uploader = employees.find(e => e.id === card.ownerId);
                const isReady = card.status === 'ready_for_review';
                return (
                  <button
                    key={card.id}
                    onClick={() => isReady && navigate('ai-recognition', { cardId: card.id })}
                    className="flex items-center gap-2.5 w-full p-2.5 rounded-lg text-left transition-colors"
                    style={{ background: isReady ? '#FFFBEB' : '#F8FAFC', cursor: isReady ? 'pointer' : 'default' }}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 text-white" style={{ background: uploader?.avatarColor || '#94A3B8' }}>
                      {uploader?.name.slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate" style={{ color: '#0F172A' }}>
                        {card.extracted.company.value || 'Unknown company'}
                      </div>
                      <div className="text-xs truncate" style={{ color: '#94A3B8' }}>by {uploader?.name}</div>
                    </div>
                    {isReady && <div className="w-2 h-2 rounded-full shrink-0" style={{ background: '#F59E0B' }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-xl border" style={{ borderColor: '#E2E8F0' }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: '#F1F5F9' }}>
              <h2 className="text-sm font-semibold" style={{ color: '#0F172A' }}>Quick Actions</h2>
            </div>
            <div className="p-4 space-y-2">
              {[
                { label: 'Scan New Card', sub: 'Mobile capture flow', icon: IconSparkle, page: 'mobile-capture' as PageName, color: '#2563EB' },
                { label: 'View Organizations', sub: 'Client org charts', icon: IconBuilding, page: 'org-chart' as PageName, color: '#7C3AED' },
                { label: 'Business Network', sub: 'Relationship map', icon: IconUser, page: 'business-network' as PageName, color: '#059669' },
              ].map(({ label, sub, icon: Icon, page, color }) => (
                <button
                  key={page}
                  onClick={() => navigate(page)}
                  className="flex items-center gap-3 w-full p-2.5 rounded-lg text-left transition-colors hover:bg-gray-50"
                >
                  <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
                    <Icon size={14} style={{ color }} />
                  </div>
                  <div>
                    <div className="text-xs font-medium" style={{ color: '#0F172A' }}>{label}</div>
                    <div className="text-xs" style={{ color: '#94A3B8' }}>{sub}</div>
                  </div>
                  <IconArrowRight size={12} className="ml-auto shrink-0" style={{ color: '#CBD5E1' }} />
                </button>
              ))}
            </div>
          </div>

          {/* Recent companies */}
          <div className="bg-white rounded-xl border" style={{ borderColor: '#E2E8F0' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#F1F5F9' }}>
              <h2 className="text-sm font-semibold" style={{ color: '#0F172A' }}>Active Companies</h2>
              <Btn variant="ghost" size="sm" onClick={() => navigate('companies')}>View all</Btn>
            </div>
            <div className="px-4 py-3 space-y-2">
              {companies.slice(0, 4).map(company => (
                <button
                  key={company.id}
                  onClick={() => navigate('company-detail', { companyId: company.id })}
                  className="flex items-center gap-2.5 w-full text-left"
                >
                  <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0" style={{ background: '#F0F4FF', color: '#2563EB' }}>
                    {company.nameEn[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate" style={{ color: '#0F172A' }}>{company.name}</div>
                  </div>
                  <div className="text-xs" style={{ color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>{company.contactCount} contacts</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
