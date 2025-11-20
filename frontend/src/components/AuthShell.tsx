import type { ReactNode } from "react";

const defaultHighlights = [
  "Unified equity and portfolio analytics in one dashboard.",
  "Automated order execution with risk-aware guardrails.",
  "Real-time P&L tracking across devices.",
];

interface AuthShellProps {
  heroTitle: ReactNode;
  heroSubtitle: ReactNode;
  badgeLabel?: string;
  highlights?: string[];
  children: ReactNode;
}

const CheckIcon = () => (
  <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary-500/20 text-primary-200">
    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 0 1 .005 1.414l-7.07 7.07a1 1 0 0 1-1.42-.006L3.3 8.136a1 1 0 1 1 1.414-1.414l4.07 4.068 6.365-6.364a1 1 0 0 1 1.555.865Z"
        clipRule="evenodd"
      />
    </svg>
  </span>
);

export const AuthShell = ({
  heroTitle,
  heroSubtitle,
  badgeLabel = "EquityPulse Access",
  highlights = defaultHighlights,
  children,
}: AuthShellProps) => (
  <div className="min-h-screen bg-slate-950 text-white">
    <div className="relative isolate overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.25),_transparent_54%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(79,70,229,0.4),_transparent_45%)]" />
      <main className="relative mx-auto flex max-w-6xl flex-col gap-12 px-6 py-12 lg:flex-row lg:items-center lg:py-20">
        <section className="flex-1 space-y-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1 text-sm font-medium tracking-wide text-white/80 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {badgeLabel}
          </span>
          <div className="space-y-6">
            <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
              {heroTitle}
            </h1>
            <p className="text-lg text-slate-300">{heroSubtitle}</p>
          </div>
          <ul className="grid gap-4 text-slate-200 sm:grid-cols-2">
            {highlights.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <CheckIcon />
                <p className="text-sm font-medium leading-relaxed">{feature}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-900/60 p-8 shadow-2xl shadow-primary-900/20 backdrop-blur">
          {children}
        </section>
      </main>
    </div>
  </div>
);
