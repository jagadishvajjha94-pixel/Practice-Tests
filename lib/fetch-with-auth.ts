/** Browser fetch to app APIs using NextAuth cookie session. */
export async function fetchWithAuth(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    credentials: 'include',
    headers: init?.headers,
  });
}
