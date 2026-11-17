import {
  affiliationChanges,
  cardDate,
  linkCandidates,
  needsLinkChoice,
  type LinkKind,
  type LiveCard,
  type ReviewOptions,
} from "../cardApi"

export function LinkReview({
  card,
  options,
  onChange,
}: {
  card: LiveCard
  options: ReviewOptions
  onChange: (options: ReviewOptions) => void
}) {
  const needsChoice = needsLinkChoice(card, 'person', options) || needsLinkChoice(card, 'company', options)
  return (
    <details key={String(needsChoice)} open={needsChoice || undefined} className="rounded-lg border border-slate-200 p-4">
      <summary className="cursor-pointer font-semibold text-sm">{needsChoice ? '기존 명함과 연결 확인' : '소속 날짜 및 연결 설정'}</summary>
      <div className="mt-3 space-y-3">
      <label className="block text-sm">
        확인된 기준일
        <input
          type="date"
          value={options.effectiveDate || ""}
          onChange={(event) =>
            onChange({ ...options, effectiveDate: event.target.value || null })
          }
          className="ml-2 border rounded px-2 py-1"
        />
      </label>
      <p className="text-xs text-slate-500">
        기준일을 비워두면 등록일 {cardDate({ ...card, effectiveDate: null })}을
        추정 날짜로 사용합니다.
      </p>
      {(["person", "company"] as LinkKind[]).map((kind) => {
        const key = kind === "person" ? "personLink" : "companyLink"
        const candidates = linkCandidates(card, kind)
        const selected = candidates.find(
          (item) => item.card.id === options[key],
        )
        const suggested = candidates.find((item) => item.reasons.length)
        const evidence = selected || (!options[key] ? suggested : undefined)
        const required = needsLinkChoice(card, kind, options, candidates)
        const strongGroups = new Set(
          candidates
            .filter((item) => item.strong)
            .map((item) =>
              kind === "person" ? item.card.contactId : item.card.companyId,
            ),
        )
        return (
          <div key={kind} className="space-y-1">
            <label className="block text-sm">
              {kind === "person" ? "인물 연결" : "회사 연결"}
              <select
                value={options[key] || ""}
                onChange={(event) =>
                  onChange({ ...options, [key]: event.target.value || null })
                }
                className="block mt-1 w-full border rounded px-2 py-1.5"
              >
                <option value="">
                  {required
                    ? "연결 대상을 확인하세요"
                    : strongGroups.size === 1
                      ? "근거가 충분하면 자동 연결"
                      : "자동으로 별도 등록"}
                </option>
                <option value="separate">연결 분리 · 별도 등록</option>
                {candidates.map(({ card: other, strong, reasons }) => (
                  <option key={other.id} value={other.id}>
                    {other.extracted.name.value} ·{" "}
                    {other.extracted.company.value} · {cardDate(other)}
                    {strong
                      ? " · 강한 근거"
                      : reasons.length
                        ? " · 확인 후보"
                        : ""}
                  </option>
                ))}
              </select>
            </label>
            {evidence && (
              <p className="text-xs text-slate-600">
                {selected ? "선택한 명함" : "가장 가까운 후보"}{" "}
                {evidence.card.extracted.name.value} ·{" "}
                {evidence.card.extracted.company.value}.{" "}
                {evidence.reasons.join(" · ") || "일치 근거 없음"}.
              </p>
            )}
            {required && (
              <p className="text-xs text-amber-700">
                기존 명함에 연결할지, 별도로 등록할지 선택하세요.
              </p>
            )}
            {kind === "person" && evidence && (
              <div className="text-xs text-slate-600">
                {affiliationChanges(card, evidence.card)
                  .slice(0, 4)
                  .map((change) => (
                    <p key={change.label}>
                      {change.label} {change.from || "미입력"} →{" "}
                      {change.to || "미입력"}
                    </p>
                  ))}
              </div>
            )}
          </div>
        )
      })}
      </div>
    </details>
  )
}
