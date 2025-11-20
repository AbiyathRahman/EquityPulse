import type { InputHTMLAttributes, ReactNode } from "react";

export const FieldLabel = ({ children }: { children: ReactNode }) => (
  <label className="mb-1 block text-sm font-medium text-slate-200">
    {children}
  </label>
);

export const TextInput = ({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={`h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-base text-white placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 ${className ?? ""}`}
  />
);
