import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react"
import { LoaderCircle } from "lucide-react"

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  loading,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: "primary" | "secondary" | "ghost" | "danger"
  size?: "sm" | "md" | "lg"
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
  const sizes = {
    sm: "min-h-8 px-2.5 sm:px-3 py-1.5 text-xs rounded-lg gap-1.5",
    md: "min-h-10 px-4 py-2 text-sm rounded-xl gap-2",
    lg: "min-h-11 px-5 py-2.5 text-base rounded-xl gap-2.5",
  }
  return (
    <button
      className={`inline-flex items-center justify-center font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <LoaderCircle className="size-3.5 sm:size-4 animate-spin" /> : null}
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
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <section
      onClick={onClick}
      className={`min-w-0 max-w-full rounded-2xl border border-slate-200/80 bg-white shadow-sm ${className}`}
    >
      {children}
    </section>
  )
}

export function CandidateAvatar({
  name,
  avatar,
  photoUrl,
  className = "size-10 text-xs",
  rounded = "rounded-xl",
}: {
  name?: string
  avatar: string
  photoUrl?: string
  className?: string
  rounded?: string
}) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name ?? avatar}
        className={`${className} ${rounded} object-cover shrink-0 border border-slate-200/80 shadow-2xs`}
      />
    )
  }
  return (
    <span
      className={`grid place-items-center font-display font-bold text-white shrink-0 bg-slate-900 ${rounded} ${className}`}
    >
      {avatar}
    </span>
  )
}

export function UserAvatar({
  avatar,
  name,
  className = "size-8",
  rounded = "rounded-lg",
}: {
  avatar?: string
  name?: string
  className?: string
  rounded?: string
}) {
  const isUrl = Boolean(
    avatar &&
      (avatar.startsWith("http://") ||
        avatar.startsWith("https://") ||
        avatar.startsWith("data:") ||
        avatar.startsWith("/")),
  )

  const initials = (() => {
    if (!name) return "CA"
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return "CA"
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  })()

  if (isUrl) {
    return (
      <img
        src={avatar}
        alt={name ?? "User"}
        className={`${className} ${rounded} object-cover shrink-0 border border-white/10 shadow-xs`}
        onError={(e) => {
          e.currentTarget.style.display = "none"
        }}
      />
    )
  }

  const textVal = avatar && avatar.length <= 4 ? avatar : initials

  return (
    <span
      className={`grid ${className} ${rounded} shrink-0 place-items-center bg-slate-900 text-xs font-bold text-white shadow-xs select-none`}
    >
      {textVal}
    </span>
  )
}
