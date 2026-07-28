import { refreshSession } from "../features/auth/api/refresh-session";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "../features/auth/store/access-token-store";

let refreshPromise: Promise<string> | null = null;

function requestNewAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = refreshSession()
      .then((response) => {
        setAccessToken(response.accessToken);

        return response.accessToken;
      })
      .catch((error: unknown) => {
        clearAccessToken();

        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("auth:session-expired"));
        }

        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

function createHeaders(
  headers: HeadersInit | undefined,
  accessToken: string | null,
): Headers {
  const result = new Headers(headers);

  if (accessToken) {
    result.set("Authorization", `Bearer ${accessToken}`);
  }

  return result;
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const accessToken = getAccessToken();

  const response = await authenticatedFetch(input, {
    ...init,
    credentials: "include",
    headers: createHeaders(init.headers, accessToken),
  });

  if (response.status !== 401) {
    return response;
  }

  const newAccessToken = await requestNewAccessToken();

  return fetch(input, {
    ...init,
    credentials: "include",
    headers: createHeaders(init.headers, newAccessToken),
  });
}
