import axios, { type AxiosError, type AxiosRequestConfig } from "axios"

// The one HTTP client every store talks to the SchoolCollege API through.
// Requests go to /api/v1 on this origin; next.config.ts proxies them to the
// .NET host, so the sign-in cookie stays same-origin (no CORS, no tokens in
// JavaScript). Browser-only: the stores that use it are client modules.

// Successful responses arrive as { data } (Framework/Api/ApiResponse.cs).
type ApiEnvelope<T> = { data: T }

// Failures arrive as RFC 7807 problem details (Framework/Api/ApiExceptionHandler.cs).
type ProblemDetails = {
  title?: string
  detail?: string
  status?: number
  traceId?: string
  errors?: Record<string, string[]>
}

// A failed call, with the server's message and its errors per field, keyed
// by the request's field names so forms can show each under its input.
export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: Record<string, string>
  readonly traceId?: string

  constructor(message: string, status: number, fieldErrors: Record<string, string> = {}, traceId?: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.fieldErrors = fieldErrors
    this.traceId = traceId
  }
}

// ASP.NET keys model-binding errors as "Password" or "$.password"; the admin's
// forms use the camelCase field name.
function fieldKey(key: string) {
  const name = key.replace(/^\$\./, "")
  return name.charAt(0).toLowerCase() + name.slice(1)
}

function toApiError(error: AxiosError<ProblemDetails>): ApiError {
  const response = error.response
  if (!response) return new ApiError("Can't reach the server. Check your connection and try again.", 0)

  const problem = typeof response.data === "object" && response.data ? response.data : {}
  const fieldErrors: Record<string, string> = {}
  for (const [key, messages] of Object.entries(problem.errors ?? {})) {
    if (messages.length) fieldErrors[fieldKey(key)] = messages[0]
  }
  const message =
    problem.detail ??
    fieldErrors[""] ??
    Object.values(fieldErrors)[0] ??
    problem.title ??
    `Request failed (${response.status}).`
  return new ApiError(message, response.status, fieldErrors, problem.traceId)
}

const instance = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
  timeout: 30_000,
  headers: { Accept: "application/json" },
})

// Called when the API answers 401 (the session ended or was revoked), so the
// session store can sign the user out. Set by lib/current-user.ts.
let unauthorizedHandler: (() => void) | undefined

export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler
}

instance.interceptors.response.use(undefined, (error: AxiosError<ProblemDetails>) => {
  const apiError = toApiError(error)
  if (apiError.status === 401) unauthorizedHandler?.()
  return Promise.reject(apiError)
})

// Unwraps { data }; an empty response (204) resolves to undefined.
const unwrap = <T>(response: { data: ApiEnvelope<T> | "" }) =>
  (response.data === "" ? undefined : response.data.data) as T

export const httpClient = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    instance.get<ApiEnvelope<T>>(url, config).then(unwrap<T>),
  post: <T = void>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    instance.post<ApiEnvelope<T>>(url, body, config).then(unwrap<T>),
  put: <T = void>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    instance.put<ApiEnvelope<T>>(url, body, config).then(unwrap<T>),
  patch: <T = void>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    instance.patch<ApiEnvelope<T>>(url, body, config).then(unwrap<T>),
  delete: <T = void>(url: string, config?: AxiosRequestConfig) =>
    instance.delete<ApiEnvelope<T>>(url, config).then(unwrap<T>),
}
