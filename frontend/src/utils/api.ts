export const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

export const getToken = () =>
  typeof window !== "undefined"
    ? window.localStorage.getItem("equitypulse-token")
    : null;

const buildHeaders = (extra?: HeadersInit): HeadersInit => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  if (extra) {
    return { ...headers, ...(extra as Record<string, string>) };
  }
  return headers;
};

const handleResponse = async <T>(response: Response) => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof (payload as { error?: string })?.error === "string"
        ? (payload as { error?: string }).error
        : "Unable to complete request.";
    throw new Error(message);
  }
  return payload as T;
};

export const postJson = async <T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(response);
};

export const getJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: buildHeaders(),
  });
  return handleResponse<T>(response);
};

export const patchJson = async <T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "PATCH",
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(response);
};

export const deleteJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "DELETE",
    headers: buildHeaders(),
  });
  return handleResponse<T>(response);
};
