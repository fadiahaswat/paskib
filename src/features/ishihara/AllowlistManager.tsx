import React, { useState, useMemo } from "react"
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  Trash2,
  Info,
  Lock,
  Mail,
  User,
  Filter,
} from "lucide-react"
import { Button, Card, Badge } from "../../components/ui"
import { useApp } from "../../context/AppContext"
import type { AccountRole, AuthorizedAccount } from "./types"

export default function AllowlistManager() {
  const {
    candidates,
    ishiharaAllowlist,
    addAuthorizedAccount,
    toggleAuthorizedAccount,
    updateAuthorizedAccountRole,
    deleteAuthorizedAccount,
    currentUser,
    showToast,
  } = useApp()

  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<"all" | AccountRole>("all")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // Form State
  const [formEmail, setFormEmail] = useState("")
  const [formName, setFormName] = useState("")
  const [formRole, setFormRole] = useState<AccountRole>("participant")
  const [formCandidateId, setFormCandidateId] = useState<string>("")
  const [formNotes, setFormNotes] = useState("")

  const filteredAccounts = useMemo(() => {
    return ishiharaAllowlist.filter((acc) => {
      if (roleFilter !== "all" && acc.role !== roleFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          acc.emailNormalized.toLowerCase().includes(q) ||
          acc.fullName.toLowerCase().includes(q) ||
          (acc.notes && acc.notes.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [ishiharaAllowlist, roleFilter, searchQuery])

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanEmail = formEmail.trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes("@")) {
      showToast("Format alamat email Google tidak valid.", "danger")
      return
    }

    if (ishiharaAllowlist.some((a) => a.emailNormalized === cleanEmail)) {
      showToast("Alamat email ini sudah terdaftar dalam allowlist.", "warning")
      return
    }

    addAuthorizedAccount({
      emailNormalized: cleanEmail,
      fullName: formName.trim() || cleanEmail.split("@")[0],
      role: formRole,
      participantId:
        formRole === "participant" ? formCandidateId || undefined : undefined,
      isAllowed: true,
      approvedBy: currentUser.name,
      notes: formNotes.trim() || undefined,
    })

    setIsAddModalOpen(false)
    setFormEmail("")
    setFormName("")
    setFormNotes("")
    setFormCandidateId("")
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & PRD Security Info */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold text-slate-900">
              Allowlist Akun Google Internal
            </h2>
            <Badge tone="emerald" size="sm">
              PRD Bab 5.2
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Daftar akun Google yang memiliki hak akses resmi ke instrumen
            skrining dan data seleksi internal lembaga.
          </p>
        </div>

        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-brand-600 hover:bg-brand-700 text-white font-bold gap-2 text-xs"
        >
          <UserPlus className="size-4" /> Daftarkan Akun Google
        </Button>
      </div>

      {/* Security Callout Box */}
      <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex items-start gap-3 text-xs text-blue-900">
        <Info className="size-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <p className="font-bold text-blue-950">
            Prinsip Otorisasi PRD Versi 1.1:
          </p>
          <p className="mt-0.5 text-blue-800">
            Hanya akun Google yang terdaftar dan berstatus{" "}
            <strong>"Diizinkan"</strong> yang dapat mengakses portal. Akun di
            luar allowlist akan ditolak secara otomatis tanpa pembuatan
            identitas peserta publik. Penonaktifan akun langsung mencabut izin
            akses ke seluruh instrumen seleksi.
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
        <div className="relative flex-1 max-w-sm">
          <Search className="size-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari email atau nama lengkap..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">
            Filter Peran:
          </span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">
              Semua Peran ({ishiharaAllowlist.length})
            </option>
            <option value="admin">
              Admin (
              {ishiharaAllowlist.filter((a) => a.role === "admin").length})
            </option>
            <option value="operator">
              Operator (
              {ishiharaAllowlist.filter((a) => a.role === "operator").length})
            </option>
            <option value="participant">
              Peserta (
              {ishiharaAllowlist.filter((a) => a.role === "participant").length}
              )
            </option>
          </select>
        </div>
      </div>

      {/* Table Allowlist */}
      <Card className="overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-3xs">
              <tr>
                <th className="py-3 px-4">Alamat Email Google</th>
                <th className="py-3 px-4">Nama Pengguna</th>
                <th className="py-3 px-4">Peran</th>
                <th className="py-3 px-4">Status Izin</th>
                <th className="py-3 px-4">Tautan Santri</th>
                <th className="py-3 px-4">Disetujui Oleh</th>
                <th className="py-3 px-4 text-right">Kelola Akses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Tidak ada akun yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => {
                  const linkedCandidate = candidates.find(
                    (c) => c.id === acc.participantId,
                  )

                  return (
                    <tr
                      key={acc.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <Mail className="size-3.5 text-slate-400 shrink-0" />
                          <span>{acc.emailNormalized}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {acc.fullName}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={acc.role}
                          onChange={(e) =>
                            updateAuthorizedAccountRole(
                              acc.id,
                              e.target.value as AccountRole,
                            )
                          }
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-bold focus:ring-1 focus:ring-brand-500 cursor-pointer"
                        >
                          <option value="admin">Admin</option>
                          <option value="operator">Operator</option>
                          <option value="participant">Peserta</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => toggleAuthorizedAccount(acc.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold transition-all cursor-pointer ${
                            acc.isAllowed
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                          }`}
                        >
                          {acc.isAllowed ? (
                            <>
                              <CheckCircle2 className="size-3 text-emerald-600" />{" "}
                              Diizinkan
                            </>
                          ) : (
                            <>
                              <XCircle className="size-3 text-red-600" />{" "}
                              Nonaktif
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        {linkedCandidate ? (
                          <span className="inline-flex items-center gap-1 text-2xs text-slate-700 font-bold bg-slate-100 px-2 py-0.5 rounded">
                            <span className="font-mono text-brand-600">
                              {linkedCandidate.number}
                            </span>
                            <span>{linkedCandidate.name}</span>
                          </span>
                        ) : acc.role === "participant" ? (
                          <span className="text-slate-400 italic text-2xs">
                            Belum ditautkan
                          </span>
                        ) : (
                          <span className="text-slate-400 text-2xs">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-2xs">
                        <div>{acc.approvedBy}</div>
                        <div className="opacity-75">
                          {new Date(acc.approvedAt).toLocaleDateString(
                            "id-ID",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `Hapus izin akun ${acc.emailNormalized} dari allowlist?`,
                              )
                            ) {
                              deleteAuthorizedAccount(acc.id)
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                          title="Hapus dari allowlist"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Tambah Akun Google */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  Daftarkan Akun Google Baru
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tambahkan akun ke tabel otorisasi `authorized_accounts`
                  internal.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddAccount} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alamat Email Google *
                </label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="contoh: nama.santri@muallimin.sch.id"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: DEVGA AULIA"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Peran Pengguna (Role)
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as AccountRole)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500"
                >
                  <option value="participant">
                    Peserta (Mengerjakan Tes Sesuai Penugasan)
                  </option>
                  <option value="operator">
                    Operator / Pengawas (Mengawasi Sesi & Mencatat Hasil)
                  </option>
                  <option value="admin">
                    Admin (Pengelolaan Sesi, Protokol & Otorisasi Akun)
                  </option>
                </select>
              </div>

              {formRole === "participant" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tautkan ke Santri Kandidat (Opsional)
                  </label>
                  <select
                    value={formCandidateId}
                    onChange={(e) => setFormCandidateId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">-- Pilih Profil Santri --</option>
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.number} - {c.name} ({c.school})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Izin (Opsional)
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Misal: Surat dispensasi seleksi Paskibraka 2027"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="bg-brand-600 hover:bg-brand-700 text-white font-bold"
                >
                  Daftarkan Akun
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
