import { useRef, useState } from "react"
import type { PageName } from "../Layout"
import type { BusinessCard } from "../data"
import {
  getLiveCard,
  needsLinkChoice,
  refreshCards,
  request,
  saveReview,
  type LiveCard,
  type ReviewOptions,
} from "../cardApi"
import { LinkReview } from "../components/LinkReview"
import { OriginalImage, OcrResults } from "../components/CardEvidence"

type Fields = BusinessCard["extracted"]
type Draft = {
  fields: Fields
  options: ReviewOptions
}
const labels: Record<keyof Fields, string> = {
  company: "회사명",
  name: "이름",
  nameEn: "영문 이름",
  branch: "본사·지점",
  department: "부서",
  team: "팀",
  position: "직책",
  email: "이메일",
  phone: "전화번호",
  mobile: "휴대전화",
  address: "주소",
  website: "홈페이지",
  postalCode: "우편번호",
  address2: "상세 주소",
  fax: "팩스",
}
const keys = Object.keys(labels) as Array<keyof Fields>
const required = (key: keyof Fields) => key === "company" || key === "name"
const needsReview = (fields: Fields, key: keyof Fields) =>
  fields[key].confidence !== "high" && (required(key) || !!fields[key].value)
const canSave = (fields: Fields) =>
  !!fields.company.value.trim() && !!fields.name.value.trim()
function unresolvedLink(card: LiveCard, draft: Draft) {
  const preview = { ...card, extracted: draft.fields }
  return (
    needsLinkChoice(preview, "person", draft.options) ||
    needsLinkChoice(preview, "company", draft.options)
  )
}
const statuses: Record<LiveCard["status"], string> = {
  uploading: "업로드 중",
  ocr_processing: "이미지 보정·OCR 중",
  ai_structuring: "항목 추출 중",
  ready_for_review: "확인 필요",
  reviewed: "저장 완료",
  failed: "인식 실패",
}

