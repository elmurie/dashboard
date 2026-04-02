export const DEFAULT_COMPANY = "humanray"

export type CompanySettings = {
  company: string
  can_change_price: boolean
}

export function normalizeCompany(value: string | null | undefined): string {
  if (!value) return DEFAULT_COMPANY
  return value
}

export function normalizeCompaniesResponse(data: unknown): CompanySettings[] {
  if (!Array.isArray(data)) {
    return [{ company: DEFAULT_COMPANY, can_change_price: true }]
  }

  const normalized = data
    .map((item) => {
      if (typeof item === "string") {
        return { company: item, can_change_price: true }
      }

      if (!item || typeof item !== "object") return null

      const company = (item as { company?: unknown }).company
      const canChangePrice = (item as { can_change_price?: unknown }).can_change_price

      if (typeof company !== "string" || company.length === 0) return null

      return {
        company,
        can_change_price: typeof canChangePrice === "boolean" ? canChangePrice : true,
      }
    })
    .filter((item): item is CompanySettings => Boolean(item))

  if (normalized.length > 0) return normalized

  return [{ company: DEFAULT_COMPANY, can_change_price: true }]
}
