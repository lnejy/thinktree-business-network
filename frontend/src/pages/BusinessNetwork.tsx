import React, { useState } from 'react';
import { PageName, Badge, Btn } from '../Layout';
import { IconX, IconUser, IconBuilding, IconCard, IconPhone, IconMail, IconFilter } from '../icons';
import { employees, contacts, companies, networkConnections, confirmedCards } from '../data';
import type { Employee, Contact } from '../data';
import { affiliationChanges, cardDate, personHistory } from '../cardApi';
import { AffiliationHistory } from '../components/AffiliationHistory';

interface Props {
  navigate: (page: PageName, params?: Record<string, string>) => void;
}

export default function BusinessNetwork({ navigate }: Props) {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [filterCompany, setFilterCompany] = useState('all');

  const filteredContacts = filterCompany === 'all'
    ? contacts
    : contacts.filter(c => c.companyId === filterCompany);
  const changes = filteredContacts.flatMap(contact => {
    const [latest, earlier] = personHistory(contact.id);
    if (!latest || !earlier) return [];
    const changed = affiliationChanges(latest, earlier).filter(change => ['회사명', '부서', '팀', '직책', '본사·지점'].includes(change.label));
    return changed.length ? [{ card: latest, changed }] : [];
  }).sort((a, b) => cardDate(b.card).localeCompare(cardDate(a.card))).slice(0, 10);

  const activeConnectionsForEmp = (empId: string) =>
    networkConnections.filter(n => n.employeeId === empId && filteredContacts.some(c => c.id === n.contactId));

  const activeConnectionsForContact = (contactId: string) =>
    networkConnections.filter(n => n.contactId === contactId);

  const isConnected = (empId: string, contactId: string) =>
    networkConnections.some(n => n.employeeId === empId && n.contactId === contactId);

  const highlightEmp = selectedContact
    ? employees.filter(e => activeConnectionsForContact(selectedContact.id).some(n => n.employeeId === e.id))
    : selectedEmployee ? [selectedEmployee] : [];

  const highlightContact = selectedEmployee
    ? filteredContacts.filter(c => activeConnectionsForEmp(selectedEmployee.id).some(n => n.contactId === c.id))
    : selectedContact ? [selectedContact] : [];

  const detail = selectedEmployee || selectedContact;

  const getCompanyForContact = (contact: Contact) => companies.find(c => c.id === contact.companyId);
  const getOwnersForContact = (contact: Contact) =>
    employees.filter(e => contact.ownerIds.includes(e.id));

  return (
    <div className="flex h-full">
      <div className="flex-1 p-6 space-y-4 overflow-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>Business Network</h1>
            <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>Connections between our team and client contacts</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterCompany}
              onChange={e => setFilterCompany(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-xs outline-none"
              style={{ borderColor: '#E2E8F0', color: '#374151' }}
            >
              <option value="all">All Companies</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Badge variant="muted">{networkConnections.length} connections</Badge>
          </div>
        </div>

        {changes.length > 0 && <section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="font-semibold text-sm">최근 소속·직책 변경</h2><ul className="mt-2 space-y-2 text-xs">{changes.map(({ card, changed }) => <li key={card.id}><button onClick={() => navigate('card-detail', { cardId: card.id })} className="text-blue-700">{cardDate(card)} · {card.extracted.name.value}</button> · {changed.map(change => `${change.label} ${change.from || '미입력'} → ${change.to || '미입력'}`).join(' · ')}</li>)}</ul></section>}
        {/* Network legend */}
        <div className="flex items-center gap-4 px-4 py-2.5 rounded-lg text-xs" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <span style={{ color: '#64748B' }}>Legend:</span>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: '#2563EB' }} />
            <span style={{ color: '#374151' }}>Our Employees</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: '#7C3AED' }} />
            <span style={{ color: '#374151' }}>Client Contacts</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-0.5" style={{ background: '#CBD5E1' }} />
            <span style={{ color: '#374151' }}>Owns business card</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-0.5" style={{ background: '#2563EB', borderTop: '2px solid #2563EB' }} />
            <span style={{ color: '#374151' }}>Active selection</span>
          </div>
          <span className="ml-auto text-xs" style={{ color: '#94A3B8' }}>Click any node to explore connections</span>
        </div>

        {/* Bipartite network graph */}
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#E2E8F0' }}>
          <div className="flex" style={{ minHeight: '480px' }}>
            {/* Left: Employees */}
            <div className="w-64 border-r flex flex-col" style={{ borderColor: '#F1F5F9' }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: '#F1F5F9', background: '#FAFAFA' }}>
                <div className="text-xs font-semibold" style={{ color: '#374151' }}>Our Team</div>
                <div className="text-xs" style={{ color: '#94A3B8' }}>{employees.length} employees</div>
              </div>
              <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                {employees.map(emp => {
                  const connCount = activeConnectionsForEmp(emp.id).length;
                  const isHighlighted = highlightEmp.some(e => e.id === emp.id);
                  const isSelected = selectedEmployee?.id === emp.id;
                  const isDimmed = (selectedEmployee || selectedContact) && !isHighlighted;

                  return (
                    <button
                      key={emp.id}
                      onClick={() => {
                        setSelectedContact(null);
                        setSelectedEmployee(isSelected ? null : emp);
                      }}
                      className="network-node-employee flex items-center gap-2.5 w-full p-2.5 rounded-lg text-left border transition-all"
                      style={{
                        borderColor: isSelected ? '#2563EB' : isHighlighted ? '#BFDBFE' : '#F1F5F9',
                        background: isSelected ? '#EFF6FF' : isHighlighted ? '#F0F4FF' : 'white',
                        opacity: isDimmed ? 0.3 : 1,
                      }}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0" style={{ background: emp.avatarColor }}>
                        {emp.name.slice(0, 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate" style={{ color: '#0F172A' }}>{emp.name}</div>
                        <div className="text-xs truncate" style={{ color: '#94A3B8' }}>{emp.position}</div>
                      </div>
                      <div className="text-xs font-bold shrink-0" style={{ color: isSelected ? '#2563EB' : '#94A3B8', fontFamily: 'DM Mono, monospace' }}>
                        {connCount}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Center: Connection visualization */}
            <div className="flex-1 relative" style={{ minWidth: '200px' }}>
              <svg width="100%" height="100%" className="absolute inset-0">
                <defs>
                  <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="3" refY="2" orient="auto">
                    <polygon points="0 0, 6 2, 0 4" fill="#CBD5E1" />
                  </marker>
                  <marker id="arrowhead-active" markerWidth="6" markerHeight="4" refX="3" refY="2" orient="auto">
                    <polygon points="0 0, 6 2, 0 4" fill="#2563EB" />
                  </marker>
                </defs>
                {employees.map((emp, ei) => {
                  const empY = 60 + ei * 68;
                  return filteredContacts.map((contact, ci) => {
                    if (!isConnected(emp.id, contact.id)) return null;
                    const contactY = 60 + ci * 68;
                    const isActive = (selectedEmployee?.id === emp.id || selectedContact?.id === contact.id);

                    return (
                      <line
                        key={`${emp.id}-${contact.id}`}
                        x1="10%"
                        y1={empY}
                        x2="90%"
                        y2={contactY}
                        stroke={isActive ? '#2563EB' : '#E2E8F0'}
                        strokeWidth={isActive ? 2 : 1}
                        strokeDasharray={isActive ? undefined : '4,2'}
                        opacity={isActive ? 1 : 0.6}
                      />
                    );
                  });
                })}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <div className="text-3xl font-bold" style={{ color: '#F1F5F9', fontFamily: 'DM Mono, monospace' }}>
                    {networkConnections.length}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: '#CBD5E1' }}>connections</div>
                </div>
              </div>
            </div>

            {/* Right: Client Contacts */}
            <div className="w-72 border-l flex flex-col" style={{ borderColor: '#F1F5F9' }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: '#F1F5F9', background: '#FAFAFA' }}>
                <div className="text-xs font-semibold" style={{ color: '#374151' }}>Client Contacts</div>
                <div className="text-xs" style={{ color: '#94A3B8' }}>{filteredContacts.length} contacts</div>
              </div>
              <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                {filteredContacts.map((contact) => {
                  const companyData = getCompanyForContact(contact);
                  const ownerCount = activeConnectionsForContact(contact.id).length;
                  const isHighlighted = highlightContact.some(c => c.id === contact.id);
                  const isSelected = selectedContact?.id === contact.id;
                  const isDimmed = (selectedEmployee || selectedContact) && !isHighlighted;

                  return (
                    <button
                      key={contact.id}
                      onClick={() => {
                        setSelectedEmployee(null);
                        setSelectedContact(isSelected ? null : contact);
                      }}
                      className="network-node-contact flex items-center gap-2.5 w-full p-2.5 rounded-lg text-left border transition-all"
                      style={{
                        borderColor: isSelected ? '#7C3AED' : isHighlighted ? '#DDD6FE' : '#F1F5F9',
                        background: isSelected ? '#F5F3FF' : isHighlighted ? '#FAF8FF' : 'white',
                        opacity: isDimmed ? 0.3 : 1,
                      }}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
                        {contact.name.slice(0, 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate" style={{ color: '#0F172A' }}>{contact.name}</div>
                        <div className="text-xs truncate" style={{ color: '#94A3B8' }}>{companyData?.name} · {contact.position}</div>
                      </div>
                      <div className="text-xs font-bold shrink-0" style={{ color: isSelected ? '#7C3AED' : '#94A3B8', fontFamily: 'DM Mono, monospace' }}>
                        {ownerCount}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {detail && (
        <div className="w-72 bg-white border-l shrink-0 overflow-y-auto" style={{ borderColor: '#E2E8F0' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-white" style={{ borderColor: '#F1F5F9' }}>
            <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>
              {selectedEmployee ? 'Employee' : 'Contact'} Detail
            </span>
            <button onClick={() => { setSelectedEmployee(null); setSelectedContact(null); }} className="p-1 rounded hover:bg-gray-100">
              <IconX size={14} style={{ color: '#94A3B8' }} />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {selectedEmployee && (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0" style={{ background: selectedEmployee.avatarColor }}>
                    {selectedEmployee.name.slice(0, 1)}
                  </div>
                  <div>
                    <div className="font-semibold" style={{ color: '#0F172A' }}>{selectedEmployee.name}</div>
                    <div className="text-xs" style={{ color: '#94A3B8' }}>{selectedEmployee.nameEn}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#64748B' }}>{selectedEmployee.position} · {selectedEmployee.department}</div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
                  <div className="text-xs font-semibold mb-2" style={{ color: '#374151' }}>
                    Holds {activeConnectionsForEmp(selectedEmployee.id).length} client cards
                  </div>
                  <div className="space-y-2">
                    {contacts
                      .filter(c => networkConnections.some(n => n.employeeId === selectedEmployee.id && n.contactId === c.id))
                      .map(contact => {
                        const co = companies.find(c2 => c2.id === contact.companyId);
                        return (
                          <button
                            key={contact.id}
                            onClick={() => { setSelectedEmployee(null); setSelectedContact(contact); }}
                            className="w-full flex items-center gap-2 p-2 rounded-lg text-left hover:bg-gray-50 transition-colors"
                          >
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
                              {contact.name.slice(0, 1)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-medium truncate" style={{ color: '#0F172A' }}>{contact.name}</div>
                              <div className="text-xs truncate" style={{ color: '#94A3B8' }}>{co?.name}</div>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              </>
            )}

            {selectedContact && (
              <>
                <AffiliationHistory personId={selectedContact.id} navigate={navigate} />
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
                    {selectedContact.name.slice(0, 1)}
                  </div>
                  <div>
                    <div className="font-semibold" style={{ color: '#0F172A' }}>{selectedContact.name}</div>
                    <div className="text-xs" style={{ color: '#94A3B8' }}>{selectedContact.nameEn}</div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs" style={{ color: '#475569' }}>
                  <div className="flex items-center gap-2"><IconBuilding size={12} style={{ color: '#94A3B8' }} />{companies.find(c => c.id === selectedContact.companyId)?.name}</div>
                  <div className="flex items-center gap-2"><IconUser size={12} style={{ color: '#94A3B8' }} />{selectedContact.position}</div>
                  <div className="flex items-center gap-2"><IconPhone size={12} style={{ color: '#94A3B8' }} />{selectedContact.phone}</div>
                  <div className="flex items-center gap-2"><IconMail size={12} style={{ color: '#94A3B8' }} />{selectedContact.email}</div>
                </div>

                <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
                  <div className="text-xs font-semibold mb-2" style={{ color: '#374151' }}>
                    Card held by {activeConnectionsForContact(selectedContact.id).length} employee{activeConnectionsForContact(selectedContact.id).length > 1 ? 's' : ''}
                  </div>
                  <div className="space-y-2">
                    {getOwnersForContact(selectedContact).map(emp => (
                      <button
                        key={emp.id}
                        onClick={() => { setSelectedContact(null); setSelectedEmployee(emp); }}
                        className="w-full flex items-center gap-2 p-2 rounded-lg text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0" style={{ background: emp.avatarColor }}>
                          {emp.name.slice(0, 1)}
                        </div>
                        <div>
                          <div className="text-xs font-medium" style={{ color: '#0F172A' }}>{emp.name}</div>
                          <div className="text-xs" style={{ color: '#94A3B8' }}>{emp.position}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
