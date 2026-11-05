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
        : `No se pudo completar la solicitud (HTTP ${response.status}). Comprueba que el servidor de la API esté en marcha.`
    throw new ApiError(response.status, message)
  }

  if (data === null) {
    throw new ApiError(response.status, 'El servidor devolvió una respuesta inesperada.')
  }

  return data as T
}

export function uploadSetup(
  formData: FormData,
  onProgress: (value: number) => void,
): Promise<{ id: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/setups')
    xhr.withCredentials = true

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total)
    }

    xhr.onload = () => {
      let payload: unknown = null
      try {
        payload = JSON.parse(xhr.responseText)
      } catch {
        // Respuesta vacía o no JSON.
      }

      if (xhr.status >= 200 && xhr.status < 300 && payload && typeof payload === 'object') {
        resolve(payload as { id: string })
        return
      }

      const message =
        payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
          ? payload.error
          : `No se pudo publicar el setup (HTTP ${xhr.status}). Comprueba que el servidor de la API esté en marcha.`
      reject(new ApiError(xhr.status, message))
    }

    xhr.onerror = () => reject(new ApiError(0, 'Se perdió la conexión durante la subida.'))
    xhr.onabort = () => reject(new ApiError(0, 'Subida cancelada.'))
    xhr.send(formData)
  })
}
