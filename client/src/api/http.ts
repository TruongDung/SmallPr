// HTTP request wrapper. Ports public/js/apiClient.js: all calls go through here
// with credentials:'include' so the session cookie is sent. Unlike the legacy
// version, this throws on { error } / non-2xx so TanStack Query can surface it.

export class ApiRequestError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

export const request = async <T = unknown>(
  url: string,
  options: RequestInit = {},
): Promise<T> => {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok || (body && typeof body === 'object' && 'error' in body)) {
    const message =
      (body && typeof body === 'object' && 'error' in body && String((body as { error: unknown }).error)) ||
      `Request failed (${response.status} ${response.statusText || ''})`.trim();
    throw new ApiRequestError(message, response.status);
  }

  return body as T;
};
