import React, { useState } from 'react';
import { PageName, Badge } from '../Layout';
import { IconSearch, IconBuilding, IconUser, IconCard, IconArrowRight } from '../icons';
import { companies, contacts, employees, confirmedCards } from '../data';

interface Props {
  navigate: (page: PageName, params?: Record<string, string>) => void;
}

export default function Search({ navigate }: Props) {
  const [query, setQuery] = useState('');

  const q = query.toLowerCase().trim();

  const matchedCompanies = q ? companies.filter(c =>
    c.name.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q) || c.domain.toLowerCase().includes(q)
  ) : [];

  const matchedContacts = q ? contacts.filter(c =>
    c.name.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q) ||
    c.email.toLowerCase().includes(q) || c.position.toLowerCase().includes(q) ||
    c.department.toLowerCase().includes(q)
  ) : [];

  const matchedEmployees = q ? employees.filter(e =>
    e.name.toLowerCase().includes(q) || e.nameEn.toLowerCase().includes(q) ||
    e.position.toLowerCase().includes(q) || e.department.toLowerCase().includes(q)
  ) : [];

  const matchedCards = q ? confirmedCards.filter(c =>
    c.extracted.name.value.toLowerCase().includes(q) ||
    c.extracted.company.value.toLowerCase().includes(q) ||
    c.extracted.email.value.toLowerCase().includes(q)
  ) : [];

  const totalResults = matchedCompanies.length + matchedContacts.length + matchedEmployees.length + matchedCards.length;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold mb-4" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>Global Search</h1>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }}>
            <IconSearch size={18} />
          </div>
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search companies, contacts, employees, cards…"
            className="w-full border-2 rounded-xl pl-12 pr-4 py-3.5 text-base outline-none transition-colors"
            style={{ borderColor: query ? '#2563EB' : '#E2E8F0', color: '#0F172A' }}
          />
          {query && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs px-2 py-0.5 rounded" style={{ background: '#EFF6FF', color: '#2563EB', fontFamily: 'DM Mono, monospace' }}>
              {totalResults} results
            </div>
          )}
        </div>
      </div>

      {!query && (
        <div>
          <div className="text-sm font-medium mb-3" style={{ color: '#64748B' }}>Quick access</div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'All Companies', count: companies.length, icon: IconBuilding, page: 'companies' as PageName, color: '#2563EB' },
              { label: 'All Contacts', count: contacts.length, icon: IconUser, page: 'business-network' as PageName, color: '#7C3AED' },
              { label: 'My Cards', count: confirmedCards.length, icon: IconCard, page: 'my-cards' as PageName, color: '#059669' },
              { label: 'Our Team', count: employees.length, icon: IconUser, page: 'admin' as PageName, color: '#D97706' },
            ].map(({ label, count, icon: Icon, page, color }) => (
              <button
                key={label}
                onClick={() => navigate(page)}
                className="flex items-center gap-3 p-4 bg-white rounded-xl border text-left transition-all hover:shadow-sm"
                style={{ borderColor: '#E2E8F0' }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}12`, color }}>
                  <Icon size={18} />
                </div>
                <div>
                  <div className="text-sm font-medium" style={{ color: '#0F172A' }}>{label}</div>
                  <div className="text-xs" style={{ color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>{count} records</div>
                </div>
                <IconArrowRight size={14} className="ml-auto" style={{ color: '#CBD5E1' }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {query && totalResults === 0 && (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: '#F8FAFC' }}>
            <IconSearch size={22} style={{ color: '#CBD5E1' }} />
          </div>
          <p className="text-sm" style={{ color: '#64748B' }}>No results for "{query}"</p>
          <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>Try searching by name, company, or email</p>
        </div>
      )}

      {query && (
        <div className="space-y-6">
          {/* Companies */}
          {matchedCompanies.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold uppercase" style={{ color: '#94A3B8', letterSpacing: '0.08em' }}>Companies</span>
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#F1F5F9', color: '#64748B', fontFamily: 'DM Mono, monospace' }}>{matchedCompanies.length}</span>
              </div>
              <div className="space-y-2">
                {matchedCompanies.map(company => (
                  <button
                    key={company.id}
                    onClick={() => navigate('company-detail', { companyId: company.id })}
                    className="flex items-center gap-3 w-full bg-white p-3.5 rounded-xl border text-left hover:bg-gray-50 transition-colors"
                    style={{ borderColor: '#E2E8F0' }}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                      {company.nameEn[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium" style={{ color: '#0F172A' }}>{company.name}</div>
                      <div className="text-xs" style={{ color: '#94A3B8' }}>{company.nameEn} · {company.domain}</div>
                    </div>
                    <Badge variant="muted">{company.contactCount} contacts</Badge>
                    <IconArrowRight size={14} style={{ color: '#CBD5E1' }} />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Contacts */}
          {matchedContacts.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold uppercase" style={{ color: '#94A3B8', letterSpacing: '0.08em' }}>Contacts</span>
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#F1F5F9', color: '#64748B', fontFamily: 'DM Mono, monospace' }}>{matchedContacts.length}</span>
              </div>
              <div className="space-y-2">
                {matchedContacts.map(contact => {
                  const co = companies.find(c => c.id === contact.companyId);
                  return (
                    <button
                      key={contact.id}
                      onClick={() => navigate('company-detail', { companyId: contact.companyId })}
                      className="flex items-center gap-3 w-full bg-white p-3.5 rounded-xl border text-left hover:bg-gray-50 transition-colors"
                      style={{ borderColor: '#E2E8F0' }}
                    >
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
                        {contact.name.slice(0, 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium" style={{ color: '#0F172A' }}>{contact.name} <span className="font-normal text-xs" style={{ color: '#94A3B8' }}>{contact.nameEn}</span></div>
                        <div className="text-xs" style={{ color: '#94A3B8' }}>{co?.name} · {contact.position}</div>
                      </div>
                      <Badge variant="muted">{contact.ownerIds.length} owners</Badge>
                      <IconArrowRight size={14} style={{ color: '#CBD5E1' }} />
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Employees */}
          {matchedEmployees.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold uppercase" style={{ color: '#94A3B8', letterSpacing: '0.08em' }}>Team Members</span>
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#F1F5F9', color: '#64748B', fontFamily: 'DM Mono, monospace' }}>{matchedEmployees.length}</span>
              </div>
              <div className="space-y-2">
                {matchedEmployees.map(emp => (
                  <div key={emp.id} className="flex items-center gap-3 bg-white p-3.5 rounded-xl border" style={{ borderColor: '#E2E8F0' }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0" style={{ background: emp.avatarColor }}>
                      {emp.name.slice(0, 1)}
                    </div>
                    <div>
                      <div className="text-sm font-medium" style={{ color: '#0F172A' }}>{emp.name} <span className="font-normal text-xs" style={{ color: '#94A3B8' }}>{emp.nameEn}</span></div>
                      <div className="text-xs" style={{ color: '#94A3B8' }}>{emp.position} · {emp.department}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Cards */}
          {matchedCards.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold uppercase" style={{ color: '#94A3B8', letterSpacing: '0.08em' }}>Business Cards</span>
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#F1F5F9', color: '#64748B', fontFamily: 'DM Mono, monospace' }}>{matchedCards.length}</span>
              </div>
              <div className="space-y-2">
                {matchedCards.map(card => (
                  <button
                    key={card.id}
                    onClick={() => navigate('card-detail', { cardId: card.id })}
                    className="flex items-center gap-3 w-full bg-white p-3.5 rounded-xl border text-left hover:bg-gray-50 transition-colors"
                    style={{ borderColor: '#E2E8F0' }}
                  >
                    <div className="w-12 h-8 rounded flex items-center justify-center text-xs font-bold shrink-0" style={{ background: '#EFF6FF', color: '#2563EB', fontFamily: 'DM Mono, monospace' }}>
                      {card.extracted.name.value.slice(0, 2)}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium" style={{ color: '#0F172A' }}>{card.extracted.name.value}</div>
                      <div className="text-xs" style={{ color: '#94A3B8' }}>{card.extracted.company.value} · {card.extracted.position.value}</div>
                    </div>
                    <Badge variant="success">Confirmed</Badge>
                    <IconArrowRight size={14} style={{ color: '#CBD5E1' }} />
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
