import React, { useRef } from 'react';
import type { LiveCard } from '../cardApi';

export function OriginalImage({ card }: { card: LiveCard }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const original = card.originalUrl || card.imageUrl;
  return <>
    <button onClick={() => dialog.current?.showModal()} className="block w-full cursor-zoom-in" aria-label="명함 원본 확대">
      <img src={card.imageUrl} alt="명함 원본 사진" className="w-full max-h-96 object-contain rounded-lg" />
    </button>
    <div className="flex items-center justify-between gap-3 mt-2 text-xs text-slate-500">
      <span>사진을 누르면 원본을 확대합니다.</span>
      <a href={original} target="_blank" rel="noreferrer" className="text-blue-600 shrink-0">원본 사진 열기 ↗</a>
    </div>
    <dialog ref={dialog} aria-label="명함 원본 사진 확대" className="m-auto rounded-xl p-4 max-w-[96vw] max-h-[95vh] backdrop:bg-slate-950/70" onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }}>
      <div className="flex items-start justify-between gap-4 mb-3"><span className="text-sm break-all">{card.sourceFileName || '명함 원본'}</span><button autoFocus onClick={() => dialog.current?.close()} className="border rounded-lg px-3 py-1 shrink-0" aria-label="원본 확대 닫기">닫기 ×</button></div>
      <img src={original} alt="확대된 명함 원본" className="max-w-full max-h-[78vh] object-contain mx-auto" />
      <a href={original} target="_blank" rel="noreferrer" className="text-blue-600 text-xs block mt-3">원본 크기로 새 창에서 열기 ↗</a>
    </dialog>
  </>;
}

export function OcrResults({ card }: { card: LiveCard }) {
  const evaluation = card.evaluation;
  return <section className="space-y-4 text-sm" aria-label="OCR 테스트 결과">
    {card.sourceFileName && <p className="text-xs text-slate-500 break-all">원본 파일: {card.sourceFileName}</p>}
    {card.source === 'evaluation' && <p className="bg-blue-50 text-blue-700 text-xs p-3 rounded-lg">기존 OCR 테스트의 저장 결과입니다. 새 OCR 실행이나 외부 AI 호출 없이 불러왔습니다. {card.status === 'reviewed' ? '사용자 확정 완료.' : '검토 후 확정하세요.'}</p>}
    {card.ocrRawText && <div><h3 className="font-semibold mb-2">OCR 원문 · {card.language || '언어 미확인'} · {card.model || card.engine}</h3><pre className="text-xs whitespace-pre-wrap break-words bg-slate-50 p-3 rounded-lg max-h-64 overflow-auto">{card.ocrRawText}</pre></div>}
    {evaluation && <>
      <div><h3 className="font-semibold mb-2">OCR 테스트 지표</h3><div className="grid grid-cols-2 gap-2">
        {[['인식 신뢰도', card.confidence], ['내용 포함률', evaluation.coverage], ['문자 정확도', evaluation.accuracy], ['줄 일치율', evaluation.lineRecall]].map(([label, value]) => <div key={label} className="border border-slate-200 rounded-lg p-3"><p className="text-xs text-slate-500">{label}</p><strong className="text-lg">{typeof value === 'number' ? `${value}%` : '정답지 없음'}</strong></div>)}
      </div><p className="text-xs text-slate-500 mt-2">인식 줄 수 {evaluation.lineCount}개 · 정답지 비교 지표와 모델의 인식 신뢰도는 서로 다른 값입니다.</p></div>
      <div><h3 className="font-semibold mb-2">모델별 결과</h3><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-slate-500"><th className="py-2">모델</th><th>평균 신뢰도</th><th>인식 영역</th><th>채택</th></tr></thead><tbody>{evaluation.models.map(model => <tr key={model.model} className="border-t border-slate-100"><td className="py-2">{model.model}</td><td>{model.confidence}%</td><td>{model.textCount}개</td><td>{model.selected ? '✓ 채택' : '비교'}</td></tr>)}</tbody></table></div></div>
      {!!evaluation.groundTruthDetails?.length && <details><summary className="cursor-pointer text-blue-600 text-xs">정답지 항목별 비교</summary><ul className="mt-2 space-y-1 text-xs">{evaluation.groundTruthDetails.map((item, i) => <li key={i} className={item.ok ? 'text-emerald-700' : 'text-amber-700'}>{item.ok ? '✓' : '△'} {item.line} · 문자 오류율 {(item.score * 100).toFixed(1)}%</li>)}</ul></details>}
    </>}
    {card.visualizationUrl && <details><summary className="text-blue-600 cursor-pointer text-xs">OCR 인식 영역 이미지 보기</summary><a href={card.visualizationUrl} target="_blank" rel="noreferrer"><img src={card.visualizationUrl} alt="OCR 인식 영역 표시" className="w-full rounded-lg mt-3" loading="lazy" /></a></details>}
    {card.structured && <details className="text-xs"><summary className="cursor-pointer text-blue-600">최초 구조화 JSON 보기</summary><pre className="whitespace-pre-wrap break-words bg-slate-50 p-3 mt-2 max-h-72 overflow-auto">{JSON.stringify(card.structured, null, 2)}</pre></details>}
  </section>;
}
