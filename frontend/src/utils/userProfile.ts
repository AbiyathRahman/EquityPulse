export type StoredUserProfile = {
  name?: string | null;
  email?: string | null;
};

const STORAGE_KEY = "equitypulse-user";

export const saveUserProfile = (profile: StoredUserProfile) => {
  if (typeof window === "undefined") return;
  const sanitized: StoredUserProfile = {
    name: profile.name?.trim() || null,
    email: profile.email?.trim() || null,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
};

export const getStoredUserProfile = (): StoredUserProfile => {
  if (typeof window === "undefined") return {};
  const data = window.localStorage.getItem(STORAGE_KEY);
  if (!data) return {};
  try {
    const parsed = JSON.parse(data) as StoredUserProfile;
    return {
      name: parsed?.name ?? null,
      email: parsed?.email ?? null,
    };
  } catch {
    return {};
  }
};

export const clearStoredUserProfile = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
};
