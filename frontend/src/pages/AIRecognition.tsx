import React, { useState } from 'react';
import { PageName, AIBadge, ConfidenceBadge, Btn, Badge } from '../Layout';
import { IconSparkle, IconCheck, IconX, IconAlertTriangle, IconEdit } from '../icons';
import { incomingCards, confirmedCards, employees } from '../data';
import type { BusinessCard, ConfidenceLevel } from '../data';
import { saveReview, request, refreshCards, isLiveCard, type LiveCard } from '../cardApi';
import { OriginalImage, OcrResults } from '../components/CardEvidence';

interface Props {
  navigate: (page: PageName, params?: Record<string, string>) => void;
  cardId?: string;
}

type FieldKey = keyof BusinessCard['extracted'];

const FIELDS: Array<{ key: FieldKey; label: string; required?: boolean }> = [
  { key: 'company', label: 'Company', required: true },
  { key: 'name', label: 'Name (Original)', required: true },
  { key: 'nameEn', label: 'Name (Reading / English)' },
  { key: 'branch', label: 'Branch / Office' },
  { key: 'department', label: 'Department' },
  { key: 'team', label: 'Team' },
  { key: 'position', label: 'Position' },
  { key: 'phone', label: 'Phone' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'email', label: 'Email' },
  { key: 'address', label: 'Address' },
  { key: 'website', label: 'Website' },
  { key: 'fax', label: 'FAX' },
  { key: 'postalCode', label: 'Postal Code' },
  { key: 'address2', label: 'Address 2' },
];

