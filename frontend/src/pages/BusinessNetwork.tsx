import { useState } from "react"
import type { PageName } from "../Layout"
import { companies, contacts, employees } from "../data"
import { PendingCardsNotice } from "../components/PendingCardsNotice"
import { ContactPanel } from "../components/ContactPanel"

interface Props {
  navigate: (page: PageName, params?: Record<string, string>) => void
  companyName: string
  userId: string
  companyId?: string
  initialScope?: string
}

export default function BusinessNetwork({
  navigate,
  companyName,
  userId,
  companyId,
  initialScope,
}: Props) {
  const [search, setSearch] = useState("")
  const [scope, setScope] = useState(initialScope === "mine" ? "mine" : "all")
  const [employeeId, setEmployeeId] = useState("")
  const [companyFilter, setCompanyFilter] = useState(companyId || "")
  const [contactId, setContactId] = useState<string | null>(null)
  const query = search.trim().toLocaleLowerCase()
  const shown = contacts.filter((contact) => {
    const company = companies.find((item) => item.id === contact.companyId)
    const searchable = [
      company?.name,
      contact.name,
      contact.nameEn,
      contact.department,
      contact.team,
      contact.email,
    ]
      .join(" ")
      .toLocaleLowerCase()
    return (
      (!query || searchable.includes(query)) &&
      (!companyFilter || contact.companyId === companyFilter) &&
      (!employeeId || contact.ownerIds.includes(employeeId)) &&
      (scope === "all" || contact.ownerIds.includes(userId)) &&
      (scope !== "shared" || contact.ownerIds.length > 1)
    )
  })
  const groups = companies
    .map((company) => ({
      company,
      people: shown.filter((contact) => contact.companyId === company.id),
    }))
    .filter((group) => group.people.length)
    .sort((a, b) => a.company.name.localeCompare(b.company.name, "ko"))
  const selected = shown.find((contact) => contact.id === contactId)

  return (
    <div className="flex min-w-0 flex-col xl:flex-row">
      <div className="min-w-0 flex-1 space-y-5 p-4 md:p-6">
        <header>
          <h1 className="text-xl font-bold">Business Network</h1>
          <p className="mt-1 text-sm text-slate-600">
            회사를 펼쳐 부서와 인물, 연결된 {companyName} 팀원을 확인하세요.
          </p>
        </header>
        <PendingCardsNotice navigate={navigate} />
        <section
          aria-label="네트워크 필터"
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
        >
          <input
            aria-label="네트워크 검색"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="회사·이름·부서·이메일 검색"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            {[
              ["all", "팀 전체"],
              ["mine", "내 명함"],
              ["shared", "함께 아는 사람"],
            ].map(([value, label]) => (
              <button
                key={value}
                aria-pressed={scope === value}
                onClick={() => setScope(value)}
                className={`rounded-lg px-3 py-2 text-sm ${
                  scope === value
                    ? "bg-blue-700 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
            <select
              aria-label="네트워크 회사"
              value={companyFilter}
              onChange={(event) => setCompanyFilter(event.target.value)}
              className="min-w-0 max-w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">모든 회사</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setSearch("")
                setScope("all")
                setEmployeeId("")
                setCompanyFilter("")
              }}
              className="rounded-lg px-3 py-2 text-sm text-blue-700"
            >
              필터 초기화
            </button>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="연결 팀원">
            <button
              aria-pressed={!employeeId}
              onClick={() => setEmployeeId("")}
              className="rounded-full border px-3 py-1.5 text-sm"
            >
              전체 팀원
            </button>
            {employees.map((employee) => (
              <button
                key={employee.id}
                aria-pressed={employeeId === employee.id}
                onClick={() =>
                  setEmployeeId(employeeId === employee.id ? "" : employee.id)
                }
                className={`network-node-employee rounded-full border px-3 py-1.5 text-sm ${
                  employeeId === employee.id
                    ? "border-blue-600 bg-blue-50 text-blue-800"
                    : "border-slate-200"
                }`}
              >
                {employee.name}
              </button>
            ))}
          </div>
        </section>
        <p role="status" className="text-sm text-slate-600">
          회사 {groups.length}개 · 인물 {shown.length}명
          {scope === "shared" && " · 나와 다른 팀원이 함께 연결된 인물"}
        </p>
        <div className="space-y-3">
          {groups.map(({ company, people }) => {
            const owners = employees.filter((employee) =>
              people.some((person) => person.ownerIds.includes(employee.id)),
            )
            const departments = [
              ...new Set(
                people.map(
                  (person) =>
                    [person.department, person.team]
                      .filter(Boolean)
                      .join(" / ") || "부서 미확인",
                ),
              ),
            ]
            return (
              <details
                key={company.id}
                open={query || employeeId ? true : undefined}
                className="network-company overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <summary className="cursor-pointer p-4 marker:text-blue-600">
                  <span className="font-semibold">{company.name}</span>
                  <span className="ml-3 text-sm text-slate-600">
                    {people.length}명
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    연결 팀원 · {owners.map((owner) => owner.name).join(", ")}
                  </span>
                </summary>
                <div className="space-y-4 border-t border-slate-100 p-4">
                  <button
                    className="text-sm font-medium text-blue-700"
                    onClick={() =>
                      navigate("company-detail", { companyId: company.id })
                    }
                  >
                    회사 상세 보기
                  </button>
                  {departments.map((department) => (
                    <section key={department} className="space-y-2">
                      <h2 className="text-sm font-semibold text-slate-600">
                        {department}
                      </h2>
                      <div className="grid gap-2 md:grid-cols-2">
                        {people
                          .filter(
                            (person) =>
                              ([person.department, person.team]
                                .filter(Boolean)
                                .join(" / ") || "부서 미확인") === department,
                          )
                          .map((person) => (
                            <button
                              key={person.id}
                              onClick={() => setContactId(person.id)}
                              aria-pressed={person.id === contactId}
                              className={`network-node-contact rounded-lg border p-3 text-left ${
                                person.id === contactId
                                  ? "border-blue-600 bg-blue-50"
                                  : "border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              <span className="block text-sm font-semibold">
                                {person.name}
                                <span className="ml-2 font-normal text-slate-500">
                                  {person.position}
                                </span>
                              </span>
                              <span className="mt-1 block text-xs text-slate-600">
                                {employees
                                  .filter((employee) =>
                                    person.ownerIds.includes(employee.id),
                                  )
                                  .map((employee) => employee.name)
                                  .join(" · ")}
                              </span>
                            </button>
                          ))}
                      </div>
                    </section>
                  ))}
                </div>
              </details>
            )
          })}
          {!groups.length && (
            <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
              조건에 맞는 연결이 없습니다. 검색어나 필터를 바꿔 주세요.
            </p>
          )}
        </div>
      </div>
      {selected && (
        <ContactPanel
          contactId={selected.id}
          navigate={navigate}
          onClose={() => setContactId(null)}
        />
      )}
    </div>
  )
}
