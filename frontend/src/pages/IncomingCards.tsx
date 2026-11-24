import { useState } from 'react';
import type { PageName } from '../Layout';
import { IconSearch } from '../icons';
import { cardOwners, employees, incomingCards, confirmedCards, formatDateTime } from '../data';
import { isLiveCard, refreshCards, request, type LiveCard } from '../cardApi';
import { reviewIssues } from '../reviewGuidance';

const filters = [
  ['ready_for_review', '확인 필요'],
  ['processing', '읽는 중'],
  ['failed', '다시 시도'],
  ['reviewed', '저장 완료'],
  ['all', '전체'],
] as const;

function statusGroup(card: LiveCard) {
  return ['uploading', 'ocr_processing', 'ai_structuring'].includes(card.status) ? 'processing' : card.status;
}

export default function IncomingCards({ navigate, initialOwner = '', initialStatus }: {
  navigate: (page: PageName, params?: Record<string, string>) => void;
  initialOwner?: string;
  initialStatus?: string;
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<(typeof filters)[number][0]>(filters.find(([key]) => key === initialStatus)?.[0] || 'ready_for_review');
  const [owner, setOwner] = useState(initialOwner);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [error, setError] = useState('');
  const cards = [...incomingCards, ...confirmedCards].filter(card => isLiveCard(card.id) && (!owner || cardOwners(card).includes(owner)))
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)) as LiveCard[];
  const query = search.trim().toLowerCase();
  const shown = cards.filter(card =>
    (filter === 'all' || statusGroup(card) === filter) &&
    [card.extracted.company.value, card.extracted.name.value, card.sourceFileName]
      .some(value => !query || value?.toLowerCase().includes(query)));

  async function retry(id: string) {
    setRetrying(id);
    setError('');
    try {
      await request(`/api/cards/${id}/retry`, { method: 'POST' });
      await refreshCards();
      setFilter('all');
    } catch { setError('다시 시도하지 못했습니다. 잠시 후 다시 시도해 주세요.'); }
    finally { setRetrying(null); }
  }

  return <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-xl font-bold">수신 명함</h1><p className="mt-1 text-sm text-slate-600">저장하기 전에 사진과 명함 정보를 확인하세요.</p></div>
      <button onClick={() => navigate('add-card')} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white">명함 등록</button>
    </header>
    <label className="block text-sm">받은 사람 <select aria-label="수신 명함 받은 사람" value={owner} onChange={event => setOwner(event.target.value)} className="ml-2 rounded-lg border border-slate-300 bg-white p-2"><option value="">팀 전체</option>{employees.map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-3">
        <div className="flex flex-wrap gap-1" aria-label="명함 상태">
          {filters.map(([key, label]) => <button key={key} aria-pressed={key === filter} onClick={() => setFilter(key)}
            className={`rounded-lg px-3 py-2 text-sm ${key === filter ? 'bg-blue-50 font-semibold text-blue-800' : 'text-slate-600 hover:bg-slate-50'}`}>
            {label} <span className="text-xs">{key === 'all' ? cards.length : cards.filter(card => statusGroup(card) === key).length}</span>
          </button>)}
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-2.5 py-2">
          <IconSearch size={15} /><input aria-label="명함 검색" className="min-w-0 text-sm focus:outline-none" placeholder="이름·회사·파일명 검색" value={search} onChange={event => setSearch(event.target.value)} />
        </label>
      </div>
      {error && <p role="alert" className="bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {shown.length ? <ul className="divide-y divide-slate-100">{shown.map(card => {
        const name = card.extracted.name.value || card.sourceFileName || '이름 미확인';
        const status = statusGroup(card);
        const issues = reviewIssues(card.extracted);
        return <li key={card.id} className="flex items-center gap-3 p-3 sm:p-4">
          <button aria-label={`명함 상세: ${card.sourceFileName || name}`} onClick={() => navigate('card-detail', { cardId: card.id })} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left hover:bg-slate-50">
            <span className="flex h-12 w-20 shrink-0 items-center justify-center rounded bg-slate-100">
              {card.imageUrl ? <img src={card.imageUrl} alt="" className="h-full w-full rounded object-contain" loading="lazy" /> : <span className="text-xs text-slate-600">사진 미등록</span>}
            </span>
            <span className="min-w-0"><span className="block truncate text-sm font-semibold">{name}</span>
              <span className="block truncate text-xs text-slate-600">{card.extracted.company.value || '회사 미확인'} · {formatDateTime(card.uploadedAt)}</span>
              {status === 'ready_for_review' && <span className="mt-1 block text-xs text-amber-800">{issues.length ? issues.map(issue => issue.message).join(' · ') : card.warnings?.length ? '원본과 추출 정보를 비교해 주세요' : '연락처와 소속 정보를 확인하면 저장할 수 있습니다'}</span>}
            </span>
          </button>
          {status === 'ready_for_review' && isLiveCard(card.id) && <button onClick={() => navigate('ai-recognition', { cardId: card.id })} className="shrink-0 rounded-lg border border-blue-200 px-3 py-2 text-sm text-blue-800">검토</button>}
          {status === 'failed' && isLiveCard(card.id) && <button disabled={retrying !== null} onClick={() => retry(card.id)} className="shrink-0 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 disabled:opacity-50">{retrying === card.id ? '요청 중…' : '다시 시도'}</button>}
          {status === 'processing' && <span className="shrink-0 text-xs text-blue-700">읽는 중…</span>}
          {status === 'reviewed' && <span className="shrink-0 text-xs text-emerald-700">저장 완료</span>}
        </li>;
      })}</ul> : <p className="p-8 text-center text-sm text-slate-600">{query ? '검색 결과가 없습니다.' : filter === 'ready_for_review' ? '확인할 명함이 없습니다.' : '해당 상태의 명함이 없습니다.'}</p>}
    </section>
  </div>;
}
