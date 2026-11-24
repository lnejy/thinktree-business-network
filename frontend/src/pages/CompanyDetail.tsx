import { companyTree, currentAffiliations } from '../cardApi';
import React, { useState } from 'react';
import { PageName, Badge, Btn } from '../Layout';
import { IconBuilding, IconUser, IconCard, IconArrowRight, IconMapPin, IconGlobe, IconPhone, IconMail, IconX } from '../icons';
import { companies, contacts, employees } from '../data';
import type { OrgNode } from '../data';
import { CompanyRelationships } from '../components/CompanyRelationships';

interface Props {
  navigate: (page: PageName, params?: Record<string, string>) => void;
  companyId?: string;
}

export default function CompanyDetail({ navigate, companyId }: Props) {
  const [tab, setTab] = useState<'overview' | 'org' | 'contacts' | 'network'>('overview');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [asOf, setAsOf] = useState('');

  const company = companies.find(c => c.id === companyId);
  if (!company) return <p className="p-6 text-sm text-slate-600">회사를 찾을 수 없습니다. 명함을 확정한 뒤 회사 목록에서 다시 선택하세요.</p>;
  const tree = companyTree(company.id, asOf || undefined);
  const findNode = (node: OrgNode): OrgNode | undefined => node.id === selectedNodeId ? node : node.children?.map(findNode).find(Boolean);
  const selectedNode = findNode(tree);
  const companyContacts = contacts.filter(c => c.companyId === company.id);

  return (
    <div className="flex h-full">
      <div className={`flex-1 p-6 space-y-5 overflow-auto ${selectedNode ? 'pr-3' : ''}`}>
        {/* Company header */}
        <div className="bg-white rounded-xl border p-6" style={{ borderColor: '#E2E8F0' }}>
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-xl text-2xl font-bold shrink-0" style={{ background: '#EFF6FF', color: '#2563EB' }}>
              {company.nameEn[0]}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-bold" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>{company.name}</h1>
                  <div className="text-sm mt-0.5" style={{ color: '#64748B' }}>{company.nameEn}</div>
                </div>
                <span className="text-xs px-2 py-1 rounded" style={{ background: '#EFF6FF', color: '#2563EB' }}>{company.industry}</span>
              </div>
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                <span className="flex items-center gap-1 text-xs" style={{ color: '#64748B' }}>
                  <IconGlobe size={12} />{company.domain}
                </span>
                <span className="flex items-center gap-1 text-xs" style={{ color: '#64748B' }}>
                  <IconMapPin size={12} />{company.address}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mt-5 pt-5" style={{ borderTop: '1px solid #F1F5F9' }}>
            {[
              { label: 'Cards', value: company.cardCount },
              { label: 'Contacts', value: company.contactCount },
              { label: 'Departments', value: company.departmentCount },
              { label: 'Internal Connections', value: company.connectedEmployeeCount },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="text-xl font-bold mb-0.5" style={{ color: '#0F172A', fontFamily: 'DM Mono, monospace' }}>{value}</div>
                <div className="text-xs" style={{ color: '#64748B' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b" style={{ borderColor: '#E2E8F0' }}>
          {(['overview', 'org', 'contacts', 'network'] as const).map(t => {
            const labels = { overview: 'Overview', org: 'Organization Chart', contacts: 'Contacts', network: 'Business Network' };
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
                style={{
                  borderColor: tab === t ? '#2563EB' : 'transparent',
                  color: tab === t ? '#2563EB' : '#64748B',
                  marginBottom: '-1px',
                }}
              >
                {labels[t]}
              </button>
            );
          })}
        </div>

        {tab === 'overview' && <CompanyRelationships companyId={company.id} navigate={navigate} />}

        {tab === 'org' && (
          <div className="bg-white rounded-xl border" style={{ borderColor: '#E2E8F0' }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: '#F1F5F9' }}>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: '#0F172A' }}>Organization Chart</h3>
                <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Click any node to view details · Auto-built from business cards</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs">조회 기준일 <input type="date" value={asOf} onChange={event => { setAsOf(event.target.value); setSelectedNodeId(null); }} className="border rounded px-2 py-1" /></label>
                <Badge variant="muted">{currentAffiliations(asOf || undefined).filter(card => card.companyId === company.id).length}명</Badge>
              </div>
            </div>
            <div className="p-8 overflow-x-auto">
              <div className="min-w-max">
                {asOf && <p className="text-xs text-slate-600 mb-3">{asOf}까지의 가장 최근 명함 기록을 기준으로 표시합니다.</p>}
                <OrgTree node={tree} onSelect={node => setSelectedNodeId(node.id)} selectedId={selectedNode?.id} />
              </div>
            </div>
          </div>
        )}

        {/* Contacts tab */}
        {tab === 'contacts' && (
          <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#E2E8F0' }}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #F1F5F9', background: '#FAFAFA' }}>
                  {['Contact', 'Department', 'Team', 'Position', 'Contact Info', 'Card Owners'].map(col => (
                    <th key={col} className="text-left px-4 py-3 text-xs font-medium" style={{ color: '#64748B' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {companyContacts.map(contact => (
                  <tr key={contact.id} className="border-b hover:bg-gray-50" style={{ borderColor: '#F1F5F9' }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                          {contact.name.slice(0, 1)}
                        </div>
                        <div>
                          <div className="text-sm font-medium" style={{ color: '#0F172A' }}>{contact.name}</div>
                          <div className="text-xs" style={{ color: '#94A3B8' }}>{contact.nameEn}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs max-w-[180px] truncate" style={{ color: '#374151' }}>{contact.department}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#64748B' }}>{contact.team || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#F1F5F9', color: '#475569' }}>{contact.position}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs" style={{ color: '#374151' }}>{contact.phone}</div>
                      <div className="text-xs" style={{ color: '#94A3B8' }}>{contact.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {contact.ownerIds.map(eid => {
                          const emp = employees.find(e => e.id === eid);
                          return emp ? (
                            <div key={eid} title={emp.name} className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white" style={{ background: emp.avatarColor }}>
                              {emp.name.slice(0, 1)}
                            </div>
                          ) : null;
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Network tab */}
        {tab === 'network' && (
          <div className="bg-white rounded-xl border p-6 flex items-center justify-center" style={{ borderColor: '#E2E8F0', minHeight: '300px' }}>
            <div className="text-center">
              <p className="text-sm" style={{ color: '#64748B' }}>View in full Business Network</p>
              <div className="mt-3"><Btn variant="primary" onClick={() => navigate('business-network', { companyId: company.id })}>Open Business Network</Btn></div>
            </div>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedNode && tab === 'org' && (
        <NodeDetailPanel node={selectedNode} asOf={asOf || undefined} onClose={() => setSelectedNodeId(null)} navigate={navigate} />
      )}
    </div>
  );
}

function fallbackOrgNode(companyName: string): OrgNode {
  return {
    id: 'root', type: 'company', name: companyName, count: 3,
    children: [
      {
        id: 'hq', type: 'head_office', name: '본사', count: 3,
        children: [
          { id: 'd1', type: 'division', name: '사업본부', count: 2,
            children: [
              { id: 'p1', type: 'person', name: '담당자 1', position: '부장' },
              { id: 'p2', type: 'person', name: '담당자 2', position: '과장' },
            ]
          }
        ]
      }
    ]
  };
}

function OrgTree({ node, onSelect, selectedId, depth = 0 }: { node: OrgNode; onSelect: (n: OrgNode) => void; selectedId?: string; depth?: number }) {
  const [collapsed, setCollapsed] = useState(false);
  const isPerson = node.type === 'person';
  const isSelected = node.id === selectedId;

  const nodeStyles: Record<string, { bg: string; border: string; textColor: string }> = {
    company: { bg: '#0F172A', border: '#0F172A', textColor: 'white' },
    head_office: { bg: '#1E3A8A', border: '#1E40AF', textColor: 'white' },
    division: { bg: '#EFF6FF', border: '#BFDBFE', textColor: '#1E40AF' },
    department: { bg: '#F0FDF4', border: '#BBF7D0', textColor: '#15803D' },
    team: { bg: '#FFF7ED', border: '#FED7AA', textColor: '#C2410C' },
    person: { bg: 'white', border: '#E2E8F0', textColor: '#0F172A' },
  };
  const s = nodeStyles[node.type] || nodeStyles.person;

  return (
    <div className="org-tree-root">
      <button
        onClick={() => { onSelect(node); if (!isPerson) setCollapsed(v => !v); }}
        className="rounded-xl border px-4 py-2.5 transition-all hover:shadow-md text-left min-w-[140px] max-w-[200px]"
        style={{
          background: isSelected ? '#2563EB' : s.bg,
          borderColor: isSelected ? '#1D4ED8' : s.border,
          boxShadow: isSelected ? '0 0 0 3px #BFDBFE' : undefined,
        }}
      >
        <div className="text-xs font-semibold truncate" style={{ color: isSelected ? 'white' : s.textColor }}>
          {node.name}
        </div>
        {node.nameEn && (
          <div className="text-xs truncate mt-0.5 opacity-70" style={{ color: isSelected ? 'white' : s.textColor }}>
            {node.nameEn}
          </div>
        )}
        {node.position && (
          <div className="text-xs mt-0.5 opacity-80" style={{ color: isSelected ? '#BFDBFE' : '#64748B' }}>{node.position}</div>
        )}
        {node.count !== undefined && !isPerson && (
          <div className="text-xs mt-0.5 font-medium" style={{ color: isSelected ? '#BFDBFE' : '#94A3B8', fontFamily: 'DM Mono, monospace' }}>
            {node.count} people
          </div>
        )}
      </button>

      {node.children && !collapsed && (
        <div className="org-tree-children">
          {node.children.map(child => (
            <div key={child.id} className="org-tree-child">
              <OrgTree node={child} onSelect={onSelect} selectedId={selectedId} depth={depth + 1} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NodeDetailPanel({ node, asOf, onClose, navigate }: { node: OrgNode; asOf?: string; onClose: () => void; navigate: (page: PageName, params?: Record<string, string>) => void }) {
  const current = contacts.find(c => c.id === node.contactId);
  const snapshot = currentAffiliations(asOf).find(c => c.contactId === node.contactId);
  const x = snapshot?.extracted;
  const contact = current && x ? { ...current, name: x.name.value, nameEn: x.nameEn.value, department: x.department.value, position: x.position.value, phone: x.phone.value, email: x.email.value } : current;
  const cardOwners = contact ? employees.filter(e => contact.ownerIds.includes(e.id)) : [];

  return (
    <div className="w-72 bg-white border-l shrink-0 overflow-y-auto" style={{ borderColor: '#E2E8F0' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-white z-10" style={{ borderColor: '#F1F5F9' }}>
        <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>
          {node.type === 'person' ? 'Contact Detail' : 'Department Detail'}
        </span>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 transition-colors">
          <IconX size={14} style={{ color: '#94A3B8' }} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {node.type === 'person' && contact ? (
          <>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                {contact.name.slice(0, 1)}
              </div>
              <div>
                <div className="font-semibold" style={{ color: '#0F172A' }}>{contact.name}</div>
                <div className="text-xs" style={{ color: '#94A3B8' }}>{contact.nameEn}</div>
              </div>
            </div>

            <div className="space-y-2">
              {[
                { icon: IconBuilding, label: contact.department },
                { icon: IconUser, label: contact.position },
                { icon: IconPhone, label: contact.phone },
                { icon: IconMail, label: contact.email },
              ].map(({ icon: Icon, label }) => label ? (
                <div key={label} className="flex items-center gap-2 text-xs" style={{ color: '#475569' }}>
                  <Icon size={12} style={{ color: '#94A3B8', flexShrink: 0 }} />
                  <span className="truncate">{label}</span>
                </div>
              ) : null)}
            </div>

            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
              <div className="text-xs font-semibold mb-2" style={{ color: '#374151' }}>Card Owners</div>
              <div className="space-y-2">
                {cardOwners.map(emp => (
                  <div key={emp.id} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0" style={{ background: emp.avatarColor }}>
                      {emp.name.slice(0, 1)}
                    </div>
                    <div>
                      <div className="text-xs font-medium" style={{ color: '#0F172A' }}>{emp.name}</div>
                      <div className="text-xs" style={{ color: '#94A3B8' }}>{emp.position}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <div className="text-sm font-semibold mb-1" style={{ color: '#0F172A' }}>{node.name}</div>
              {node.nameEn && <div className="text-xs" style={{ color: '#94A3B8' }}>{node.nameEn}</div>}
            </div>
            {node.count !== undefined && (
              <div className="text-xs" style={{ color: '#64748B' }}>
                <span style={{ fontFamily: 'DM Mono, monospace', color: '#2563EB' }}>{node.count}</span> people in this unit
              </div>
            )}
            {node.children && (
              <div className="text-xs" style={{ color: '#64748B' }}>
                <span style={{ fontFamily: 'DM Mono, monospace', color: '#2563EB' }}>{node.children.length}</span> sub-units
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
