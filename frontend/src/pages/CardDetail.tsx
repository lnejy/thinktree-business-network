import React from 'react';
import { PageName, Badge, AIBadge, Btn } from '../Layout';
import { IconPhone, IconMail, IconMapPin, IconGlobe, IconBuilding, IconUser, IconEdit, IconDownload } from '../icons';
import { confirmedCards, incomingCards, employees, companies, contacts } from '../data';
import type { LiveCard } from '../cardApi';
import { OriginalImage, OcrResults } from '../components/CardEvidence';

interface Props {
  navigate: (page: PageName, params?: Record<string, string>) => void;
  cardId?: string;
}

export default function CardDetail({ navigate, cardId }: Props) {
  const card = ([...confirmedCards, ...incomingCards].find(c => c.id === cardId) || confirmedCards[0]) as LiveCard;
  const owner = employees.find(e => e.id === card.ownerId);
  const company = companies.find(c => c.id === card.companyId);
  const contact = contacts.find(c => c.id === card.contactId);
  const allOwners = contact ? employees.filter(e => contact.ownerIds.includes(e.id)) : [owner].filter(Boolean);

  const x = card.extracted;

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>Card Detail</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>{card.status === 'reviewed' ? '확정한 명함' : '명함 원본 및 OCR 결과 · 검토 후 확정하세요'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="secondary" size="sm" icon={IconDownload}>Export</Btn>
          <Btn variant="secondary" size="sm" icon={IconEdit} onClick={() => navigate('ai-recognition', { cardId: card.id })}>Edit</Btn>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left: Card image */}
        <div className="lg:col-span-2 space-y-4">
          {/* Card visual */}
          <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#E2E8F0' }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: '#F1F5F9' }}>
              <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>Business Card</span>
            </div>
            <div className="p-5">
              {card.imageUrl ? <OriginalImage card={card} /> : <div
                className="rounded-xl shadow-md overflow-hidden"
                style={{ aspectRatio: '1.75', background: 'white', border: '1px solid #E2E8F0', padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}
              >
                {/* Card brand bar */}
                <div className="absolute top-0 left-0 right-0 h-1" style={{ background: '#2563EB' }} />
                <div>
                  <div className="text-xs font-semibold mb-1" style={{ color: '#2563EB', fontFamily: 'DM Mono, monospace' }}>
                    {x.company.value}
                  </div>
                  <div className="text-xl font-bold" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>
                    {x.name.value}
                  </div>
                  {x.nameEn.value && (
                    <div className="text-sm" style={{ color: '#64748B' }}>{x.nameEn.value}</div>
                  )}
                </div>
                <div>
                  {x.department.value && <div className="text-xs font-medium" style={{ color: '#475569' }}>{x.department.value}</div>}
                  {x.position.value && <div className="text-xs" style={{ color: '#64748B' }}>{x.position.value}</div>}
                  <div className="mt-2 space-y-0.5">
                    {x.phone.value && <div className="text-xs" style={{ color: '#94A3B8' }}>T. {x.phone.value}</div>}
                    {x.email.value && <div className="text-xs" style={{ color: '#94A3B8' }}>{x.email.value}</div>}
                    {x.address.value && <div className="text-xs" style={{ color: '#94A3B8' }}>{x.address.value}</div>}
                  </div>
                </div>
              </div>}
              <div className="flex items-center justify-between mt-3">
                <Badge variant={card.status === 'reviewed' ? 'success' : 'warning'}>{card.status === 'reviewed' ? 'Confirmed' : '검토 대기'}</Badge>
                <div className="flex items-center gap-1">
                  <AIBadge />
                  <span className="text-xs" style={{ color: '#94A3B8' }}>{card.confidence}% confidence</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card owners */}
          <div className="bg-white rounded-xl border" style={{ borderColor: '#E2E8F0' }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: '#F1F5F9' }}>
              <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>Card Owners</span>
            </div>
            <div className="p-4 space-y-2.5">
              <p className="text-xs" style={{ color: '#64748B' }}>This card is held by:</p>
              {allOwners.map(emp => emp && (
                <div key={emp.id} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: '#F8FAFC' }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0" style={{ background: emp.avatarColor }}>
                    {emp.name.slice(0, 1)}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium" style={{ color: '#0F172A' }}>{emp.name}</div>
                    <div className="text-xs" style={{ color: '#64748B' }}>{emp.position} · {emp.department}</div>
                  </div>
                  <span className="text-xs" style={{ color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>{emp.email.split('@')[0]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Contact info */}
        <div className="lg:col-span-3 space-y-4">
          {!!card.ocrRawText && <div className="bg-white border border-slate-200 rounded-xl p-5"><h2 className="font-semibold mb-4">OCR 인식·테스트 결과</h2><OcrResults card={card} /></div>}
          <div className="bg-white rounded-xl border" style={{ borderColor: '#E2E8F0' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: '#F1F5F9' }}>
              <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>Contact Information</span>
            </div>
            <div className="p-5">
              {card.imageUrl && <img src={card.imageUrl} alt="명함 원본" className="w-full rounded-lg mb-4 object-contain" />}
              <div className="flex items-center gap-4 mb-5 pb-5" style={{ borderBottom: '1px solid #F1F5F9' }}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold shrink-0" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                  {x.name.value.slice(0, 1)}
                </div>
                <div>
                  <div className="text-xl font-bold" style={{ color: '#0F172A' }}>{x.name.value}</div>
                  <div className="text-sm" style={{ color: '#94A3B8' }}>{x.nameEn.value}</div>
                  {x.position.value && (
                    <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded" style={{ background: '#F1F5F9', color: '#475569' }}>{x.position.value}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Company', value: x.company.value, icon: IconBuilding, onClick: company ? () => navigate('company-detail', { companyId: company.id }) : undefined },
                  { label: 'Branch', value: x.branch.value, icon: IconBuilding },
                  { label: 'Department', value: x.department.value, icon: IconUser },
                  { label: 'Team', value: x.team.value, icon: IconUser },
                  { label: 'Phone', value: x.phone.value, icon: IconPhone },
                  { label: 'Mobile', value: x.mobile.value, icon: IconPhone },
                  { label: 'Email', value: x.email.value, icon: IconMail },
                  { label: 'Website', value: x.website.value, icon: IconGlobe },
                  { label: 'FAX', value: x.fax.value, icon: IconPhone },
                  { label: 'Postal Code', value: x.postalCode.value, icon: IconMapPin },
                  { label: 'Address 2', value: x.address2.value, icon: IconMapPin },
                ].map(({ label, value, icon: Icon, onClick }) => value ? (
                  <div key={label} className="space-y-1">
                    <div className="text-xs font-medium" style={{ color: '#94A3B8' }}>{label}</div>
                    <div className="flex items-center gap-2">
                      <Icon size={13} style={{ color: '#CBD5E1', flexShrink: 0 }} />
                      {onClick ? (
                        <button onClick={onClick} className="text-sm font-medium hover:underline" style={{ color: '#2563EB' }}>
                          {value}
                        </button>
                      ) : (
                        <span className="text-sm" style={{ color: '#0F172A' }}>{value}</span>
                      )}
                    </div>
                  </div>
                ) : null)}

                {x.address.value && (
                  <div className="col-span-2 space-y-1">
                    <div className="text-xs font-medium" style={{ color: '#94A3B8' }}>Address</div>
                    <div className="flex items-start gap-2">
                      <IconMapPin size={13} style={{ color: '#CBD5E1', flexShrink: 0, marginTop: 2 }} />
                      <span className="text-sm" style={{ color: '#0F172A' }}>{x.address.value}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Company link */}
          {company && (
            <button
              onClick={() => navigate('company-detail', { companyId: company.id })}
              className="flex items-center gap-4 w-full bg-white rounded-xl border p-4 text-left transition-all hover:shadow-sm"
              style={{ borderColor: '#E2E8F0' }}
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-base font-bold shrink-0" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                {company.nameEn[0]}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold" style={{ color: '#0F172A' }}>{company.name}</div>
                <div className="text-xs" style={{ color: '#64748B' }}>{company.contactCount} contacts · {company.departmentCount} departments</div>
              </div>
              <div className="text-xs font-medium" style={{ color: '#2563EB' }}>View org chart →</div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
