import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "../../components/dashboard/DashboardLayout";
import { getJson, patchJson, postJson } from "../../utils/api";
import { getStoredUserProfile, saveUserProfile } from "../../utils/userProfile";

type MeResponse = {
  user: {
    id: number;
    name?: string | null;
    email: string;
    createdAt?: string;
  };
};

const passwordPolicy =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&])[A-Za-z\d@$!%*?#&]{8,}$/;

export const SettingsPage = () => {
  const storedProfile = useMemo(() => getStoredUserProfile(), []);
  const [profile, setProfile] = useState({
    name: storedProfile.name ?? "",
    email: storedProfile.email ?? "",
  });
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pwStatus, setPwStatus] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const loadMe = async () => {
      try {
        const res = await getJson<MeResponse>("/auth/me");
        setProfile({
          name: res.user.name ?? "",
          email: res.user.email,
        });
      } catch {
        // ignore; fallback to stored profile
      }
    };
    loadMe();
  }, []);

  const handleProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setError(null);
    if (!profile.name.trim() || !profile.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    try {
      const res = await patchJson<{ user: { name?: string | null; email: string } }>(
        "/user/update",
        { name: profile.name.trim(), email: profile.email.trim() }
      );
      saveUserProfile({ name: res.user?.name ?? profile.name, email: res.user.email });
      setStatus("Profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update profile.");
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPwStatus(null);
    setPwError(null);
    const { currentPassword, newPassword, confirmPassword } = passwords;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwError("All password fields are required.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("New password confirmation does not match.");
      return;
    }
    if (!passwordPolicy.test(newPassword)) {
      setPwError("Password must meet complexity requirements.");
      return;
    }
    try {
      await postJson("/auth/change-password", { currentPassword, newPassword });
      setPwStatus("Password updated successfully.");
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Unable to change password.");
    }
  };

  return (
    <DashboardLayout userName={profile.name} userEmail={profile.email}>
      <div className="space-y-6 pb-16">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-primary-500">
              Settings
            </p>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Profile and account
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Update your profile details and password.
            </p>
          </div>
        </header>

        {(error || status) && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
              error
                ? "border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100"
                : "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100"
            }`}
          >
            {error ?? status}
          </div>
        )}

        <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Profile Settings
          </h2>
          <form className="mt-4 space-y-4" onSubmit={handleProfileSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Name
                </span>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))}
                  className="rounded-2xl border border-slate-200/70 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-primary-300 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  placeholder="Your name"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Email
                </span>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))}
                  className="rounded-2xl border border-slate-200/70 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-primary-300 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  placeholder="you@example.com"
                />
              </label>
            </div>
            <button
              type="submit"
              className="rounded-2xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary-900/30 transition hover:brightness-110"
            >
              Save changes
            </button>
          </form>
        </section>

        {(pwError || pwStatus) && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
              pwError
                ? "border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100"
                : "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100"
            }`}
          >
            {pwError ?? pwStatus}
          </div>
        )}

        <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Change Password
          </h2>
          <form className="mt-4 space-y-4" onSubmit={handlePasswordSubmit}>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Current password
                </span>
                <input
                  type="password"
                  value={passwords.currentPassword}
                  onChange={(e) =>
                    setPasswords((prev) => ({ ...prev, currentPassword: e.target.value }))
                  }
                  className="rounded-2xl border border-slate-200/70 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-primary-300 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  New password
                </span>
                <input
                  type="password"
                  value={passwords.newPassword}
                  onChange={(e) =>
                    setPasswords((prev) => ({ ...prev, newPassword: e.target.value }))
                  }
                  className="rounded-2xl border border-slate-200/70 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-primary-300 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  placeholder="At least 8 chars, upper/lower/number/special"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Confirm password
                </span>
                <input
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={(e) =>
                    setPasswords((prev) => ({ ...prev, confirmPassword: e.target.value }))
                  }
                  className="rounded-2xl border border-slate-200/70 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-primary-300 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>
            </div>
            <button
              type="submit"
              className="rounded-2xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary-900/30 transition hover:brightness-110"
            >
              Update password
            </button>
          </form>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
