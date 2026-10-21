import { useState } from "react"
import {
  CloudUpload,
  History,
  LogOut,
  Plus,
  RotateCcw,
  ShieldCheck,
  UserCheck,
  UsersRound,
  X,
} from "lucide-react"
import { Badge, Button, Card, Input } from "../../components/ui"
import { useApp } from "../../context/AppContext"
import type { UserRole } from "../../domain/selection"

export function UsersAndAuditModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const {
    users,
    currentUser,
    loginAs,
    logout,
    addUser,
    toggleUserActive,
    auditLogs,
    syncStatus,
    syncWithBackend,
    resetAllData,
  } = useApp()

  const [tab, setTab] = useState<"switch" | "manage" | "audit">("switch")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<UserRole>("coach")
  const [title, setTitle] = useState("Pelatih Pendamping")

  if (!open) return null

  function handleAddUser(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return
    addUser({
      name: name.trim(),
      email: email.trim(),
      role,
      title: title.trim() || role.toUpperCase(),
      avatar: "",
      active: true,
    })
    setName("")
    setEmail("")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-slate-950 px-6 py-5 text-white">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-red-400">
              Manajemen akses, RBAC & jejak audit
            </p>
            <h2 className="mt-1 font-display text-xl font-bold">
              Pengguna, Hak Akses & Sinkronisasi Sistem
            </h2>
          </div>
          <Button
            variant="ghost"
            className="!px-2 text-white hover:bg-white/10"
            onClick={onClose}
          >
            <X className="size-5" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-6">
          <div className="flex">
            {([
              ["switch", "Beralih Peran (RBAC)"],
              ["manage", `Kelola Pengguna (${users.length})`],
              ["audit", `Log Audit (${auditLogs.length})`],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`border-b-2 px-4 py-3.5 text-xs font-bold transition ${
                  tab === id
                    ? "border-red-600 text-red-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 py-2">
            <Button
              variant="secondary"
              className="!px-3 !py-1.5 !text-xs"
              loading={syncStatus === "syncing"}
              onClick={syncWithBackend}
            >
              <CloudUpload className="size-3.5" /> Sinkronisasi Cloud
            </Button>
            <Button
              variant="ghost"
              className="!px-3 !py-1.5 !text-xs text-red-600 hover:bg-red-50"
              onClick={() => {
                logout()
                onClose()
              }}
            >
              <LogOut className="size-3.5" /> Keluar Sesi
            </Button>
          </div>
        </div>

        <div className="p-6">
          {tab === "switch" ? (
            <div className="grid gap-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
                Pilih akun di bawah untuk menguji pembatasan hak akses (RBAC)
                secara langsung: <strong>Admin</strong> (akses penuh &
                pengesahan standar), <strong>Pelatih</strong> (sesi latihan &
                administrasi), <strong>Tim Medis</strong> (fokus Rikkes &
                anamnesis), <strong>Juri</strong> (penilaian
                PBB/Samapta/Kepribadian), atau <strong>Portal Kandidat</strong>.
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {users.map((u) => {
                  const isCurrent = u.id === currentUser.id
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        loginAs(u.id)
                        onClose()
                      }}
                      className={`flex items-center gap-3.5 rounded-2xl border p-4 text-left transition ${
                        isCurrent
                          ? "border-red-300 bg-red-50 ring-2 ring-red-100"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`grid size-11 shrink-0 place-items-center rounded-xl text-xs font-bold text-white ${
                          isCurrent ? "bg-red-600" : "bg-slate-900"
                        }`}
                      >
                        {u.avatar}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {u.name}
                          </p>
                          <Badge tone={isCurrent ? "success" : "neutral"}>
                            {u.role.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {u.title} · {u.email}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-500">
                  Ingin mengembalikan seluruh database lokal ke data awal?
                </p>
                <Button variant="danger" onClick={resetAllData}>
                  <RotateCcw className="size-4" /> Reset seluruh data ke default
                </Button>
              </div>
            </div>
          ) : null}

          {tab === "manage" ? (
            <div className="grid gap-6">
              {currentUser.role === "admin" ? (
                <form
                  onSubmit={handleAddUser}
                  className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2"
                >
                  <Input
                    label="Nama pengguna baru"
                    required
                    placeholder="Contoh: Lettu Arifin"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <Input
                    label="Email"
                    type="email"
                    required
                    placeholder="arifin@paskatrack.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Role RBAC
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-normal outline-none focus:border-red-400"
                    >
                      <option value="admin">Admin</option>
                      <option value="coach">Coach / Pelatih</option>
                      <option value="medical">Tim Medis</option>
                      <option value="judge">Juri Penilai</option>
                      <option value="candidate">Kandidat</option>
                    </select>
                  </label>
                  <Input
                    label="Jabatan / spesialisasi"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <div className="flex justify-end sm:col-span-2">
                    <Button type="submit">
                      <Plus className="size-4" /> Undang / tambah pengguna
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
                  Hanya <strong>Administrator</strong> yang dapat mengundang
                  atau menonaktifkan pengguna. Anda saat ini masuk sebagai{" "}
                  <strong>{currentUser.title}</strong>.
                </div>
              )}

              <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 place-items-center rounded-xl bg-slate-900 text-xs font-bold text-white">
                        {u.avatar}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {u.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {u.email} · {u.title}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={u.active ? "success" : "danger"}>
                        {u.active ? "Aktif" : "Nonaktif"}
                      </Badge>
                      {currentUser.role === "admin" &&
                      u.id !== currentUser.id ? (
                        <Button
                          variant="secondary"
                          className="!px-3 !py-1.5 !text-xs"
                          onClick={() => toggleUserActive(u.id)}
                        >
                          {u.active ? "Nonaktifkan" : "Aktifkan"}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {tab === "audit" ? (
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Jejak audit append-only untuk setiap aksi krusial.
                </p>
                <Badge tone="info">{auditLogs.length} aktivitas tercatat</Badge>
              </div>
              <div className="max-h-96 divide-y divide-slate-100 overflow-y-auto rounded-2xl border border-slate-200">
                {auditLogs.map((log) => (
                  <div key={log.id} className="px-4 py-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge tone="neutral">{log.action}</Badge>
                        <strong className="text-slate-900">{log.target}</strong>
                      </div>
                      <span className="text-slate-400">
                        {log.timestamp} · {log.actor} ({log.role})
                      </span>
                    </div>
                    <p className="mt-1 text-slate-600">{log.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function LoginScreen() {
  const { users, loginAs } = useApp()
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
      <Card className="w-full max-w-lg border-white/10 bg-slate-900 p-6 text-white sm:p-8">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-red-600 text-white shadow-lg">
            <ShieldCheck className="size-6" />
          </div>
          <div>
            <p className="font-display text-xl font-bold tracking-tight">
              PASKA TRACK 2026
            </p>
            <p className="text-xs uppercase tracking-widest text-slate-400">
              Sistem Pendamping Internal · Autentikasi RBAC
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-300">
          Pilih akun staf atau peserta di bawah untuk masuk ke sistem sesuai
          peran dan matriks otorisasi (RBAC):
        </p>
        <div className="mt-5 grid gap-3">
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => loginAs(u.id)}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-red-400 hover:bg-white/10"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-red-600 text-xs font-bold text-white">
                  {u.avatar}
                </span>
                <div>
                  <p className="text-sm font-bold text-white">{u.name}</p>
                  <p className="text-xs text-slate-400">
                    {u.title} · {u.email}
                  </p>
                </div>
              </div>
              <Badge tone={u.active ? "info" : "danger"}>
                {u.role.toUpperCase()}
              </Badge>
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}
