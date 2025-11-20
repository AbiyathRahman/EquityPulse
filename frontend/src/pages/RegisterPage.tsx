import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { AuthShell } from "../components/AuthShell";
import { FieldLabel, TextInput } from "../components/FormControls";
import { postJson } from "../utils/api";

type Status =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | null;

const initialForm = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export const RegisterPage = () => {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState<Status>(null);
  const [isLoading, setIsLoading] = useState(false);

  const passwordChecks = useMemo(
    () => [
      {
        label: "At least 8 characters",
        valid: form.password.length >= 8,
      },
      {
        label: "Contains uppercase & lowercase letters",
        valid: /[A-Z]/.test(form.password) && /[a-z]/.test(form.password),
      },
      {
        label: "Includes at least one number",
        valid: /\d/.test(form.password),
      },
      {
        label: "Includes a special character (@$!%*?#&)",
        valid: /[@$!%*?#&]/.test(form.password),
      },
    ],
    [form.password]
  );

  const localValidationError = useMemo(() => {
    if (!form.name.trim()) return "Please enter your name.";
    if (!form.email.trim()) return "Please enter your email.";
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(form.email.trim()))
      return "Please enter a valid email address.";
    const unmetCheck = passwordChecks.find((check) => !check.valid);
    if (unmetCheck) return `Password must satisfy: ${unmetCheck.label}`;
    if (form.password !== form.confirmPassword)
      return "Password confirmation does not match.";
    return null;
  }, [form, passwordChecks]);

  const handleChange = (field: keyof typeof initialForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    if (localValidationError) {
      setStatus({ type: "error", message: localValidationError });
      return;
    }
    setIsLoading(true);
    try {
      const body = await postJson<{ message?: string }>("/auth/register", {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      setStatus({
        type: "success",
        message: body?.message ?? "Account created successfully.",
      });
      setForm(initialForm);
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
      heroTitle={
        <>
          Build confidence in every trade with{" "}
          <span className="text-primary-300">real-time insights.</span>
        </>
      }
      heroSubtitle="Create an EquityPulse account to unlock portfolio analytics, live execution monitoring, and collaborative alerts designed for modern investment teams."
    >
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.3em] text-primary-200">
          Get Started
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-white">
          Create your account
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          We’ll email you a confirmation once your workspace is ready.
        </p>
      </div>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <FieldLabel>Full name</FieldLabel>
          <TextInput
            type="text"
            name="name"
            placeholder="Ava Trader"
            value={form.name}
            onChange={(event) => handleChange("name", event.target.value)}
            autoComplete="name"
          />
        </div>
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
            placeholder="Create a strong password"
            value={form.password}
            onChange={(event) => handleChange("password", event.target.value)}
            autoComplete="new-password"
          />
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
            <p className="mb-2 font-semibold text-white/90">
              Password requirements
            </p>
            <ul className="space-y-1.5">
              {passwordChecks.map(({ label, valid }) => (
                <li key={label} className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${valid ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-slate-400"}`}
                  >
                    {valid ? "✓" : "•"}
                  </span>
                  <span className={valid ? "text-white" : ""}>{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="space-y-2">
          <FieldLabel>Confirm password</FieldLabel>
          <TextInput
            type="password"
            name="confirmPassword"
            placeholder="Re-enter your password"
            value={form.confirmPassword}
            onChange={(event) =>
              handleChange("confirmPassword", event.target.value)
            }
            autoComplete="new-password"
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
          {isLoading ? "Creating account..." : "Create account"}
        </button>
        <p className="text-center text-xs text-slate-400">
          By creating an account you agree to the EquityPulse Terms of Use and
          Privacy Policy.
        </p>
        <p className="text-center text-sm text-slate-200">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-primary-300 hover:text-primary-200"
          >
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
};

export default RegisterPage;
