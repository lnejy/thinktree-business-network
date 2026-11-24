import type { BusinessCard } from "./data"

export type ReviewIssue = {
  field: keyof BusinessCard["extracted"]
  message: string
}
export function reviewIssues(fields: BusinessCard["extracted"]): ReviewIssue[] {
  const issues: ReviewIssue[] = []
  if (!fields.company.value.trim())
    issues.push({ field: "company", message: "회사명을 입력하세요" })
  if (!fields.name.value.trim())
    issues.push({ field: "name", message: "이름을 입력하세요" })
  const email = fields.email.value.trim()
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    issues.push({
      field: "email",
      message: "이메일 주소를 하나만 정확히 입력하세요",
    })
  for (const field of ["phone", "mobile", "fax"] as const) {
    const value = fields[field].value.trim()
    if (value && !/^\D*\d[\d\s()+.-]*$/.test(value)) {
      issues.push({
        field,
        message: "전화번호가 여러 개이거나 설명이 포함되어 있습니다",
      })
    } else if (value && !/^\d{7,15}$/.test(value.replace(/\D/g, ""))) {
      issues.push({ field, message: "전화번호 자릿수를 확인하세요" })
    }
  }
  return issues
}
