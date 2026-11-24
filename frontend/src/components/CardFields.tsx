import { useState } from 'react';
import type { BusinessCard } from '../data';
import { reviewIssues } from '../reviewGuidance';

export type CardFields = BusinessCard['extracted'];
const labels: Record<keyof CardFields, string> = {
  company: '회사명', name: '이름', nameEn: '영문 이름', branch: '본사·지점',
  department: '부서', team: '팀', position: '직책', email: '이메일',
  phone: '전화번호', mobile: '휴대전화', address: '주소', website: '홈페이지',
  postalCode: '우편번호', address2: '상세 주소', fax: '팩스',
};
const keys = Object.keys(labels) as (keyof CardFields)[];
const required = (key: keyof CardFields) => key === 'company' || key === 'name';

export function hasRequiredFields(fields: CardFields) {
  return !!fields.company.value.trim() && !!fields.name.value.trim();
}

export function CardFieldEditor({ initial, fields, onChange, disabled }: {
  initial: CardFields;
  fields: CardFields;
  onChange: (fields: CardFields) => void;
  disabled?: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const issues = reviewIssues(fields);
  const focus = keys.filter(key => required(key) || issues.some(issue => issue.field === key) || (initial[key].value && initial[key].confidence !== 'high'));
  const remaining = keys.filter(key => !focus.includes(key) && fields[key].value);
  const missing = !hasRequiredFields(fields);
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-semibold">명함 정보 확인</h2>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={showAll} onChange={event => setShowAll(event.target.checked)} />전체 항목 보기
      </label>
    </div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {(showAll ? keys : focus).map(key => <label key={key} className="min-w-0 text-sm font-medium text-slate-800">
        {labels[key]}{required(key) && <span className="text-slate-500"> · 필수</span>}
        <input value={fields[key].value} disabled={disabled} aria-required={required(key)} aria-invalid={issues.some(issue => issue.field === key)}
          onChange={event => {
            const value = event.target.value;
            onChange({ ...fields, [key]: { value, confidence: value.trim() ? 'high' : 'low' } });
          }}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600" />
        {issues.filter(issue => issue.field === key).map(issue => <span key={issue.message} className="mt-1 block text-xs text-amber-800">{issue.message}</span>)}
      </label>)}
    </div>
    {missing && <p className="text-sm text-slate-600">비어 있는 회사명과 이름은 사진을 보고 입력해 주세요.</p>}
    {!showAll && remaining.length > 0 && <dl className="space-y-1 rounded-lg bg-slate-50 p-3 text-sm">
      {remaining.map(key => <div className="flex gap-2" key={key}>
        <dt className="shrink-0 text-slate-600">{labels[key]}</dt><dd className="break-all">{fields[key].value}</dd>
      </div>)}
    </dl>}
  </section>;
}
