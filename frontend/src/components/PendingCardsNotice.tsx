import type { PageName } from '../Layout';
import { incomingCards } from '../data';

export function PendingCardsNotice({ navigate }: {
  navigate: (page: PageName, params?: Record<string, string>) => void;
}) {
  if (!incomingCards.length) return null;
  return <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
    <span>미확정 명함 {incomingCards.length}장 · 명함을 확인하고 저장하면 회사·조직도·네트워크에 함께 반영됩니다.</span>
    <button onClick={() => navigate('incoming-cards')} className="shrink-0 rounded px-2 py-1 font-semibold underline">수신 명함 확인</button>
  </div>;
}
