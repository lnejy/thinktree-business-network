import { useState } from 'react';
import { cardOwners, employees } from '../data';
import { refreshCards, request, type LiveCard } from '../cardApi';

export function OwnershipEditor({ card }: { card: LiveCard }) {
  const [editing, setEditing] = useState(false);
  const [ownerId, setOwnerId] = useState(card.ownerId);
  const [ownerIds, setOwnerIds] = useState(cardOwners(card));
  const [expected, setExpected] = useState({ ownerId: card.ownerId, ownerIds: cardOwners(card) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function begin() {
    setExpected({ ownerId: card.ownerId, ownerIds: cardOwners(card) });
    setOwnerId(card.ownerId);
    setOwnerIds(cardOwners(card));
    setError('');
    setEditing(true);
  }

  async function save() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await request(`/api/cards/${card.id}/ownership`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId, ownerIds, expectedOwnerId: expected.ownerId, expectedOwnerIds: expected.ownerIds }),
      });
      await refreshCards();
      setEditing(false);
    } catch (failure) {
      setError((failure as Error).message);
      await refreshCards().catch(() => undefined);
    } finally { setBusy(false); }
  }

  return <div className="space-y-3 border-t border-slate-100 pt-3">
    {!editing ? <button onClick={begin} className="text-sm font-medium text-blue-700">담당자·공동 수신자 관리</button> : <form onSubmit={event => { event.preventDefault(); void save(); }} className="space-y-3">
      <label className="block text-sm font-medium">주 담당자<select aria-label="주 담당자" disabled={busy} value={ownerId} onChange={event => { setOwnerId(event.target.value); setOwnerIds([...new Set([...ownerIds, event.target.value])]); }} className="mt-1 w-full rounded-lg border border-slate-300 p-2">
        {employees.map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
      </select></label>
      <fieldset disabled={busy} className="space-y-2"><legend className="mb-2 text-sm font-medium">명함을 받은 사람</legend>{employees.map(employee => <label key={employee.id} className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={ownerIds.includes(employee.id)} disabled={employee.id === ownerId} onChange={event => setOwnerIds(event.target.checked ? [...ownerIds, employee.id] : ownerIds.filter(id => id !== employee.id))} />{employee.name}{employee.id === ownerId && ' · 주 담당자'}
      </label>)}</fieldset>
      <p className="text-xs text-slate-500">체크를 해제하면 해당 팀원의 내 명함과 네트워크 연결에서 제외됩니다.</p>
      <div className="flex gap-2"><button disabled={busy} className="rounded-lg bg-blue-700 px-3 py-2 text-sm text-white disabled:opacity-50">{busy ? '저장 중…' : '담당자 저장'}</button><button type="button" disabled={busy} onClick={() => setEditing(false)} className="rounded-lg border px-3 py-2 text-sm">취소</button></div>
      {error && <p role="alert" className="text-sm text-red-700">{error} <button type="button" onClick={begin} className="underline">최신 내용으로 다시 열기</button></p>}
    </form>}
  </div>;
}
