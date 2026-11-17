import { useState } from 'react';
import type { PageName } from '../Layout';
import { incomingCards, confirmedCards } from '../data';
import { saveReview, request, refreshCards, isLiveCard, needsLinkChoice, type LiveCard, type ReviewOptions } from '../cardApi';
import { OriginalImage } from '../components/CardEvidence';
import { CardFieldEditor, hasRequiredFields, type CardFields } from '../components/CardFields';
import { LinkReview } from '../components/LinkReview';

export default function AIRecognition({ navigate, cardId }: {
  navigate: (page: PageName, params?: Record<string, string>) => void;
  cardId?: string;
}) {
  const card = [...incomingCards, ...confirmedCards].find(item => item.id === cardId) as LiveCard | undefined;
  if (!card) return <div className="p-6"><p>명함을 찾을 수 없습니다.</p><button className="mt-3 text-blue-700" onClick={() => navigate('incoming-cards')}>수신 명함으로 돌아가기</button></div>;
  return <ReviewForm key={card.id} card={card} navigate={navigate} />;
}

function ReviewForm({ card, navigate }: {
  card: LiveCard;
  navigate: (page: PageName, params?: Record<string, string>) => void;
}) {
  const [fields, setFields] = useState<CardFields>(card.extracted);
  const [options, setOptions] = useState<ReviewOptions>({
    effectiveDate: card.effectiveDate, personLink: card.personLink, companyLink: card.companyLink,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmReject, setConfirmReject] = useState(false);
  const live = isLiveCard(card.id);
  const reviewed = card.status === 'reviewed';
  const preview = { ...card, extracted: fields };
  const needsLink = needsLinkChoice(preview, 'person', options) || needsLinkChoice(preview, 'company', options);

  async function save(action: 'draft' | 'confirm') {
    if (busy) return;
    if ((action === 'confirm' || reviewed) && !hasRequiredFields(fields)) {
      setError('회사명과 이름을 입력해 주세요.');
      return;
    }
    if (action === 'confirm' && needsLink) {
      setError('기존 명함과 연결할지 선택해 주세요.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await saveReview(card, fields, action, options);
      if (action === 'confirm') navigate('card-detail', { cardId: card.id });
      else navigate('incoming-cards');
    } catch (exception) { setError((exception as Error).message); }
    finally { setBusy(false); }
  }

  async function reject() {
    setBusy(true);
    setError('');
    try {
      await request(`/api/cards/${card.id}`, { method: 'DELETE' });
      await refreshCards();
      navigate('incoming-cards');
    } catch (exception) { setError((exception as Error).message); }
    finally { setBusy(false); }
  }

  return <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
    <header className="space-y-1">
      <h1 className="text-xl font-bold">{reviewed ? '명함 정보 수정' : '명함 검토'}</h1>
      <p className="text-sm text-slate-600">사진과 비교해 정보를 확인한 뒤 저장하세요.</p>
    </header>
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4"><OriginalImage card={card} /></section>
      <section className="min-w-0 space-y-5 rounded-xl border border-slate-200 bg-white p-4">
        <CardFieldEditor initial={card.extracted} fields={fields} onChange={setFields} disabled={busy || !live} />
        {live && <LinkReview card={preview} options={options} onChange={setOptions} />}
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {live && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-3">
          {!reviewed && <button disabled={busy} onClick={() => setConfirmReject(true)} className="mr-auto px-2 py-2 text-sm text-red-700">명함 삭제</button>}
          {!reviewed && <button disabled={busy} onClick={() => save('draft')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">임시 저장</button>}
          <button disabled={busy || (reviewed && !hasRequiredFields(fields))} onClick={() => save('confirm')} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? '처리 중…' : reviewed ? '변경사항 저장' : '명함 확정 저장'}</button>
        </div>}
        {confirmReject && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm" role="group" aria-label="명함 삭제 확인">
          <p>이 명함과 등록한 사진을 삭제할까요?</p>
          <div className="mt-2 flex gap-3">
            <button disabled={busy} onClick={() => setConfirmReject(false)} className="rounded-lg border px-3 py-1.5">취소</button>
            <button disabled={busy} onClick={reject} className="rounded-lg bg-red-700 px-3 py-1.5 text-white">삭제</button>
          </div>
        </div>}
      </section>
    </div>
  </div>;
}
