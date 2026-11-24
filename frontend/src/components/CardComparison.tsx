import type { LiveCard } from '../cardApi';
import { cardDate } from '../cardApi';
import { OriginalImage } from './CardEvidence';

const fields = [
  ['name', '이름'], ['nameEn', '영문 이름'], ['company', '회사'], ['branch', '본사·지점'],
  ['department', '부서'], ['team', '팀'], ['position', '직책'], ['email', '이메일'],
  ['phone', '전화'], ['mobile', '휴대전화'],
] as const;

export function CardComparison({ incoming, existing, onLink, onSeparate, selected }: {
  incoming: LiveCard;
  existing: LiveCard;
  onLink: () => void;
  onSeparate: () => void;
  selected?: string | null;
}) {
  return <section aria-label="기존 명함과 비교" className="space-y-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
    <h3 className="text-sm font-semibold">기존 명함과 비교</h3>
    <div className="overflow-x-auto"><table className="w-full min-w-72 text-left text-xs">
      <thead><tr><th className="p-2">항목</th><th className="p-2">기존 명함 · {cardDate(existing)}</th><th className="p-2">확인 중인 명함 · {cardDate(incoming)}</th></tr></thead>
      <tbody>{fields.filter(([key]) => existing.extracted[key].value || incoming.extracted[key].value).map(([key, label]) => {
        const before = existing.extracted[key].value;
        const after = incoming.extracted[key].value;
        const changed = before !== after;
        return <tr key={key} className={changed ? 'bg-amber-50' : 'bg-white'}><th className="p-2 font-medium">{label}{changed && <span className="block text-amber-800">변경</span>}</th><td className="break-all p-2">{before || '미입력'}</td><td className="break-all p-2">{after || '미입력'}</td></tr>;
      })}</tbody>
    </table></div>
    <div className="flex flex-wrap gap-2">
      <button type="button" aria-pressed={selected === existing.id} onClick={onLink} className="rounded-lg border border-blue-600 bg-white px-3 py-2 text-sm text-blue-800">같은 사람 · 이력에 추가</button>
      <button type="button" aria-pressed={selected === 'separate'} onClick={onSeparate} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">동명이인 · 별도 인물</button>
    </div>
    {existing.imageUrl && <details><summary className="cursor-pointer text-xs text-blue-800">기존 명함 원본 확인</summary><div className="mt-2"><OriginalImage key={existing.id} card={existing} /></div></details>}
  </section>;
}
