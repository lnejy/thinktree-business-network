import type { PageName } from '../Layout';
import { cardOwners, companies, confirmedCards, employees, incomingCards, formatDate } from '../data';
import { recentRelationshipChanges } from '../relationshipData';
import { reviewIssues } from '../reviewGuidance';

interface Props {
  navigate: (page: PageName, params?: Record<string, string>) => void;
  isAdmin: boolean;
  userId: string;
}

export default function Dashboard({ navigate, isAdmin, userId }: Props) {
  const mine = confirmedCards.filter(card => cardOwners(card).includes(userId));
  const pending = incomingCards.filter(card => cardOwners(card).includes(userId) && card.status === 'ready_for_review');
  const failed = incomingCards.filter(card => cardOwners(card).includes(userId) && card.status === 'failed');
  const myCompanies = companies.filter(company => mine.some(card => card.companyId === company.id));
  const recentCards = [...mine].sort((a, b) => (b.reviewedAt || b.uploadedAt).localeCompare(a.reviewedAt || a.uploadedAt)).slice(0, 5);
  const connections = myCompanies.map(company => {
    const first = mine.filter(card => card.companyId === company.id).map(card => card.uploadedAt).sort()[0];
    return { company, first };
  }).sort((a, b) => b.first.localeCompare(a.first)).slice(0, 5);
  const changes = recentRelationshipChanges().filter(item => cardOwners(item.latest).includes(userId) || cardOwners(item.previous).includes(userId)).slice(0, 5);
  const person = employees.find(employee => employee.id === userId);
  const openIncoming = (status: string) => navigate('incoming-cards', { ownerId: userId, status });

  return <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-xl font-bold">{person?.name}님의 명함</h1><p className="mt-1 text-sm text-slate-600">확인할 명함과 최근 관계 변화를 살펴보세요.</p></div><button onClick={() => navigate('add-card')} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white">명함 등록</button></header>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[{ label: '내 저장 명함', count: mine.length, action: () => navigate('my-cards') },
        { label: '내 검토 대기', count: pending.length, action: () => openIncoming('ready_for_review') },
        { label: '내 연결 회사', count: myCompanies.length, action: () => navigate('business-network', { scope: 'mine' }) },
        { label: '다시 읽을 명함', count: failed.length, action: () => openIncoming('failed') },
      ].map(item => <button key={item.label} onClick={item.action} className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-blue-300"><span className="block text-sm text-slate-600">{item.label}</span><span className="mt-2 block text-2xl font-bold">{item.count}</span></button>)}
    </div>
    {isAdmin && <button onClick={() => navigate('incoming-cards')} className="text-sm text-blue-700">팀 전체 검토 대기 {incomingCards.filter(card => card.status === 'ready_for_review').length}장 확인</button>}
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="font-semibold">지금 확인할 명함</h2><ul className="mt-3 divide-y divide-slate-100">{pending.slice(0, 5).map(card => <li key={card.id}><button onClick={() => navigate('ai-recognition', { cardId: card.id })} className="w-full py-3 text-left"><span className="text-sm font-medium text-blue-700">{card.extracted.name.value || card.extracted.company.value || '이름 미확인'}</span><span className="mt-1 block text-xs text-amber-800">{reviewIssues(card.extracted).map(issue => issue.message).join(' · ') || '원본과 명함 정보를 확인하세요'}</span></button></li>)}</ul>{!pending.length && <p className="mt-3 text-sm text-slate-500">확인할 명함이 없습니다.</p>}{pending.length > 5 && <button onClick={() => openIncoming('ready_for_review')} className="mt-3 text-sm text-blue-700">대기 명함 모두 보기</button>}</section>
      <section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="font-semibold">최근 소속·직책 변경</h2><ul className="mt-3 space-y-3">{changes.map(({ person: contact, latest, changes: items }) => <li key={latest.id}><button onClick={() => navigate('card-detail', { cardId: latest.id })} className="text-sm font-medium text-blue-700">{contact.name}</button><p className="mt-1 text-xs text-slate-600">{items.map(change => `${change.label} ${change.from || '미입력'} → ${change.to || '미입력'}`).join(' · ')}</p></li>)}</ul>{!changes.length && <p className="mt-3 text-sm text-slate-500">내 연결 인물의 변경 기록이 없습니다.</p>}</section>
      <section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="font-semibold">최근 연결된 회사</h2><ul className="mt-3 divide-y divide-slate-100">{connections.map(({ company, first }) => <li key={company.id}><button onClick={() => navigate('company-detail', { companyId: company.id })} className="w-full py-3 text-left text-sm"><span className="font-medium text-blue-700">{company.name}</span><span className="mt-1 block text-xs text-slate-500">첫 명함 등록 · {formatDate(first)}</span></button></li>)}</ul>{!connections.length && <p className="mt-3 text-sm text-slate-500">명함을 저장하면 연결된 회사가 표시됩니다.</p>}</section>
      <section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="font-semibold">최근 저장한 내 명함</h2><ul className="mt-3 divide-y divide-slate-100">{recentCards.map(card => <li key={card.id}><button onClick={() => navigate('card-detail', { cardId: card.id })} className="w-full py-3 text-left text-sm"><span className="font-medium text-blue-700">{card.extracted.name.value}</span><span className="mt-1 block text-xs text-slate-600">{card.extracted.company.value} · {card.extracted.position.value}</span></button></li>)}</ul>{!recentCards.length && <p className="mt-3 text-sm text-slate-500">저장한 명함이 없습니다.</p>}</section>
    </div>
  </div>;
}
