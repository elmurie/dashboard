import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const DEV_BASE_URL = "https://sandboxapi.cupsolidale.it/api/v1/sapp"
const PROD_BASE_URL = "https://api.cupsolidale.it/api/v1/sapp"

const ACCESS_TOKEN_COOKIE = "sapp_access_token"
const REFRESH_TOKEN_COOKIE = "sapp_refresh_token"

export class SappApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "SappApiError"
    this.status = status
  }
}

function getBaseUrl() {
  if (process.env.SAPP_API_BASE_URL) return process.env.SAPP_API_BASE_URL
  return process.env.NODE_ENV === "production" ? PROD_BASE_URL : DEV_BASE_URL
}

function getBasicAuthHeader(baseUrl: string) {
  const user = process.env.SAPP_BASIC_AUTH_USER ?? "aperion2"
  const password = process.env.SAPP_BASIC_AUTH_PASSWORD ?? "aperion"

  if (!baseUrl.includes("sandboxapi.cupsolidale.it")) return null

  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`
}

function getCommonHeaders(baseUrl: string) {
  const headers = new Headers()
  const basicAuthHeader = getBasicAuthHeader(baseUrl)

  if (basicAuthHeader) {
    headers.set("Authorization", basicAuthHeader)
  }

  return headers
}

type OAuthTokenResponse = {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

type ApiEnvelope<T> = {
  success: boolean
  message?: string
  data: T
  error?: { code?: number; message?: string }
}

async function readErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as Partial<ApiEnvelope<unknown>>
    return payload.error?.message ?? payload.message ?? `SAPP call failed (${response.status})`
  } catch {
    return `SAPP call failed (${response.status})`
  }
}

export async function requestMagicLink(email: string) {
  const baseUrl = getBaseUrl()
  const headers = getCommonHeaders(baseUrl)
  headers.set("Content-Type", "application/json")

  const response = await fetch(`${baseUrl}/auth/request-link`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email }),
  })

  if (!response.ok) {
    throw new SappApiError(await readErrorMessage(response), response.status)
  }

  return response.json()
}

export async function exchangeAuthorizationCode(code: string) {
  const baseUrl = getBaseUrl()
  const headers = getCommonHeaders(baseUrl)
  headers.set("Content-Type", "application/x-www-form-urlencoded")

  const response = await fetch(`${baseUrl}/oauth/token`, {
    method: "POST",
    headers,
    body: new URLSearchParams({ grant_type: "authorization_code", code }),
  })

  if (!response.ok) {
    throw new SappApiError(await readErrorMessage(response), response.status)
  }

  return (await response.json()) as OAuthTokenResponse
}

async function refreshAccessToken(refreshToken: string) {
  const baseUrl = getBaseUrl()
  const headers = getCommonHeaders(baseUrl)
  headers.set("Content-Type", "application/x-www-form-urlencoded")

  const response = await fetch(`${baseUrl}/oauth/token`, {
    method: "POST",
    headers,
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
  })

  if (!response.ok) return null

  return (await response.json()) as OAuthTokenResponse
}

export async function setSessionCookies(response: NextResponse, tokenResponse: OAuthTokenResponse) {
  const isProd = process.env.NODE_ENV === "production"

  response.cookies.set(ACCESS_TOKEN_COOKIE, tokenResponse.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: tokenResponse.expires_in,
    path: "/",
  })

  response.cookies.set(REFRESH_TOKEN_COOKIE, tokenResponse.refresh_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  })
}

export async function clearSessionCookies(response: NextResponse) {
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", { maxAge: 0, path: "/" })
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", { maxAge: 0, path: "/" })
}

export async function getValidAccessToken() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value
  if (accessToken) return { accessToken }

  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value
  if (!refreshToken) return null

  const refreshed = await refreshAccessToken(refreshToken)
  if (!refreshed) return null

  return { accessToken: refreshed.access_token, refreshed }
}

export async function fetchSapp<T>(path: string, init?: RequestInit): Promise<{ payload: ApiEnvelope<T>; refreshed?: OAuthTokenResponse }> {
  const tokenState = await getValidAccessToken()
  if (!tokenState?.accessToken) {
    throw new SappApiError("Unauthorized", 401)
  }

  const baseUrl = getBaseUrl()
  const headers = new Headers(init?.headers)
  headers.set("Authorization", `Bearer ${tokenState.accessToken}`)

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  })

  if (!response.ok) {
    throw new SappApiError(await readErrorMessage(response), response.status)
  }

  const payload = (await response.json()) as ApiEnvelope<T>

  if (!payload.success) {
    throw new SappApiError(payload.error?.message ?? payload.message ?? "SAPP request unsuccessful", payload.error?.code ?? 500)
  }

  return { payload, refreshed: tokenState.refreshed }
}
