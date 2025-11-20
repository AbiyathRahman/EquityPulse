import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import type { FormEvent } from "react";
import { AuthShell } from "../components/AuthShell";
import { FieldLabel, TextInput } from "../components/FormControls";
import { postJson } from "../utils/api";
import { saveUserProfile } from "../utils/userProfile";

type Status =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | null;

const initialForm = {
  email: "",
  password: "",
};

export const LoginPage = () => {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState<Status>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (field: keyof typeof initialForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    if (!form.email.trim() || !form.password) {
      setStatus({
        type: "error",
        message: "Please enter your email and password.",
      });
      return;
    }
    setIsLoading(true);
    try {
      const body = await postJson<{
        message?: string;
        token?: string;
        user?: { name?: string | null; email?: string | null };
      }>("/auth/login", {
        email: form.email.trim(),
        password: form.password,
      });

      const greeting =
        body?.user?.name && body.user.name.length
          ? `Welcome back, ${body.user.name}.`
          : "Login successful.";

      if (body?.token) {
        window.localStorage.setItem("equitypulse-token", body.token);
      }
      saveUserProfile({
        name: body?.user?.name ?? form.email.split("@")[0],
        email: body?.user?.email ?? form.email.trim(),
      });

      setStatus({
        type: "success",
        message: body?.message ?? greeting,
      });
      setTimeout(() => navigate("/", { replace: true }), 600);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected error occurred.";
      setStatus({ type: "error", message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      heroTitle="Stay in sync with every execution signal."
      heroSubtitle="Sign in to monitor live orders, manage exposures, and collaborate with your team on EquityPulse."
      badgeLabel="Welcome back"
    >
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.3em] text-primary-200">
          Log In
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-white">
          Access your workspace
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          Enter your credentials to continue where you left off.
        </p>
      </div>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <FieldLabel>Email</FieldLabel>
          <TextInput
            type="email"
            name="email"
            placeholder="ava@equitypulse.com"
            value={form.email}
            onChange={(event) => handleChange("email", event.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <FieldLabel>Password</FieldLabel>
          <TextInput
            type="password"
            name="password"
            placeholder="Enter your password"
            value={form.password}
            onChange={(event) => handleChange("password", event.target.value)}
            autoComplete="current-password"
          />
        </div>
        {status && (
          <p
            className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
              status.type === "success"
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
                : "border-rose-500/50 bg-rose-500/10 text-rose-200"
            }`}
            role="alert"
          >
            {status.message}
          </p>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-primary-500 to-indigo-500 font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </button>
        <p className="text-center text-sm text-slate-200">
          New to EquityPulse?{" "}
          <Link
            to="/register"
            className="font-semibold text-primary-300 hover:text-primary-200"
          >
            Create an account
          </Link>
        </p>
      </form>
    </AuthShell>
  );
};

export default LoginPage;
