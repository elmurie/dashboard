export const COMPANIES = ["humanray", "humanray_copy"] as const

export type Company = (typeof COMPANIES)[number]

export const DEFAULT_COMPANY: Company = "humanray"

export function isCompany(value: string): value is Company {
  return (COMPANIES as readonly string[]).includes(value)
}

export function normalizeCompany(value: string | null | undefined): Company {
  if (!value) return DEFAULT_COMPANY
  return isCompany(value) ? value : DEFAULT_COMPANY
}
