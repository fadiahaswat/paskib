import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react"
import { LoaderCircle } from "lucide-react"

export function Button({
  children,
  variant = "primary",
  className = "",
  loading,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: "primary" | "secondary" | "ghost" | "danger"
  loading?: boolean
}) {
  const variants = {
    primary:
      "bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-950/10",
    secondary:
      "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100",
    danger: "bg-red-50 text-red-700 hover:bg-red-100",
  }
  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" /> : null}
      {children}
    </button>
  )
}

export function Input({
  label,
  hint,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string, hint?: string }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      {label}
      <input
        className={`min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-4 focus:ring-red-100 ${className}`}
        {...props}
      />
      {hint ? (
        <span className="text-xs font-normal text-slate-500">{hint}</span>
      ) : null}
    </label>
  )
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode
  tone?: "success" | "warning" | "danger" | "info" | "neutral"
}) {
  const tones = {
    success: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
    warning: "bg-amber-50 text-amber-700 ring-amber-600/10",
    danger: "bg-red-50 text-red-700 ring-red-600/10",
    info: "bg-blue-50 text-blue-700 ring-blue-600/10",
    neutral: "bg-slate-100 text-slate-600 ring-slate-500/10",
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/80 bg-white shadow-sm ${className}`}
    >
      {children}
    </section>
  )
}
