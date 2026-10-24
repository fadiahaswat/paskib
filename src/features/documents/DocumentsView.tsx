import { useMemo, useState } from "react"
import {
  CheckCircle2,
  Download,
  Edit3,
  FileCheck2,
  FileText,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react"
import { Badge, Button, Card, Input } from "../../components/ui"
import { useApp } from "../../context/AppContext"
import { administrationDocuments } from "../../data/selectionGuide"
import type { SupportingDoc } from "../../domain/selection"

export default function DocumentsView() {
  const {
    currentUser,
    candidates,
    toggleCandidateDocument,
    updateCandidate,
    updateCandidateStage,
    supportingDocs,
    addSupportingDoc,
    updateSupportingDoc,
    deleteSupportingDoc,
    showToast,
  } = useApp()

  const [activeTab, setActiveTab] = useState<"verification" | "supporting">(
    "verification",
  )
  const [search, setSearch] = useState("")
  const [docFilter, setDocFilter] = useState<"all" | "complete" | "incomplete">(
    "all",
  )
  const [showDocForm, setShowDocForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingDoc, setViewingDoc] = useState<SupportingDoc | null>(null)

  const [form, setForm] = useState({
    title: "",
    category: "Pengumuman" as SupportingDoc["category"],
    summary: "",
    content: "",
    fileSize: "520 KB · PDF",
    status: "published" as SupportingDoc["status"],
  })

  const filteredCandidates = useMemo(
    () =>
      candidates.filter((c) => {
        const validCount = (c.documents ?? []).filter(Boolean).length
        if (docFilter === "complete" && validCount < 6) return false
        if (docFilter === "incomplete" && validCount === 6) return false
        if (search.trim()) {
          const term = search.toLowerCase()
          return (
            c.name.toLowerCase().includes(term) ||
            c.number.toLowerCase().includes(term) ||
            c.school.toLowerCase().includes(term)
          )
        }
        return true
      }),
    [candidates, docFilter, search],
  )

  const completeCandidatesCount = useMemo(
    () =>
      candidates.filter((c) => (c.documents ?? []).filter(Boolean).length === 6)
        .length,
    [candidates],
  )

  function approveAllForCandidate(candidateId: string, name: string) {
    updateCandidate(candidateId, {
      documents: [true, true, true, true, true, true],
    })
    updateCandidateStage(
      candidateId,
      0,
      "passed",
      "Seluruh 6 berkas pokok administrasi telah diverifikasi lengkap.",
    )
    showToast(
      `Seluruh 6 berkas ${name} disahkan & Tahap 1 (Administrasi) dinyatakan Lolos.`,
    )
  }

  function openCreateSupporting() {
    setEditingId(null)
    setForm({
      title: "",
      category: "Pengumuman",
      summary: "",
      content: "",
      fileSize: "520 KB · PDF",
      status: "published",
    })
    setShowDocForm(true)
  }

  function openEditSupporting(doc: SupportingDoc) {
    setEditingId(doc.id)
    setForm({
      title: doc.title,
      category: doc.category,
      summary: doc.summary,
      content: doc.content,
      fileSize: doc.fileSize,
      status: doc.status,
    })
    setShowDocForm(true)
  }

  function handleSaveSupporting(e: React.FormEvent) {
    e.preventDefault()
    if (editingId) {
      updateSupportingDoc(editingId, form)
    } else {
      addSupportingDoc(form)
    }
    setShowDocForm(false)
    setEditingId(null)
  }

  function downloadSupportingDoc(doc: SupportingDoc) {
    const text = `${doc.title}\nKategori: ${doc.category}\nDiperbarui: ${doc.updatedAt}\n\nRingkasan:\n${doc.summary}\n\nIsi Dokumen:\n${doc.content}\n`
    const blob = new Blob([text], { type: "text/plain;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${doc.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showToast(`Mengunduh dokumen "${doc.title}"...`, "info")
  }

  if (currentUser.role === "candidate") {
    const publishedDocs = supportingDocs.filter(
      (doc) => doc.status === "published",
    )
    return (
      <div className="grid gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
            Informasi seleksi
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-slate-950 sm:text-3xl">
            Dokumen &amp; pengumuman
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Baca panduan dan pengumuman resmi yang telah diterbitkan untuk
            kandidat.
          </p>
        </div>
        {viewingDoc ? (
          <Card className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge tone="info">{viewingDoc.category}</Badge>
                <h2 className="mt-2 font-display text-xl font-bold text-slate-950">
                  {viewingDoc.title}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Diperbarui: {viewingDoc.updatedAt} · {viewingDoc.fileSize}
                </p>
              </div>
              <Button variant="secondary" onClick={() => setViewingDoc(null)}>
                Tutup
              </Button>
            </div>
            <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
              {viewingDoc.content}
            </p>
            <Button
              className="mt-4"
              variant="secondary"
              onClick={() => downloadSupportingDoc(viewingDoc)}
            >
              <Download className="size-4" /> Unduh salinan
            </Button>
          </Card>
        ) : null}
        {publishedDocs.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {publishedDocs.map((doc) => (
              <Card key={doc.id} className="flex flex-col justify-between p-5">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone="info">{doc.category}</Badge>
                    <span className="text-xs text-slate-400">
                      {doc.fileSize}
                    </span>
                  </div>
                  <h2 className="mt-3 font-display font-bold text-slate-950">
                    {doc.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {doc.summary}
                  </p>
                </div>
                <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
                  <Button
                    variant="secondary"
                    onClick={() => setViewingDoc(doc)}
                  >
                    Baca isi
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => downloadSupportingDoc(doc)}
                  >
                    <Download className="size-4" /> Unduh
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <FileText className="mx-auto size-8 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-800">
              Belum ada dokumen terbit
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Dokumen resmi akan muncul di sini setelah diterbitkan pelatih.
            </p>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 pb-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-950">
              Manajemen dokumen &amp; berkas
            </h1>
            <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-600/10">
              Repository &amp; Verifikasi
            </span>
          </div>
          <p className="mt-0.5 max-w-2xl text-xs text-slate-500">
            Verifikasi enam berkas pokok peserta untuk kelulusan Tahap 1
            (Administrasi) serta kelola dokumen pedoman.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <Button
            size="sm"
            variant={activeTab === "verification" ? "primary" : "secondary"}
            onClick={() => setActiveTab("verification")}
          >
            <FileCheck2 className="size-3.5" /> Verifikasi 6 Berkas (
            {completeCandidatesCount}/{candidates.length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === "supporting" ? "primary" : "secondary"}
            onClick={() => setActiveTab("supporting")}
          >
            <FileText className="size-3.5" /> Dokumen &amp; Pengumuman (
            {supportingDocs.length})
          </Button>
        </div>
      </div>

      {activeTab === "verification" ? (
        <>
          <Card className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {([
                  ["all", `Semua (${candidates.length})`],
                  ["complete", `Lengkap 6/6 (${completeCandidatesCount})`],
                  [
                    "incomplete",
                    `Perlu Dilengkapi (${candidates.length - completeCandidatesCount})`,
                  ],
                ] as const).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setDocFilter(id)}
                    className={`min-h-10 rounded-xl px-4 text-xs font-bold transition ${
                      docFilter === id
                        ? "bg-slate-950 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="relative min-w-64 flex-1 md:max-w-sm">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama kandidat, nomor, atau sekolah..."
                  className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-red-300 focus:bg-white"
                />
              </div>
            </div>
          </Card>

          <div className="grid gap-4">
            {filteredCandidates.map((cand) => {
              const docs = cand.documents ?? [
                false,
                false,
                false,
                false,
                false,
                false,
              ]
              const validCount = docs.filter(Boolean).length
              const isAllValid = validCount === 6

              return (
                <Card key={cand.id} className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-11 place-items-center rounded-xl bg-slate-900 text-xs font-bold text-white">
                        {cand.avatar}
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-display text-base font-bold text-slate-900">
                            {cand.name}
                          </h2>
                          <Badge tone={isAllValid ? "success" : "warning"}>
                            {validCount}/6 Berkas Valid
                          </Badge>
                          <Badge
                            tone={
                              cand.stageStatuses[0] === "passed"
                                ? "info"
                                : "neutral"
                            }
                          >
                            Tahap 1:{" "}
                            {cand.stageStatuses[0] === "passed"
                              ? "Lolos Administrasi"
                              : "Menunggu Verifikasi"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {cand.number} · {cand.school} · NIK:{" "}
                          {cand.nik ?? "Belum diisi"} · Medsos:{" "}
                          {cand.socialMedia ?? "—"}
                        </p>
                      </div>
                    </div>

                    {!isAllValid || cand.stageStatuses[0] !== "passed" ? (
                      <Button
                        variant="secondary"
                        onClick={() =>
                          approveAllForCandidate(cand.id, cand.name)
                        }
                      >
                        <CheckCircle2 className="size-4 text-emerald-600" />{" "}
                        Sahkan 6 berkas & loloskan Adm
                      </Button>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {administrationDocuments.map((docDef, idx) => {
                      const checked = Boolean(docs[idx])
                      return (
                        <label
                          key={docDef.name}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${
                            checked
                              ? "border-emerald-200 bg-emerald-50/70"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              toggleCandidateDocument(cand.id, idx)
                            }
                            className="mt-0.5 size-4 accent-emerald-600"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900">
                              {idx + 1}. {docDef.name}
                            </p>
                            <p className="mt-0.5 text-2xs leading-relaxed text-slate-500">
                              {docDef.detail}
                            </p>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      ) : (
        <div className="grid gap-6">
          <div className="flex justify-end">
            <Button onClick={openCreateSupporting}>
              <Plus className="size-4" /> Terbitkan dokumen / pengumuman
            </Button>
          </div>

          {showDocForm ? (
            <Card className="border-red-200 p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-slate-900">
                  {editingId
                    ? "Edit dokumen pendukung"
                    : "Terbitkan dokumen / pengumuman baru"}
                </h2>
                <Button
                  variant="ghost"
                  className="!px-2"
                  onClick={() => setShowDocForm(false)}
                >
                  <X className="size-5" />
                </Button>
              </div>
              <form onSubmit={handleSaveSupporting} className="mt-5 grid gap-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Input
                    label="Judul dokumen / pengumuman"
                    required
                    value={form.title}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, title: e.target.value }))
                    }
                  />
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Kategori
                    <select
                      value={form.category}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          category: e.target.value as SupportingDoc["category"],
                        }))
                      }
                      className="min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-normal outline-none focus:border-red-400"
                    >
                      <option value="Pengumuman">Pengumuman</option>
                      <option value="Panduan">Panduan</option>
                      <option value="Template">Template</option>
                      <option value="Regulasi">Regulasi</option>
                    </select>
                  </label>
                  <Input
                    label="Format & ukuran"
                    value={form.fileSize}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, fileSize: e.target.value }))
                    }
                  />
                </div>
                <Input
                  label="Ringkasan singkat"
                  required
                  value={form.summary}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, summary: e.target.value }))
                  }
                />
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Isi lengkap dokumen / pengumuman
                  <textarea
                    required
                    rows={4}
                    value={form.content}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, content: e.target.value }))
                    }
                    className="rounded-xl border border-slate-200 p-3.5 text-sm font-normal outline-none focus:border-red-400"
                  />
                </label>
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowDocForm(false)}
                  >
                    Batal
                  </Button>
                  <Button type="submit">Simpan & terbitkan</Button>
                </div>
              </form>
            </Card>
          ) : null}

          {viewingDoc ? (
            <Card className="border-slate-900 bg-slate-950 p-6 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge tone="info">{viewingDoc.category}</Badge>
                  <h2 className="mt-2 font-display text-2xl font-bold">
                    {viewingDoc.title}
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Diperbarui: {viewingDoc.updatedAt} · {viewingDoc.fileSize}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  className="!px-2 text-white hover:bg-white/10"
                  onClick={() => setViewingDoc(null)}
                >
                  <X className="size-5" />
                </Button>
              </div>
              <p className="mt-4 rounded-2xl bg-white/10 p-4 text-sm leading-relaxed text-slate-100">
                {viewingDoc.content}
              </p>
              <div className="mt-4 flex justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() => downloadSupportingDoc(viewingDoc)}
                >
                  <Download className="size-4" /> Unduh salinan teks
                </Button>
              </div>
            </Card>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {supportingDocs.map((doc) => (
              <Card key={doc.id} className="flex flex-col justify-between p-5">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone="info">{doc.category}</Badge>
                    <span className="text-xs text-slate-400">
                      {doc.fileSize}
                    </span>
                  </div>
                  <h3 className="mt-3 font-display text-base font-bold text-slate-900">
                    {doc.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    {doc.summary}
                  </p>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="!px-3 !py-1.5 !text-xs"
                      onClick={() => setViewingDoc(doc)}
                    >
                      Baca isi
                    </Button>
                    <Button
                      variant="secondary"
                      className="!px-3 !py-1.5 !text-xs"
                      onClick={() => downloadSupportingDoc(doc)}
                    >
                      <Download className="size-3.5" /> Unduh
                    </Button>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      className="!px-2"
                      onClick={() => openEditSupporting(doc)}
                    >
                      <Edit3 className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      className="!px-2 text-red-600 hover:bg-red-50"
                      onClick={() => deleteSupportingDoc(doc.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
