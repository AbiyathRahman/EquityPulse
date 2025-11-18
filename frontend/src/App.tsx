import { useMemo, useState } from "react";
import type { FormEvent, InputHTMLAttributes } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

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

const featureHighlights = [
  "Unified equity and portfolio analytics in one dashboard.",
  "Automated order execution with risk-aware guardrails.",
  "Real-time P&L tracking across devices.",
];

const FieldLabel = ({ children }: { children: string }) => (
  <label className="text-sm font-medium text-slate-200">{children}</label>
);

const Input = ({ ...props }: InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={`h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-base text-white placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 ${props.className ?? ""}`}
  />
);

function App() {
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

  const handleChange = (
    field: keyof typeof initialForm,
    value: string
  ) => {
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
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
        }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          typeof body?.error === "string"
            ? body.error
            : "Unable to complete registration.";
        throw new Error(message);
      }

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
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.25),_transparent_54%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(79,70,229,0.4),_transparent_45%)]" />
        <main className="relative mx-auto flex max-w-6xl flex-col gap-12 px-6 py-12 lg:flex-row lg:items-center lg:py-20">
          <section className="flex-1 space-y-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1 text-sm font-medium tracking-wide text-white/80 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              EquityPulse Access
            </span>
            <div className="space-y-6">
              <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
                Build confidence in every trade with{" "}
                <span className="text-primary-300">real-time insights.</span>
              </h1>
              <p className="text-lg text-slate-300">
                Create an EquityPulse account to unlock portfolio analytics,
                live execution monitoring, and collaborative alerts designed for
                modern investment teams.
              </p>
            </div>
            <ul className="grid gap-4 text-slate-200 sm:grid-cols-2">
              {featureHighlights.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary-500/20 text-primary-200">
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 5.29a1 1 0 0 1 .005 1.414l-7.07 7.07a1 1 0 0 1-1.42-.006L3.3 8.136a1 1 0 1 1 1.414-1.414l4.07 4.068 6.365-6.364a1 1 0 0 1 1.555.865Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  <p className="text-sm font-medium leading-relaxed">{feature}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-900/60 p-8 shadow-2xl shadow-primary-900/20 backdrop-blur">
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
                <Input
                  type="text"
                  name="name"
                  placeholder="Ava Trader"
                  value={form.name}
                  onChange={(event) =>
                    handleChange("name", event.target.value)
                  }
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>Email</FieldLabel>
                <Input
                  type="email"
                  name="email"
                  placeholder="ava@equitypulse.com"
                  value={form.email}
                  onChange={(event) =>
                    handleChange("email", event.target.value)
                  }
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>Password</FieldLabel>
                <Input
                  type="password"
                  name="password"
                  placeholder="Create a strong password"
                  value={form.password}
                  onChange={(event) =>
                    handleChange("password", event.target.value)
                  }
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
                        <span className={valid ? "text-white" : ""}>
                          {label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="space-y-2">
                <FieldLabel>Confirm password</FieldLabel>
                <Input
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
                By creating an account you agree to the EquityPulse Terms of
                Use and Privacy Policy.
              </p>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
