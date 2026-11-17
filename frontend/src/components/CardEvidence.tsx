import React, { useRef, useState } from 'react';
import type { LiveCard } from '../cardApi';

export function OriginalImage({ card }: { card: LiveCard }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [failed, setFailed] = useState(false);
  if (!card.imageUrl) return <p className="rounded-lg bg-slate-50 p-6 text-sm text-slate-600">등록된 사진이 없습니다.</p>;
  const original = card.originalUrl || card.imageUrl;
  return <>
    {failed ? <p className="rounded-lg bg-slate-50 p-6 text-sm text-slate-600">사진을 불러올 수 없습니다.</p> : <button onClick={() => dialog.current?.showModal()} className="block w-full cursor-zoom-in" aria-label="명함 원본 확대">
      <img src={card.imageUrl} onError={() => setFailed(true)} alt="명함 원본 사진" className="w-full max-h-96 object-contain rounded-lg" />
    </button>}
    <div className="flex items-center justify-between gap-3 mt-2 text-xs text-slate-500">
      <span>명함 사진</span>
      <a href={original} target="_blank" rel="noreferrer" className="text-blue-600 shrink-0">원본 사진 열기 ↗</a>
    </div>
    <dialog ref={dialog} aria-label="명함 원본 사진 확대" className="m-auto rounded-xl p-4 max-w-[96vw] max-h-[95vh] backdrop:bg-slate-950/70" onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }}>
      <div className="flex items-start justify-between gap-4 mb-3"><span className="text-sm break-all">{card.sourceFileName || '명함 원본'}</span><button autoFocus onClick={() => dialog.current?.close()} className="border rounded-lg px-3 py-1 shrink-0" aria-label="원본 확대 닫기">닫기 ×</button></div>
      <img src={original} loading="lazy" alt="확대된 명함 원본" className="max-w-full max-h-[78vh] object-contain mx-auto" />
      <a href={original} target="_blank" rel="noreferrer" className="text-blue-600 text-xs block mt-3">원본 크기로 새 창에서 열기 ↗</a>
    </dialog>
  </>;
}
