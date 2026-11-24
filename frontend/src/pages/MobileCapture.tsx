import { useRef, useState } from "react"
import type { PageName } from "../Layout"
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
import { OriginalImage } from "../components/CardEvidence"
import { CardFieldEditor, hasRequiredFields, type CardFields } from "../components/CardFields"
import { reviewIssues } from '../reviewGuidance'

type Draft = {
  fields: CardFields
  options: ReviewOptions
}
function unresolvedLink(card: LiveCard, draft: Draft) {
  const preview = { ...card, extracted: draft.fields }
  return (
    needsLinkChoice(preview, "person", draft.options) ||
    needsLinkChoice(preview, "company", draft.options)
  )
}
const statuses: Record<LiveCard["status"], string> = {
  uploading: "업로드 중",
  ocr_processing: "명함 읽는 중",
  ai_structuring: "명함 읽는 중",
  ready_for_review: "확인 필요",
  reviewed: "저장 완료",
  failed: "인식 실패",
}

export default function MobileCapture({
  navigate,
}: {
  navigate: (page: PageName, params?: Record<string, string>) => void
}) {
  const [jobs, setJobs] = useState<LiveCard[]>([])
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [selectedId, setSelectedId] = useState("")
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
      hasRequiredFields(draft.fields) &&
      !reviewIssues(draft.fields).length &&
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
        if (reviewIssues(draft.fields).length) {
          errors.push(`${card.sourceFileName || draft.fields.name.value} · ${reviewIssues(draft.fields).map(issue => issue.message).join(' · ')}`)
          continue
        }
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

  async function retry(card: LiveCard) {
    setBusy(true)
    setMessages([])
    try {
      await request(`/api/cards/${card.id}/retry`, { method: "POST" })
      await refreshCards()
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
          사진을 올리면 명함 정보를 자동으로 채워 드립니다.
        </p>
      </header>
      <section
        className="space-y-3 rounded-xl border border-dashed border-blue-300 bg-blue-50/60 p-5 md:p-7"
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
                저장 가능한 명함 {saveable.length}장 저장
              </button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {cards.map((card, index) => (
              <button
                key={card.id}
                onClick={() => {
                  setSelectedId(card.id)
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
            <OriginalImage key={active.id} card={active} />
          </div>
          <div className="space-y-3 min-w-0">
            <h2 className="font-semibold">{statuses[active.status]}</h2>
            {active.status === "failed" && (
              <div className="space-y-2">
                <p role="alert" className="text-sm text-red-700">
                  명함을 읽지 못했습니다. 다시 시도하거나 글자가 선명한 사진을 선택해 주세요.
                </p>
                <button disabled={busy} onClick={() => retry(active)} className="rounded-lg border px-3 py-2 text-sm">다시 시도</button>
              </div>
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
                <CardFieldEditor
                  key={active.id}
                  initial={active.extracted}
                  fields={draft.fields}
                  disabled={busy}
                  onChange={fields => setDrafts(previous => ({ ...previous, [active.id]: { ...draft, fields } }))}
                />
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
                    !hasRequiredFields(draft.fields) ||
                    !!reviewIssues(draft.fields).length ||
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