export default function AIRecognition({ navigate, cardId }: Props) {
  const card = ([...incomingCards, ...confirmedCards].find(c => c.id === cardId) || incomingCards[0]) as LiveCard;
  const uploader = employees.find(e => e.id === card.ownerId);

  const [fields, setFields] = useState(() =>
    Object.fromEntries(
      Object.entries(card.extracted).map(([k, v]) => [k, { value: v.value, confidence: v.confidence }])
    ) as BusinessCard['extracted']
  );

  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const lowConfFields = FIELDS.filter(f => fields[f.key].confidence === 'low');
  const hasLowConf = lowConfFields.length > 0;

  const handleSave = async (action: 'confirm' | 'draft' = 'confirm') => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await saveReview(card, fields, action);
      if (action === 'confirm') { setSaved(true); navigate('card-detail', { cardId: card.id }); }
      else navigate('incoming-cards');
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const handleReject = async () => {
    if (!isLiveCard(card.id)) { setError('예시 명함은 삭제할 수 없습니다.'); return; }
    setBusy(true); setError('');
    try { await request(`/api/cards/${card.id}`, { method: 'DELETE' }); await refreshCards(); navigate('incoming-cards'); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  if (saved) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#ECFDF5' }}>
            <IconCheck size={28} style={{ color: '#059669' }} />
          </div>
          <h2 className="text-lg font-bold mb-1" style={{ color: '#0F172A' }}>Card Saved</h2>
          <p className="text-sm" style={{ color: '#64748B' }}>Redirecting to card detail…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>AI Recognition Result</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
              <IconSparkle size={11} />OCR 신뢰도: {card.confidence}%
            </span>
          </div>
          <p className="text-sm" style={{ color: '#64748B' }}>
            Uploaded by <strong style={{ color: '#374151' }}>{uploader?.name}</strong> · Review and confirm before saving
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-500">OCR 신뢰도는 글자 인식의 평균 점수입니다. 개별 필드의 정확도를 보장하지 않으며, 수정한 필드의 High 표시는 사용자 확인을 의미합니다.</p>
      {card.source === 'sample' && <p className="rounded-lg bg-violet-50 p-3 text-sm text-violet-700">저장된 가상 명함 결과를 불러온 샘플입니다. 이번에 OCR이나 외부 AI를 실행한 결과가 아닙니다.</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{error}</p>}
      {!!card.warnings?.length && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{card.warnings.map((w, i) => <p key={i}>{w}</p>)}</div>}
      {/* Low confidence warning */}
      {hasLowConf && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <IconAlertTriangle size={16} style={{ color: '#D97706', marginTop: 1, flexShrink: 0 }} />
          <div>
            <span className="text-sm font-semibold" style={{ color: '#92400E' }}>
              {lowConfFields.length} field{lowConfFields.length > 1 ? 's' : ''} with low confidence
            </span>
            <span className="text-sm ml-2" style={{ color: '#B45309' }}>
              Please verify: {lowConfFields.map(f => f.label).join(', ')}
            </span>
          </div>
        </div>
      )}

      {/* 2-column layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Card image */}
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#E2E8F0' }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: '#F1F5F9' }}>
            <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>Business Card Image</span>
            <Badge variant="muted">Original scan</Badge>
          </div>
          <div className="p-6">
            {card.imageUrl ? <OriginalImage card={card} /> : <>
            {/* Card mockup */}
            <div className="rounded-xl overflow-hidden shadow-lg" style={{ background: 'white', border: '1px solid #E2E8F0', aspectRatio: '1.75', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px 24px' }}>
              <div>
                <div className="text-xs font-medium mb-1" style={{ color: '#2563EB', fontFamily: 'DM Mono, monospace' }}>
                  {fields.company.value || '회사명'}
                </div>
                <div className="text-xl font-bold" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>
                  {fields.name.value || '성명'}
                </div>
                <div className="text-sm mt-0.5" style={{ color: '#64748B' }}>{fields.nameEn.value}</div>
              </div>
              <div>
                <div className="text-xs font-medium mb-1" style={{ color: '#475569' }}>{fields.department.value} {fields.team.value}</div>
                <div className="text-xs" style={{ color: '#64748B' }}>{fields.position.value}</div>
                <div className="mt-2 space-y-0.5">
                  {fields.phone.value && <div className="text-xs" style={{ color: '#94A3B8' }}>T. {fields.phone.value}</div>}
                  {fields.email.value && <div className="text-xs" style={{ color: '#94A3B8' }}>{fields.email.value}</div>}
                </div>
              </div>
            </div>
            <p className="text-xs text-center mt-4" style={{ color: '#94A3B8' }}>
              예시 명함 미리보기
            </p>
            </>}
            <div className="mt-5"><OcrResults card={card} /></div>
          </div>

          {/* AI analysis summary */}
          <div className="mx-4 mb-4 p-3 rounded-lg" style={{ background: '#F8FAFC' }}>
            <div className="flex items-center gap-2 mb-2">
              <IconSparkle size={12} style={{ color: '#7C3AED' }} />
              <span className="text-xs font-semibold" style={{ color: '#7C3AED' }}>AI Extraction Summary</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['high', 'medium', 'low'] as ConfidenceLevel[]).map(level => {
                const count = Object.values(fields).filter(f => f.confidence === level).length;
                const colors = { high: '#10B981', medium: '#F59E0B', low: '#EF4444' };
                const labels = { high: 'High', medium: 'Medium', low: 'Low' };
                return (
                  <div key={level} className="text-center p-2 rounded" style={{ background: 'white' }}>
                    <div className="text-base font-bold" style={{ color: colors[level], fontFamily: 'DM Mono, monospace' }}>{count}</div>
                    <div className="text-xs" style={{ color: '#94A3B8' }}>{labels[level]}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Form */}
        <div className="bg-white rounded-xl border" style={{ borderColor: '#E2E8F0' }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: '#F1F5F9' }}>
            <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>Extracted Information</span>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: '#64748B' }}>
              <AIBadge />
              <span>Auto-extracted · editable</span>
            </div>
          </div>

          <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 340px)' }}>
            <div className="space-y-3">
              {FIELDS.map(({ key, label, required }) => {
                const field = fields[key];
                const isLow = field.confidence === 'low';
                const isMedium = field.confidence === 'medium';

                return (
                  <div
                    key={key}
                    className="rounded-lg p-3"
                    style={{
                      background: isLow ? '#FFF9F9' : isMedium ? '#FFFDF5' : '#FAFAFA',
                      border: `1px solid ${isLow ? '#FCA5A5' : isMedium ? '#FDE68A' : '#F1F5F9'}`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <label htmlFor={`field-${key}`} className="text-xs font-medium" style={{ color: '#374151' }}>
                          {label}
                          {required && <span style={{ color: '#EF4444' }}> *</span>}
                        </label>
                        <AIBadge />
                        <ConfidenceBadge level={field.confidence} />
                      </div>
                      {isLow && <IconAlertTriangle size={12} style={{ color: '#EF4444' }} />}
                    </div>
                    <input
                      id={`field-${key}`}
                      disabled={busy}
                      value={field.value}
                      onChange={e => setFields(prev => ({
                        ...prev,
                        [key]: { ...prev[key], value: e.target.value, confidence: (e.target.value.trim() ? 'high' : 'low') as ConfidenceLevel }
                      }))}
                      className="w-full text-sm px-2 py-1.5 rounded border outline-none transition-colors bg-white"
                      style={{
                        borderColor: isLow ? '#FCA5A5' : '#E2E8F0',
                        color: '#0F172A',
                      }}
                      onFocus={e => (e.currentTarget.style.borderColor = '#2563EB')}
                      onBlur={e => (e.currentTarget.style.borderColor = isLow ? '#FCA5A5' : '#E2E8F0')}
                      placeholder={`Enter ${label.toLowerCase()}…`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="px-4 py-4 border-t flex items-center gap-2 justify-between" style={{ borderColor: '#F1F5F9' }}>
            <Btn variant="danger" disabled={busy || card.status === 'reviewed'} onClick={handleReject}>
              <IconX size={14} />
              Reject
            </Btn>
            <div className="flex items-center gap-2">
              <Btn variant="secondary" disabled={busy} onClick={() => handleSave('draft')}>
                Save as Draft
              </Btn>
              <button
                onClick={() => handleSave('confirm')}
                disabled={busy}
                className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold text-white"
                style={{ background: '#059669' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#047857')}
                onMouseLeave={e => (e.currentTarget.style.background = '#059669')}
              >
                <IconCheck size={14} />
                Confirm &amp; Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