export default function MobileCapture({
  navigate,
  userId,
}: {
  navigate: (page: PageName, params?: Record<string, string>) => void
  userId: string
}) {
  const [jobs, setJobs] = useState<LiveCard[]>([])
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [selectedId, setSelectedId] = useState("")
  const [allFields, setAllFields] = useState(false)
  const [engine, setEngine] = useState("local")
  const [language, setLanguage] = useState("auto")
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState<string[]>([])
  const camera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)
  const cards = jobs.map((job) => getLiveCard(job.id) || job)
  const active =
    cards.find((card) => card.id === selectedId) ||
    cards.find((card) => card.status === "ready_for_review") ||
    cards[0]
  const getDraft = (card: LiveCard): Draft =>
    drafts[card.id] || {
      fields: card.extracted,
      options: {
        effectiveDate: card.effectiveDate,
        personLink: card.personLink,
        companyLink: card.companyLink,
      },
    }
  const saveable = cards.filter((card) => {
    const draft = getDraft(card)
    return (
      card.status === "ready_for_review" &&
      canSave(draft.fields) &&
      !unresolvedLink(card, draft)
    )
  })

  async function upload(files: File[]) {
    if (!files.length || busy) return
    setBusy(true)
    setMessages([])
    const errors: string[] = []
    try {
      for (const file of files) {
        try {
          const data = new FormData()
          data.append("file", file)
          data.append("ownerId", userId)
          data.append("engine", engine)
          data.append("language", language)
          const card = await request<LiveCard>("/api/cards", {
            method: "POST",
            body: data,
          })
          setJobs((previous) => [...previous, card])
        } catch (error) {
          errors.push(`${file.name} · ${(error as Error).message}`)
        }
      }
      await refreshCards()
    } catch (error) {
      errors.push((error as Error).message)
    } finally {
      setMessages(errors)
      setBusy(false)
    }
  }

  async function save(targets: LiveCard[]) {
    setBusy(true)
    const errors: string[] = []
    try {
      for (const card of targets) {
        const draft = getDraft(card)
        if (unresolvedLink(card, draft)) {
          errors.push(
            `${card.sourceFileName || draft.fields.name.value} · 기존 명함 연결을 확인하세요.`,
          )
          continue
        }
        try {
          await saveReview(card, draft.fields, "confirm", draft.options)
        } catch (error) {
          errors.push(
            `${card.sourceFileName || draft.fields.name.value} · ${(error as Error).message}`,
          )
        }
      }
    } finally {
      if (!errors.length) setSelectedId("")
      setMessages(errors)
      setBusy(false)
    }
  }

  async function sample(id: string) {
    setBusy(true)
    try {
      const card = await request<LiveCard>(
        `/api/samples/${id}?ownerId=${userId}`,
        { method: "POST" },
      )
      await refreshCards()
      navigate("ai-recognition", { cardId: card.id })
    } catch (error) {
      setMessages([(error as Error).message])
    } finally {
      setBusy(false)
    }
  }

  const draft = active ? getDraft(active) : undefined
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      <header>
        <h1 className="text-xl font-bold">명함 등록</h1>
        <p className="mt-1 text-sm text-slate-600">
          사진 선택 → 자동 보정·인식 → 확인 후 저장
        </p>
      </header>
      <section
        className="bg-white border border-dashed border-slate-300 rounded-xl p-5 space-y-3"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          void upload([...event.dataTransfer.files])
        }}
      >
        <h2 className="font-semibold">명함 사진을 선택하거나 끌어놓으세요</h2>
        <p className="text-sm text-slate-600">
          여러 장을 함께 선택하면 자동으로 인식을 시작합니다.
        </p>
        {busy && (
          <p role="status" className="text-sm text-blue-700">
            처리 중입니다…
          </p>
        )}
        <input
          ref={camera}
          aria-label="명함 카메라 촬영"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/bmp"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            void upload(Array.from(event.target.files || []))
            event.target.value = ""
          }}
        />
        <input
          ref={gallery}
          aria-label="명함 이미지 파일"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/bmp"
          multiple
          className="hidden"
          onChange={(event) => {
            void upload(Array.from(event.target.files || []))
            event.target.value = ""
          }}
        />
        <div className="flex flex-wrap gap-2">
          <button
            disabled={busy}
            onClick={() => gallery.current?.click()}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            사진 선택
          </button>
          <button
            disabled={busy}
            onClick={() => camera.current?.click()}
            className="rounded-lg border px-4 py-2.5 text-sm disabled:opacity-50"
          >
            카메라 촬영
          </button>
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer text-slate-600">
            인식 설정 및 샘플
          </summary>
          <div className="flex flex-wrap gap-3 mt-3">
            <label>
              명함 언어{" "}
              <select
                disabled={busy}
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="border rounded p-1"
              >
                <option value="auto">자동</option>
                <option value="ko">한국어</option>
                <option value="en">영어</option>
                <option value="ja">일본어</option>
              </select>
            </label>
            <label>
              정보 구조화{" "}
              <select
                disabled={busy}
                value={engine}
                onChange={(event) => setEngine(event.target.value)}
                className="border rounded p-1"
              >
                <option value="local">로컬 추출</option>
                <option value="gemini">Gemini</option>
                <option value="claude">Claude</option>
              </select>
            </label>
          </div>
          {engine !== "local" && (
            <p className="mt-2 text-amber-800">
              사진을 선택하면 이미지와 OCR 원문이 {engine} 서비스로 전송됩니다.
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              disabled={busy}
              onClick={() => sample("sample1")}
              className="text-blue-600"
            >
              샘플 1 검토
            </button>
            <button
              disabled={busy}
              onClick={() => sample("sample2")}
              className="text-blue-600"
            >
              샘플 2 검토
            </button>
          </div>
        </details>
      </section>
      {!!messages.length && (
        <ul
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700 space-y-1"
        >
          {messages.map((message, index) => (
            <li key={index}>{message}</li>
          ))}
        </ul>
      )}
      {!!cards.length && (
        <section className="space-y-3" aria-label="등록 진행 상황">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-700" role="status">
              {cards.length}장 등록 ·{" "}
              {cards.filter((card) => card.status === "reviewed").length}장 저장
              완료
            </p>
            {saveable.length > 1 && (
              <button
                disabled={busy}
                onClick={() => save(saveable)}
                className="rounded-lg border border-blue-600 text-blue-700 px-3 py-2 text-sm disabled:opacity-50"
              >
                확인한 명함 {saveable.length}장 저장
              </button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {cards.map((card, index) => (
              <button
                key={card.id}
                onClick={() => {
                  setSelectedId(card.id)
                  setAllFields(false)
                }}
                aria-pressed={active?.id === card.id}
                className={`rounded-lg border px-3 py-2 text-left text-xs ${
                  active?.id === card.id
                    ? "border-blue-500 bg-blue-50"
                    : "bg-white border-slate-200"
                }`}
              >
                <span className="block max-w-40 truncate font-semibold">
                  {card.sourceFileName || `명함 ${index + 1}`}
                </span>
                <span className="text-slate-600">{statuses[card.status]}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      {active && draft && (
        <section className="grid md:grid-cols-2 gap-4 bg-white border border-slate-200 rounded-xl p-4">
          <div className="space-y-3 min-w-0">
            <OriginalImage card={active} />
            <details>
              <summary className="text-sm text-blue-600 cursor-pointer">
                OCR 원문과 인식 결과
              </summary>
              <OcrResults card={active} />
            </details>
          </div>
          <div className="space-y-3 min-w-0">
            <h2 className="font-semibold">{statuses[active.status]}</h2>
            {active.status === "failed" && (
              <p role="alert" className="text-sm text-red-700">
                {active.error} 다른 사진을 선택하거나 수신 명함에서
                재시도하세요.
              </p>
            )}
            {active.status === "reviewed" && (
              <button
                onClick={() => navigate("card-detail", { cardId: active.id })}
                className="text-blue-700 text-sm"
              >
                저장한 명함과 소속 이력 보기 →
              </button>
            )}
            {active.status === "ready_for_review" && (
              <>
                {!allFields &&
                  keys.some(
                    (key) => active.extracted[key].confidence === "high",
                  ) && (
                    <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                      <p className="font-semibold mb-1">자동 입력</p>
                      <dl>
                        {keys
                          .filter(
                            (key) =>
                              active.extracted[key].confidence === "high",
                          )
                          .map((key) => (
                            <div key={key} className="flex gap-2">
                              <dt className="shrink-0">{labels[key]}</dt>
                              <dd className="break-all">
                                {draft.fields[key].value || "미입력"}
                              </dd>
                            </div>
                          ))}
                      </dl>
                    </div>
                  )}
                <div className="flex flex-wrap gap-2 items-center justify-between text-sm">
                  <p className="text-slate-600">
                    확인할 항목{" "}
                    {
                      keys.filter((key) => needsReview(draft.fields, key))
                        .length
                    }
                    개
                  </p>
                  <label className="flex gap-2">
                    <input
                      type="checkbox"
                      checked={allFields}
                      onChange={(event) => setAllFields(event.target.checked)}
                    />
                    전체 항목 보기
                  </label>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {keys
                    .filter(
                      (key) => allFields || needsReview(active.extracted, key),
                    )
                    .map((key) => (
                      <label key={key} className="text-sm">
                        {labels[key]}
                        {required(key) && " *"}
                        <input
                          value={draft.fields[key].value}
                          disabled={busy}
                          onChange={(event) => {
                            const value = event.target.value
                            setDrafts((previous) => ({
                              ...previous,
                              [active.id]: {
                                ...draft,
                                fields: {
                                  ...draft.fields,
                                  [key]: {
                                    value,
                                    confidence: value.trim() ? "high" : "low",
                                  },
                                },
                              },
                            }))
                          }}
                          className="block w-full mt-1 rounded border border-slate-300 px-2 py-1.5"
                        />
                      </label>
                    ))}
                </div>
                <LinkReview
                  card={{ ...active, extracted: draft.fields }}
                  options={draft.options}
                  onChange={(options) =>
                    setDrafts((previous) => ({
                      ...previous,
                      [active.id]: { ...draft, options },
                    }))
                  }
                />
                <button
                  disabled={
                    busy ||
                    !canSave(draft.fields) ||
                    unresolvedLink(active, draft)
                  }
                  onClick={() => save([active])}
                  className="w-full rounded-lg bg-emerald-700 text-white px-4 py-2.5 font-semibold disabled:opacity-40"
                >
                  이 명함 저장
                </button>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
