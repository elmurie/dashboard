export const DEFAULT_COMPANY = "humanray"

export function normalizeCompany(value: string | null | undefined): string {
  if (!value) return DEFAULT_COMPANY
  return value
}
