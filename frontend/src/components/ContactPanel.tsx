import type { PageName } from '../Layout';
import { useEffect, useRef } from 'react';
import { companies, contacts, employees } from '../data';
import { personHistory } from '../cardApi';
import { AffiliationHistory } from './AffiliationHistory';
import { OriginalImage } from './CardEvidence';

export function ContactPanel({ contactId, navigate, onClose }: {
  contactId: string;
  navigate: (page: PageName, params?: Record<string, string>) => void;
  onClose: () => void;
}) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => { panel.current?.focus(); }, [contactId]);
  const person = contacts.find(contact => contact.id === contactId);
  if (!person) return null;
  const company = companies.find(item => item.id === person.companyId);
  const latest = personHistory(person.id)[0];
  return <aside ref={panel} tabIndex={-1} aria-label="인물 상세" className="w-full shrink-0 space-y-4 border-t border-slate-200 bg-white p-4 xl:sticky xl:top-0 xl:max-h-[calc(100vh-4rem)] xl:w-96 xl:overflow-y-auto xl:border-l xl:border-t-0">
    <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">{person.name}</h2><button aria-label="인물 상세 닫기" onClick={onClose} className="rounded-lg border px-3 py-1.5 text-sm">닫기</button></div>
    <p className="text-sm text-slate-700">현재 소속 · {company?.name} · {[person.department, person.team, person.position].filter(Boolean).join(' · ')}</p>
    <dl className="space-y-1 break-all text-sm">{[['전화', person.phone], ['휴대전화', person.mobile], ['이메일', person.email]].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt className="inline text-slate-500">{label} </dt><dd className="inline">{value}</dd></div>)}</dl>
    <section><h3 className="text-sm font-semibold">연결된 팀원</h3><p className="mt-1 text-sm text-slate-600">{employees.filter(employee => person.ownerIds.includes(employee.id)).map(employee => employee.name).join(' · ')}</p></section>
    {latest && <><button onClick={() => navigate('card-detail', { cardId: latest.id })} className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white">명함 상세 보기</button><OriginalImage key={latest.id} card={latest} /></>}
    <AffiliationHistory personId={person.id} navigate={navigate} />
  </aside>;
}
