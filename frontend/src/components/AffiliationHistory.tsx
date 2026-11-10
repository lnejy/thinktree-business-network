import type { PageName } from "../Layout"
import {
  affiliationChanges,
  cardDate,
  personHistory,
  sharedAffiliations,
} from "../cardApi"

export function AffiliationHistory({
  personId,
  navigate,
}: {
  personId?: string
  navigate: (page: PageName, params?: Record<string, string>) => void
}) {
  const history = personHistory(personId)
  if (!history.length) return null
  const latest = history[0]
  const affiliation = (card: typeof latest) =>
    [
      card.companyId,
      card.extracted.branch.value,
      card.extracted.department.value,
      card.extracted.team.value,
    ].join("|")
  const changedAt = history.findIndex(
    (card) => affiliation(card) !== affiliation(latest),
  )
  const earliest = history[changedAt < 0 ? history.length - 1 : changedAt - 1]
  const peers = personId ? sharedAffiliations(personId) : []
  return (
    <section
      className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 text-sm"
      aria-label="소속 변경 이력"
    >
      <div>
        <h2 className="font-semibold">소속 변경 이력</h2>
        <p className="text-xs mt-1 text-slate-600">
          명함 {history.length}건 · 최신 소속 {latest.extracted.company.value} ·
          현 소속 기록 시작 {cardDate(earliest)} (
          {earliest.effectiveDate ? "확인 기준일" : "등록일 추정"})
        </p>
      </div>
      <ol className="space-y-2">
        {history.map((card, index) => (
          <li key={card.id} className="rounded-lg bg-slate-50 p-3 space-y-1">
            <button
              onClick={() => navigate("card-detail", { cardId: card.id })}
              className="text-left font-semibold text-blue-700"
            >
              {cardDate(card)} · {card.extracted.company.value}{" "}
              {index === 0 && "· 최신"}
            </button>
            <p className="text-xs text-slate-600">
              {card.effectiveDate ? "확인 기준일" : "등록일 추정"} ·{" "}
              {[
                card.extracted.branch.value,
                card.extracted.department.value,
                card.extracted.team.value,
                card.extracted.position.value,
              ]
                .filter(Boolean)
                .join(" · ") || "소속 상세 미입력"}
            </p>
            {affiliationChanges(card, history[index + 1]).map((change) => (
              <p key={change.label} className="text-xs break-words">
                {change.label} {change.from || "미입력"} →{" "}
                {change.to || "미입력"}
              </p>
            ))}
            {(card.personReasons || card.companyReasons) && (
              <details className="text-xs">
                <summary className="cursor-pointer text-slate-600">
                  연결 근거
                </summary>
                <p className="mt-1">인물 · {card.personReasons?.join(" · ")}</p>
                <p>회사 · {card.companyReasons?.join(" · ")}</p>
              </details>
            )}
          </li>
        ))}
      </ol>
      {peers.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer font-semibold">
            소속 기록 기간이 겹치는 사람 {peers.length}건
          </summary>
          <p className="mt-1 text-slate-500">
            각 명함의 기준일부터 다음 소속 기록까지의 구간을 비교한 추정입니다.
          </p>
          <ul className="space-y-1 mt-2">
            {peers.map(({ card, company, date }) => (
              <li key={`${card.id}-${company}`}>
                <button
                  className="text-blue-700"
                  onClick={() => navigate("card-detail", { cardId: card.id })}
                >
                  {card.extracted.name.value} · {company} · {date}부터 기록 겹침
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
