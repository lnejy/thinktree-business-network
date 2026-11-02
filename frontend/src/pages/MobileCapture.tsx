import React, { useEffect, useRef, useState } from 'react';
import type { PageName } from '../Layout';
import { IconCamera, IconUpload, IconScan } from '../icons';
import { refreshCards, request, type LiveCard } from '../cardApi';

interface Props { navigate: (page: PageName, params?: Record<string, string>) => void; userId: string; }
export default function MobileCapture({ navigate, userId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [engine, setEngine] = useState('local');
  const [language, setLanguage] = useState('auto');
  const [card, setCard] = useState<LiveCard | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    if (!card || ['ready_for_review', 'reviewed', 'failed'].includes(card.status)) return;
    let stopped = false;
    const timer = window.setInterval(async () => {
      try { const next = await request<LiveCard>(`/api/cards/${card.id}`); if (!stopped) { setCard(next); setError(''); } }
      catch (e) { if (!stopped) setError((e as Error).message); }
    }, 2000);
    return () => { stopped = true; clearInterval(timer); };
  }, [card?.id, card?.status]);
  function select(next?: File) {
    if (!next) return;
    setError(''); setCard(null); setFile(null);
    if (next.size > 15 * 1024 * 1024) { setError('15MB 이하의 이미지를 선택하세요.'); return; }
    if (!/\.(jpe?g|png|webp|bmp)$/i.test(next.name)) { setError('JPG, PNG, WEBP, BMP 파일을 선택하세요.'); return; }
    setFile(next);
  }
  async function upload() {
    if (!file || busy) return;
    setBusy(true); setError('');
    try {
      const data = new FormData(); data.append('file', file); data.append('ownerId', userId);
      data.append('engine', engine); data.append('language', language);
      setCard(await request<LiveCard>('/api/cards', { method: 'POST', body: data })); await refreshCards();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function sample(id: string) {
    setBusy(true); setError('');
    try {
      const next = await request<LiveCard>(`/api/samples/${id}?ownerId=${userId}`, { method: 'POST' });
      await refreshCards(); navigate('ai-recognition', { cardId: next.id });
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const processing = card && ['ocr_processing', 'ai_structuring'].includes(card.status);
  const ready = card?.status === 'ready_for_review';
  const locked = busy || !!processing;
  return <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
    <div><h1 className="text-xl font-bold">명함 등록</h1><p className="mt-1 text-sm text-slate-500">사진에서 정보를 추출하고, 원본과 비교하여 검토한 뒤 저장하세요.</p></div>
    <div className="flex flex-wrap gap-3 text-sm text-slate-500">{['1. 촬영·선택', '2. OCR·구조화', '3. 검토·확정'].map((s, i) => <span key={s} className={`rounded-full px-3 py-1 ${i === (ready ? 2 : card ? 1 : 0) ? 'bg-blue-50 text-blue-600 font-semibold' : 'bg-slate-100'}`}>{s}</span>)}</div>
    <div className="grid md:grid-cols-2 gap-5">
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="rounded-xl bg-slate-50 border border-dashed border-slate-300 min-h-64 flex flex-col items-center justify-center overflow-hidden" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (!locked) select(e.dataTransfer.files[0]); }}>
          {preview || card?.imageUrl ? <img src={preview || card?.imageUrl} alt="등록할 명함 원본" className="w-full max-h-96 object-contain" /> : <div className="text-center p-8 text-slate-400"><IconScan size={44} className="mx-auto mb-3" /><p>명함 이미지를 선택하거나 끌어놓으세요</p><p className="text-xs mt-2">JPG · PNG · WEBP · BMP / 최대 15MB</p></div>}
        </div>
        <input ref={camera} aria-label="명함 카메라 촬영" type="file" accept="image/jpeg,image/png,image/webp,image/bmp" capture="environment" className="hidden" onChange={e => { select(e.target.files?.[0]); e.target.value = ''; }} />
        <input ref={gallery} aria-label="명함 이미지 파일" type="file" accept="image/jpeg,image/png,image/webp,image/bmp" className="hidden" onChange={e => { select(e.target.files?.[0]); e.target.value = ''; }} />
        <div className="flex gap-3"><button disabled={locked} onClick={() => camera.current?.click()} className="flex-1 border rounded-lg py-3 flex justify-center gap-2 disabled:opacity-50"><IconCamera size={18} />카메라 촬영</button><button disabled={locked} onClick={() => gallery.current?.click()} className="flex-1 border rounded-lg py-3 flex justify-center gap-2 disabled:opacity-50"><IconUpload size={18} />파일 선택</button></div>
        {file && <p className="text-xs text-slate-500 break-all">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>}
      </div>
      <div className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold">인식 설정</h2>
          <label className="block text-sm">명함 언어<select disabled={locked} value={language} onChange={e => setLanguage(e.target.value)} className="w-full border rounded-lg p-2 mt-2"><option value="auto">자동 비교 (한국어·기본 모델)</option><option value="ko">한국어</option><option value="ja">일본어</option><option value="en">영어</option></select></label>
          <label className="block text-sm">정보 구조화<select disabled={locked} value={engine} onChange={e => setEngine(e.target.value)} className="w-full border rounded-lg p-2 mt-2"><option value="local">로컬 추출 · 외부 전송 없음</option><option value="gemini">Gemini · 서버 API 키 필요</option><option value="claude">Claude · 서버 API 키 필요</option></select></label>
          <p className={`text-xs rounded-lg p-3 ${engine === 'local' ? 'bg-slate-50 text-slate-500' : 'bg-amber-50 text-amber-800'}`}>{engine === 'local' ? '이메일·전화번호·명시된 항목을 추출합니다. 회사명·이름 등 공란은 검토 화면에서 입력하세요.' : '인식을 시작하면 명함 이미지와 OCR 원문이 선택한 외부 AI 서비스로 전송되며, 서버에 설정된 API 키가 사용됩니다.'}</p>
          <button disabled={!file || locked || !!ready} onClick={upload} className="w-full rounded-lg bg-blue-600 text-white py-3 font-semibold disabled:opacity-40">{busy ? '업로드 중…' : processing ? '명함 인식 중…' : 'OCR 인식 시작'}</button>
        </div>
        {card && <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3" role="status">
          <div className="flex items-center gap-2 font-semibold">{processing && <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent animate-spin rounded-full" />}{ready ? '인식 완료 · 검토 대기' : card.status === 'failed' ? '인식 실패' : card.status === 'ai_structuring' ? '추출 정보를 구조화하는 중' : '이미지에서 글자를 인식하는 중'}</div>
          <p className="text-xs text-slate-500">최초 실행은 모델 다운로드로 수 분 걸릴 수 있습니다. 다른 화면으로 이동해도 처리는 계속됩니다.</p>
          {card.error && <p className="text-sm text-red-600">{card.error}</p>}
          {ready && <button onClick={async () => { try { await refreshCards(); navigate('ai-recognition', { cardId: card.id }); } catch (e) { setError((e as Error).message); } }} className="w-full bg-emerald-600 text-white rounded-lg py-3">인식 결과 검토하기 →</button>}
          <button onClick={() => navigate('incoming-cards')} className="text-sm text-blue-600">수신 명함에서 처리 상태 보기</button>
        </div>}
        {error && <p role="alert" className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</p>}
        <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-3"><h2 className="font-semibold text-sm">저장된 샘플로 흐름 확인</h2><p className="text-xs text-slate-500">가상 명함의 이전 OCR·구조화 결과를 불러옵니다. 새 OCR 실행이나 외부 API 호출은 없습니다.</p><div className="flex gap-3"><button disabled={locked} onClick={() => sample('sample1')} className="text-sm text-blue-600 border rounded-lg px-3 py-2">샘플 1 검토</button><button disabled={locked} onClick={() => sample('sample2')} className="text-sm text-blue-600 border rounded-lg px-3 py-2">샘플 2 검토</button></div></div>
      </div>
    </div>
  </div>;
}
