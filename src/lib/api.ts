export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)

  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response
  try {
    response = await fetch(path, { ...init, headers, credentials: 'include' })
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor.')
  }

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : `No se pudo completar la solicitud (HTTP ${response.status}).`
    throw new ApiError(response.status, message)
  }

  if (data === null) {
    throw new ApiError(response.status, 'El servidor devolvió una respuesta inesperada.')
  }

  return data as T
}

export interface CreateSetupInput {
  title: string
  description: string
  images: { url: string }[]
}

export function createSetup(input: CreateSetupInput): Promise<{ id: string }> {
  return api<{ id: string }>('/api/setups', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
