import { useState } from 'react';
import type { PageName } from '../Layout';
import { cardOwners, confirmedCards, contacts, employees } from '../data';
import { personHistory } from '../cardApi';
import { recentRelationshipChanges } from '../relationshipData';
import { ContactPanel } from './ContactPanel';

export function CompanyRelationships({ companyId, navigate }: {
  companyId: string;
  navigate: (page: PageName, params?: Record<string, string>) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const cards = confirmedCards.filter(card => card.companyId === companyId);
  const current = contacts.filter(person => person.companyId === companyId);
  const previous = contacts.filter(person => person.companyId !== companyId && personHistory(person.id).some(card => card.companyId === companyId));
  const managers = employees.filter(employee => cards.some(card => cardOwners(card).includes(employee.id)));
  const changes = recentRelationshipChanges(companyId).slice(0, 10);
  const query = search.trim().toLowerCase();
  return <div className="flex min-w-0 flex-col gap-4 xl:flex-row">
    <div className="min-w-0 flex-1 space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="font-semibold">우리 팀 연결 담당자</h2><div className="mt-3 flex flex-wrap gap-2">{managers.map(employee => <span key={employee.id} className="rounded-full bg-blue-50 px-3 py-1.5 text-sm text-blue-900">{employee.name} · 명함 {cards.filter(card => cardOwners(card).includes(employee.id)).length}장</span>)}</div>
        <button onClick={() => navigate('business-network', { companyId })} className="mt-3 text-sm font-medium text-blue-700">이 회사의 네트워크 보기</button>
      </section>
      <input aria-label="회사 소속 인물 검색" value={search} onChange={event => setSearch(event.target.value)} placeholder="이름·부서·직책 검색" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
      {[{ people: current, title: '현재 소속' }, { people: previous, title: '과거 소속' }].map(({ people, title }) => {
        const filtered = people.filter(person => [person.name, person.department, person.position].join(' ').toLowerCase().includes(query));
        return <section key={title} className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="font-semibold">{title} · {people.length}명</h2><ul className="mt-3 divide-y divide-slate-100">{filtered.map(person => {
          const record = personHistory(person.id).find(card => card.companyId === companyId);
          return <li key={person.id}><button onClick={() => setSelectedId(person.id)} className="w-full py-3 text-left text-sm hover:text-blue-700"><span className="font-medium">{person.name}</span><span className="ml-2 text-slate-600">{record?.extracted.department.value} · {record?.extracted.position.value}</span></button></li>;
        })}</ul>{!filtered.length && <p className="mt-3 text-sm text-slate-500">해당 기록이 없습니다.</p>}</section>;
      })}
      <section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="font-semibold">최근 소속·직책 변경</h2><ul className="mt-3 space-y-3 text-sm">{changes.map(({ person, latest, changes: items }) => <li key={latest.id}><button onClick={() => navigate('card-detail', { cardId: latest.id })} className="font-medium text-blue-700">{person.name}</button><p className="mt-1 text-slate-600">{items.map(change => `${change.label} ${change.from || '미입력'} → ${change.to || '미입력'}`).join(' · ')}</p></li>)}</ul>{!changes.length && <p className="mt-3 text-sm text-slate-500">소속·직책이 변경된 기록이 없습니다.</p>}</section>
    </div>
    {selectedId && <ContactPanel contactId={selectedId} navigate={navigate} onClose={() => setSelectedId(null)} />}
  </div>;
}
