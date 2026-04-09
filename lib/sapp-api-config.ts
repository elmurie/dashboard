export const DEV_BASE_URL = "https://sandboxapi.cupsolidale.it/api/v1/sapp"
export const PROD_BASE_URL = "https://api.cupsolidale.it/api/v1/sapp"

export const API_BASE_URL =
  process.env.NODE_ENV === "production" ? PROD_BASE_URL : DEV_BASE_URL