import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertCircle,
  Award,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Eye,
  FileSpreadsheet,
  HelpCircle,
  Info,
  Play,
  Printer,
  RefreshCw,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Timer,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react"
import { Badge, Button, Card } from "../../components/ui"
import { useApp } from "../../context/AppContext"
import type { Candidate } from "../../domain/selection"
import type {
  IshiharaScreeningResult,
  IshiharaTestSession,
  ScreeningInterpretation,
} from "./types"
import SessionManager from "./SessionManager"
import AllowlistManager from "./AllowlistManager"
import ReportView from "./ReportView"

// Standar Palet Medis Otentik Ishihara dengan Camouflage Shared Noise
const AUTHENTIC_ISHIHARA_PALETTES = {
  // Tipe 1: Angka Hijau di Latar Terracotta / Oranye (Persis piringan #74 di referensi pengguna)
  greenOnOrange: {
    digitPrimary: [
      "#38A874",
      "#2E9A68",
      "#45B682",
      "#268C5B",
      "#52C28E",
      "#349F6E",
      "#42B07C",
      "#299160",
      "#4DBA87",
      "#2D9463",
      "#3CA677",
      "#48B383",
      "#238757",
      "#50BD8B",
      "#319C6B",
    ],
    digitNoise: [
      "#8F8B58",
      "#9B9461",
      "#847F4E",
      "#A69E6A",
      "#7B7647",
      "#928B55",
      "#9E9765",
      "#7D7543",
    ],
    bgPrimary: [
      "#D97D5B",
      "#E38E6E",
      "#C96D4B",
      "#EB9E7F",
      "#B85E3D",
      "#D58564",
      "#E79677",
      "#C46543",
      "#DE8562",
      "#B15837",
      "#CE7653",
      "#E09071",
      "#C76F4E",
      "#DA8666",
      "#EC9C7E",
      "#B96746",
      "#C6714F",
      "#D8805F",
      "#A95232",
    ],
    bgNoise: [
      "#9E915C",
      "#8D824E",
      "#B0A26B",
      "#827845",
      "#948854",
      "#A89B65",
      "#887D4A",
      "#9C905A",
      "#6E8752",
      "#7D945E",
    ],
  },
  // Tipe 2: Angka Oranye/Merah di Latar Zaitun/Sage (Piringan #12, #8, #29, #5)
  orangeOnOlive: {
    digitPrimary: [
      "#D94632",
      "#E35642",
      "#C83B28",
      "#EB6653",
      "#B93220",
      "#E04F3B",
      "#CF422E",
      "#D54834",
      "#C23724",
      "#E65E4A",
      "#BD2E1C",
      "#CD3E2A",
    ],
    digitNoise: [
      "#8E8850",
      "#9A935A",
      "#837E47",
      "#A49C62",
      "#7A7540",
      "#928A52",
    ],
    bgPrimary: [
      "#7D9652",
      "#6F8745",
      "#8FA962",
      "#637A39",
      "#9CB470",
      "#758D4B",
      "#859D59",
      "#6A8240",
      "#93AB66",
      "#718947",
      "#88A05D",
      "#7B9350",
      "#96AE6B",
      "#667D3C",
      "#5C7233",
    ],
    bgNoise: [
      "#B09B6A",
      "#A28D5D",
      "#BEA877",
      "#958153",
      "#B7A271",
      "#C2AD7D",
      "#A99464",
    ],
  },
  // Tipe 3: Angka Cokelat/Ochre di Latar Teal/Cyan (Piringan #15, #57, #73)
  brownOnTeal: {
    digitPrimary: [
      "#C2723E",
      "#B06330",
      "#D1804B",
      "#A25524",
      "#DB8B56",
      "#BD6D39",
      "#CD7C47",
      "#AB5F2D",
      "#C87641",
      "#964C1E",
    ],
    digitNoise: [
      "#628B78",
      "#547C6A",
      "#709986",
      "#486F5E",
      "#5B8371",
    ],
    bgPrimary: [
      "#429E8A",
      "#35907D",
      "#4FA995",
      "#29826F",
      "#5DB4A1",
      "#3A9583",
      "#47A390",
      "#2E8876",
      "#55B09D",
      "#318B79",
      "#247A67",
    ],
    bgNoise: [
      "#9E8256",
      "#8F7449",
      "#AC9063",
      "#82693E",
      "#A4885B",
    ],
  },
}

// 25 Piringan Referensi Standar Ishihara Resmi
const OFFICIAL_ISHIHARA_PLATES: { number: number, difficulty: "demo" | "standard" | "diagnostic", note: string }[] = [
  { number: 12, difficulty: "demo", note: "Plat 1: Terbaca jelas oleh semua mata (normal & buta warna)." },
  { number: 8, difficulty: "standard", note: "Plat 2: Buta warna merah-hijau membaca 3." },
  { number: 6, difficulty: "standard", note: "Plat 3: Buta warna merah-hijau membaca 5." },
  { number: 29, difficulty: "standard", note: "Plat 4: Buta warna merah-hijau membaca 70." },
  { number: 57, difficulty: "standard", note: "Plat 5: Buta warna merah-hijau membaca 35." },
  { number: 5, difficulty: "standard", note: "Plat 6: Buta warna merah-hijau membaca 2." },
  { number: 3, difficulty: "standard", note: "Plat 7: Buta warna merah-hijau membaca 5." },
  { number: 15, difficulty: "standard", note: "Plat 8: Buta warna merah-hijau membaca 17." },
  { number: 74, difficulty: "standard", note: "Plat 9: Buta warna merah-hijau membaca 21." },
  { number: 2, difficulty: "standard", note: "Plat 10: Buta warna sebagian tidak dapat membaca." },
  { number: 6, difficulty: "standard", note: "Plat 11: Buta warna sebagian tidak dapat membaca." },
  { number: 97, difficulty: "standard", note: "Plat 12: Buta warna merah-hijau tidak dapat membaca." },
  { number: 45, difficulty: "standard", note: "Plat 13: Buta warna merah-hijau tidak dapat membaca." },
  { number: 5, difficulty: "standard", note: "Plat 14: Buta warna merah-hijau tidak dapat membaca." },
  { number: 7, difficulty: "standard", note: "Plat 15: Buta warna merah-hijau tidak dapat membaca." },
  { number: 16, difficulty: "standard", note: "Plat 16: Buta warna merah-hijau tidak dapat membaca." },
  { number: 73, difficulty: "standard", note: "Plat 17: Buta warna merah-hijau tidak dapat membaca." },
  { number: 26, difficulty: "diagnostic", note: "Plat 22: Protanopia membaca 6, Deuteranopia membaca 2." },
  { number: 42, difficulty: "diagnostic", note: "Plat 23: Protanopia membaca 2, Deuteranopia membaca 4." },
  { number: 35, difficulty: "diagnostic", note: "Plat 24: Protanopia membaca 5, Deuteranopia membaca 3." },
  { number: 96, difficulty: "diagnostic", note: "Plat 25: Protanopia membaca 6, Deuteranopia membaca 9." },
  { number: 16, difficulty: "standard", note: "Plat 18: Buta warna merah-hijau tidak dapat membaca." },
  { number: 73, difficulty: "standard", note: "Plat 19: Buta warna merah-hijau tidak dapat membaca." },
  { number: 8, difficulty: "standard", note: "Plat 20: Buta warna merah-hijau tidak dapat membaca." },
  { number: 6, difficulty: "standard", note: "Plat 21: Buta warna merah-hijau tidak dapat membaca." },
]

type TestMode = "marathon" | "standard" | "quick"

type TestResultItem = {
  plateIndex: number
  targetNumber: number | null
  userAnswer: number | null
  isCorrect: boolean
  timeSpentSec: number
}

export default function IshiharaView() {
  const {
    candidates,
    updateCandidateStage,
    showToast,
    ishiharaSessions,
    saveIshiharaScreeningResult,
  } = useApp()

  // Tab State
  const [activeTab, setActiveTab] = useState<
    "runner" | "sessions" | "allowlist" | "reports"
  >("runner")
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  // State Konfigurasi Tes
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(
    candidates[0]?.id ?? "",
  )
  const [mode, setMode] = useState<TestMode>("quick")
  const [timerEnabled, setTimerEnabled] = useState(true)
  const [secondsPerPlate, setSecondsPerPlate] = useState(5)

  // State Sesi Berjalan
  const [isStarted, setIsStarted] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(10)
  const [currentNumber, setCurrentNumber] = useState<number>(12)
  const [results, setResults] = useState<TestResultItem[]>([])
  const [inputValue, setInputValue] = useState("")
  const [timeLeft, setTimeLeft] = useState(secondsPerPlate)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const plateStartTime = useRef<number>(Date.now())
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const selectedCandidate = useMemo(
    () => candidates.find((c) => c.id === selectedCandidateId) ?? candidates[0],
    [candidates, selectedCandidateId],
  )

  const activeSession = useMemo(() => {
    if (!activeSessionId) return null
    return ishiharaSessions.find((s) => s.id === activeSessionId) ?? null
  }, [ishiharaSessions, activeSessionId])

  const handleStartSessionForCandidate = (sessionId: string, candidateId: string) => {
    const session = ishiharaSessions.find((s) => s.id === sessionId)
    if (!session) return
    setActiveSessionId(sessionId)
    setSelectedCandidateId(candidateId)
    setSecondsPerPlate(session.secondsPerPlate)
    setTotalQuestions(session.plateCount)
    setActiveTab("runner")
    setCurrentIndex(0)
    setResults([])
    setIsStarted(true)
    setIsFinished(false)
    generateNextQuestion(0)
  }

  // Fungsi Menggambar Piringan Ishihara Otentik Medis (Dense Multi-tier Circle Packing & Camouflage Noise)
  const drawIshiharaPlate = useCallback((num: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const size = 420
    canvas.width = size
    canvas.height = size
    const center = size / 2
    const plateRadius = size / 2 - 10

    // 1. Gambar angka ke offscreen canvas untuk deteksi piksel
    const offCanvas = document.createElement("canvas")
    offCanvas.width = size
    offCanvas.height = size
    const offCtx = offCanvas.getContext("2d")
    if (!offCtx) return

    offCtx.fillStyle = "#ffffff"
    offCtx.fillRect(0, 0, size, size)
    offCtx.fillStyle = "#000000"
    offCtx.textAlign = "center"
    offCtx.textBaseline = "middle"

    // Ukuran font proporsional alami Ishihara
    const fontSize = num > 9 ? 200 : 225
    offCtx.font = `bold ${fontSize}px "Trebuchet MS", "Segoe UI", Arial, sans-serif`
    offCtx.fillText(String(num), center, center + 4)

    const offData = offCtx.getImageData(0, 0, size, size).data

    // 2. Bersihkan canvas utama dan gambar latar piringan
    ctx.clearRect(0, 0, size, size)
    ctx.beginPath()
    ctx.arc(center, center, plateRadius + 4, 0, Math.PI * 2)
    ctx.fillStyle = "#ffffff"
    ctx.fill()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = "#e2e8f0"
    ctx.stroke()

    // 3. Tentukan palet warna otentik
    let palette = AUTHENTIC_ISHIHARA_PALETTES.greenOnOrange
    if (num === 12 || num === 8 || num === 29 || num === 5) {
      palette = AUTHENTIC_ISHIHARA_PALETTES.orangeOnOlive
    } else if (num === 15 || num === 57 || num === 73) {
      palette = AUTHENTIC_ISHIHARA_PALETTES.brownOnTeal
    } else {
      const paletteList = [
        AUTHENTIC_ISHIHARA_PALETTES.greenOnOrange,
        AUTHENTIC_ISHIHARA_PALETTES.orangeOnOlive,
        AUTHENTIC_ISHIHARA_PALETTES.brownOnTeal,
      ]
      palette = paletteList[num % paletteList.length]
    }

    // 4. Multi-tier Dense Circle Packing dengan Spatial Hash Grid
    type PlacedCircle = { x: number, y: number, r: number }
    const placedCircles: PlacedCircle[] = []

    const cellSize = 16
    const gridCols = Math.ceil(size / cellSize)
    const gridRows = Math.ceil(size / cellSize)
    const grid: number[][][] = Array.from({ length: gridCols }, () =>
      Array.from({ length: gridRows }, () => []),
    )

    function canPlace(x: number, y: number, r: number): boolean {
      // Pastikan tetap berada dalam piringan lingkaran
      if (Math.hypot(x - center, y - center) + r > plateRadius - 2) return false

      const gx = Math.floor(x / cellSize)
      const gy = Math.floor(y / cellSize)
      const minX = Math.max(0, gx - 1)
      const maxX = Math.min(gridCols - 1, gx + 1)
      const minY = Math.max(0, gy - 1)
      const maxY = Math.min(gridRows - 1, gy + 1)

      const padding = 0.8
      for (let ix = minX; ix <= maxX; ix++) {
        for (let iy = minY; iy <= maxY; iy++) {
          const cell = grid[ix][iy]
          for (let k = 0; k < cell.length; k++) {
            const other = placedCircles[cell[k]]
            const dist = Math.hypot(x - other.x, y - other.y)
            if (dist < r + other.r + padding) return false
          }
        }
      }
      return true
    }

    function addCircle(x: number, y: number, r: number) {
      const index = placedCircles.length
      placedCircles.push({ x, y, r })
      const gx = Math.floor(x / cellSize)
      const gy = Math.floor(y / cellSize)
      if (gx >= 0 && gx < gridCols && gy >= 0 && gy < gridRows) {
        grid[gx][gy].push(index)
      }
    }

    // Pass 1: Titik besar (Radius 5.0 - 7.6px) ~350 attempts
    for (let i = 0; i < 900; i++) {
      const angle = Math.random() * Math.PI * 2
      const dist = Math.sqrt(Math.random()) * (plateRadius - 8)
      const x = center + Math.cos(angle) * dist
      const y = center + Math.sin(angle) * dist
      const r = 5.0 + Math.random() * 2.6
      if (canPlace(x, y, r)) {
        addCircle(x, y, r)
      }
    }

    // Pass 2: Titik sedang (Radius 3.2 - 5.0px) ~2,500 attempts
    for (let i = 0; i < 3500; i++) {
      const angle = Math.random() * Math.PI * 2
      const dist = Math.sqrt(Math.random()) * (plateRadius - 6)
      const x = center + Math.cos(angle) * dist
      const y = center + Math.sin(angle) * dist
      const r = 3.2 + Math.random() * 1.8
      if (canPlace(x, y, r)) {
        addCircle(x, y, r)
      }
    }

    // Pass 3: Titik halus perapat celah (Radius 1.7 - 3.2px) ~6,000 attempts
    for (let i = 0; i < 6000; i++) {
      const angle = Math.random() * Math.PI * 2
      const dist = Math.sqrt(Math.random()) * (plateRadius - 4)
      const x = center + Math.cos(angle) * dist
      const y = center + Math.sin(angle) * dist
      const r = 1.7 + Math.random() * 1.5
      if (canPlace(x, y, r)) {
        addCircle(x, y, r)
      }
    }

    // 5. Gambar seluruh titik dengan pewarnaan medis otentik (Shared Camouflage Noise)
    for (let i = 0; i < placedCircles.length; i++) {
      const dot = placedCircles[i]
      const px = Math.min(size - 1, Math.max(0, Math.round(dot.x)))
      const py = Math.min(size - 1, Math.max(0, Math.round(dot.y)))
      const imgIndex = (py * size + px) * 4
      const alpha = 255 - offData[imgIndex] // Hitam di offscreen = alpha tinggi

      let color = ""
      if (alpha >= 120) {
        // Area angka murni: 84% warna angka primer, 16% warna camouflage noise bersama
        if (Math.random() < 0.16) {
          color = palette.digitNoise[Math.floor(Math.random() * palette.digitNoise.length)]
        } else {
          color = palette.digitPrimary[Math.floor(Math.random() * palette.digitPrimary.length)]
        }
      } else if (alpha <= 25) {
        // Area latar murni: 86% warna latar primer, 14% warna camouflage noise bersama
        if (Math.random() < 0.14) {
          color = palette.bgNoise[Math.floor(Math.random() * palette.bgNoise.length)]
        } else {
          color = palette.bgPrimary[Math.floor(Math.random() * palette.bgPrimary.length)]
        }
      } else {
        // Zona batas organik (anti-aliased boundary): gradasi probabilitas alami
        const isDigitProb = (alpha - 25) / 95
        if (Math.random() < isDigitProb) {
          color =
            Math.random() < 0.25
              ? palette.digitNoise[Math.floor(Math.random() * palette.digitNoise.length)]
              : palette.digitPrimary[Math.floor(Math.random() * palette.digitPrimary.length)]
        } else {
          color =
            Math.random() < 0.25
              ? palette.bgNoise[Math.floor(Math.random() * palette.bgNoise.length)]
              : palette.bgPrimary[Math.floor(Math.random() * palette.bgPrimary.length)]
        }
      }

      ctx.beginPath()
      ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
    }
  }, [])

  // Generate Soal Berikutnya
  const generateNextQuestion = useCallback(
    (index: number) => {
      let target: number
      if (mode === "standard") {
        const plate = OFFICIAL_ISHIHARA_PLATES[index % OFFICIAL_ISHIHARA_PLATES.length]
        target = plate.number
      } else {
        // Mode Acak (Ribuan Soal Prosedural): Angka 1 s.d. 99
        if (index === 0) {
          target = 12 // Soal pertama selalu piringan demo standar
        } else {
          // Angka 2 digit yang sering digunakan pada tes penglihatan warna
          const commonNums = [3, 5, 6, 8, 9, 15, 16, 26, 29, 35, 42, 45, 57, 73, 74, 96, 97]
          target =
            Math.random() > 0.4
              ? commonNums[Math.floor(Math.random() * commonNums.length)]
              : Math.floor(Math.random() * 89) + 10
        }
      }

      setCurrentNumber(target)
      setInputValue("")
      setTimeLeft(secondsPerPlate)
      plateStartTime.current = Date.now()

      setTimeout(() => {
        drawIshiharaPlate(target)
      }, 50)
    },
    [mode, secondsPerPlate, drawIshiharaPlate],
  )

  // Memulai Tes
  const handleStartTest = () => {
    let qCount = 10
    if (mode === "standard") qCount = OFFICIAL_ISHIHARA_PLATES.length
    if (mode === "marathon") qCount = 50
    if (mode === "quick") qCount = 10

    setTotalQuestions(qCount)
    setCurrentIndex(0)
    setResults([])
    setIsStarted(true)
    setIsFinished(false)
    generateNextQuestion(0)
  }

  // Submit Jawaban
  const handleAnswer = useCallback(
    (answerNum: number | null) => {
      const timeSpent = Math.max(1, Math.round((Date.now() - plateStartTime.current) / 1000))
      const isCorrect = answerNum === currentNumber

      const resultItem: TestResultItem = {
        plateIndex: currentIndex + 1,
        targetNumber: currentNumber,
        userAnswer: answerNum,
        isCorrect,
        timeSpentSec: timeSpent,
      }

      const nextResults = [...results, resultItem]
      setResults(nextResults)

      const nextIndex = currentIndex + 1
      if (nextIndex >= totalQuestions) {
        setIsFinished(true)
        setIsStarted(false)
      } else {
        setCurrentIndex(nextIndex)
        generateNextQuestion(nextIndex)
      }
    },
    [currentIndex, currentNumber, generateNextQuestion, results, totalQuestions],
  )

  // Timer Countdown per Soal
  useEffect(() => {
    if (!isStarted || isFinished || !timerEnabled) return

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Waktu habis: otomatis submit tidak terbaca (null)
          handleAnswer(null)
          return secondsPerPlate
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isStarted, isFinished, timerEnabled, secondsPerPlate, handleAnswer])

  // Support Keyboard Numpad / Enter
  useEffect(() => {
    if (!isStarted || isFinished) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key >= "0" && e.key <= "9") {
        setInputValue((prev) => (prev.length < 2 ? prev + e.key : prev))
      } else if (e.key === "Backspace") {
        setInputValue((prev) => prev.slice(0, -1))
      } else if (e.key === "Enter") {
        if (inputValue) {
          handleAnswer(Number(inputValue))
        }
      } else if (e.key.toLowerCase() === "x" || e.key === " ") {
        handleAnswer(null)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isStarted, isFinished, inputValue, handleAnswer])

  // Statistik Akhir Tes
  const stats = useMemo(() => {
    if (!results.length) return null
    const correctCount = results.filter((r) => r.isCorrect).length
    const accuracy = Math.round((correctCount / results.length) * 100)
    const avgTime = (
      results.reduce((acc, curr) => acc + curr.timeSpentSec, 0) / results.length
    ).toFixed(1)

    // Evaluasi Medis Berdasarkan Akurasi
    let status: "normal" | "partial" | "total" = "normal"
    let statusLabel = "Normal (Bebas Buta Warna)"
    let tone: "success" | "warning" | "danger" = "success"

    if (accuracy >= 85) {
      status = "normal"
      statusLabel = "Penglihatan Warna Normal (Layak Syarat Rikkes)"
      tone = "success"
    } else if (accuracy >= 55) {
      status = "partial"
      statusLabel = "Suspek Buta Warna Parsial (Perlu Pemeriksaan Dokter Spesialis Mata)"
      tone = "warning"
    } else {
      status = "total"
      statusLabel = "Indikasi Buta Warna Signifikan (Tidak Memenuhi Syarat Rikkes)"
      tone = "danger"
    }

    return {
      correctCount,
      total: results.length,
      accuracy,
      avgTime,
      status,
      statusLabel,
      tone,
    }
  }, [results])

  // Simpan Hasil ke Berkas Kesehatan Santri (Tahap 4) & PRD 4-Layer Hasil
  const handleSaveToCandidateRecord = () => {
    if (!selectedCandidate || !stats) return
    const stageStatus = stats.status === "normal" ? "passed" : "review"

    // Simpan ke Rekap Hasil Skrining Terstruktur PRD Version 1.1
    const resultObj: IshiharaScreeningResult = {
      id: `res-${Date.now()}-${selectedCandidate.id.slice(-4)}`,
      attemptId: `att-${Date.now()}`,
      sessionId: activeSession?.id ?? "free-session",
      sessionName: activeSession?.name ?? "Simulasi Skrining Bebas",
      sessionMode: activeSession?.mode ?? "scheduled",
      participantId: selectedCandidate.id,
      participantName: selectedCandidate.name,
      participantNumber: selectedCandidate.number,
      school: selectedCandidate.school,
      // 1. Status Administratif Pelaksanaan
      completionStatus: "completed",
      accuracy: stats.accuracy,
      totalPlates: stats.total,
      correctCount: stats.correctCount,
      avgTimeSec: Number(stats.avgTime),
      // 2. Hasil Skrining Protokol
      screeningInterpretation:
        stats.status === "normal" ? "normal" : "partial_protan_deutan",
      interpretationLabel: stats.statusLabel,
      protocolVersion: activeSession?.protocolVersion ?? "BPIP-ISH-24-V1",
      // 3. Status Rekomendasi Tindak Lanjut Medis
      clinicalFollowUp:
        stats.status === "normal" ? "not_required" : "pending_professional_review",
      followUpNote:
        stats.status === "normal"
          ? "Skrining visual primer memenuhi ambang batas protokol."
          : "Diperlukan konfirmasi pemeriksaan klinis oleh dokter spesialis mata menggunakan buku cetak fisik resmi.",
      // 4. Keputusan Seleksi Lembaga
      selectionDecision: stats.status === "normal" ? "eligible" : "pending",
      decisionNote:
        stats.status === "normal"
          ? "Memenuhi syarat kriteria kesehatan mata Rikkes Tahap 4."
          : "Menunggu hasil verifikasi medis klinis lebih lanjut.",
      createdAt: new Date().toISOString(),
    }

    saveIshiharaScreeningResult(resultObj)
  }

  return (
    <div className="grid gap-6">
      {/* Header Halaman */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
              <Eye className="size-3.5" />
              Sistem Skrining Ishihara
            </span>
            <span className="text-xs text-slate-400">· PRD Version 1.1 · Rikkes Tahap 4</span>
          </div>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
            Sistem Skrining Penglihatan Warna (Ishihara)
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl">
            Mendukung pelaksanaan terstruktur berbasis Google Sheet &amp; Google Apps Script,
            dengan pemisahan peran admin/operator, mode terjadwal, dan tes mandiri.
          </p>
        </div>

        {activeTab === "runner" && (
          /* Pemilihan Santri yang Dites */
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 pl-2">Santri yang dites:</span>
            <select
              value={selectedCandidateId}
              onChange={(e) => setSelectedCandidateId(e.target.value)}
              disabled={isStarted}
              className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-800 outline-none focus:border-red-400"
            >
              {candidates.map((cand) => (
                <option key={cand.id} value={cand.id}>
                  {cand.name} ({cand.number})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tab Navigasi Modul Ishihara */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab("runner")}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "runner"
              ? "border-red-600 text-red-600 bg-red-50/40"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Play className="size-3.5" /> Uji Skrining (Stimulus Runner)
        </button>

        <button
          onClick={() => setActiveTab("sessions")}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "sessions"
              ? "border-brand-600 text-brand-600 bg-brand-50/40"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Calendar className="size-3.5" /> Manajemen Sesi
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[0.62rem] bg-slate-100 text-slate-600 font-bold">
            {ishiharaSessions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("allowlist")}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "allowlist"
              ? "border-emerald-600 text-emerald-600 bg-emerald-50/40"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Shield className="size-3.5" /> Allowlist Akun Internal
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[0.62rem] bg-emerald-100 text-emerald-700 font-bold">
            Google
          </span>
        </button>

        <button
          onClick={() => setActiveTab("reports")}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "reports"
              ? "border-purple-600 text-purple-600 bg-purple-50/40"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileSpreadsheet className="size-3.5" /> Rekap & Laporan Seleksi
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "sessions" && (
        <SessionManager onStartSessionForCandidate={handleStartSessionForCandidate} />
      )}

      {activeTab === "allowlist" && <AllowlistManager />}

      {activeTab === "reports" && <ReportView />}

      {activeTab === "runner" && (
        <>
          {/* Banner Sesi Terjadwal Berjalan jika Ada */}
          {activeSession && (
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-brand-50 border border-brand-200 text-xs">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-brand-600 animate-pulse" />
                <span className="font-bold text-brand-950">
                  Sesi Aktif: {activeSession.name} ({activeSession.code})
                </span>
                <span className="text-brand-700">
                  · {activeSession.mode === "scheduled" ? "Mode Terjadwal" : "Mode Mandiri"}
                  {activeSession.operatorName ? ` · Operator: ${activeSession.operatorName}` : ""}
                </span>
              </div>
              <button
                onClick={() => setActiveSessionId(null)}
                className="text-[0.68rem] font-bold text-slate-500 hover:text-red-600"
              >
                Keluar dari Sesi
              </button>
            </div>
          )}

          {!isStarted && !isFinished ? (
        /* Konfigurasi & Mulai Tes */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 flex flex-col justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                Pilih Mode Simulasi Ishihara
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih format pengujian sesuai kebutuhan latihan atau pemeriksaan berkala santri.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-5">
                {/* Mode 1: Cepat (10 Soal) */}
                <button
                  type="button"
                  onClick={() => setMode("quick")}
                  className={`rounded-xl border p-4 text-left transition ${
                    mode === "quick"
                      ? "border-red-600 bg-red-50/70 ring-2 ring-red-100 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span className="inline-block rounded-md bg-red-100 px-2 py-0.5 text-[0.68rem] font-bold text-red-700">
                    Cepat &amp; Praktis
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 mt-2">Latihan 10 Soal Acak</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Screening cepat dengan 10 piringan acak procedurally generated.
                  </p>
                </button>

                {/* Mode 2: Marathon (Ribuan Soal Acak) */}
                <button
                  type="button"
                  onClick={() => setMode("marathon")}
                  className={`rounded-xl border p-4 text-left transition ${
                    mode === "marathon"
                      ? "border-red-600 bg-red-50/70 ring-2 ring-red-100 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span className="inline-block rounded-md bg-amber-100 px-2 py-0.5 text-[0.68rem] font-bold text-amber-800">
                    Ribuan Soal Acak
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 mt-2">Maraton 50 Soal Intensif</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Uji ketahanan fokus visual dengan variasi angka 1–99 tanpa batas.
                  </p>
                </button>

                {/* Mode 3: Standar Medis 38 Plat */}
                <button
                  type="button"
                  onClick={() => setMode("standard")}
                  className={`rounded-xl border p-4 text-left transition ${
                    mode === "standard"
                      ? "border-red-600 bg-red-50/70 ring-2 ring-red-100 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span className="inline-block rounded-md bg-blue-100 px-2 py-0.5 text-[0.68rem] font-bold text-blue-800">
                    Standar Dokter Mata
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 mt-2">Standar 25 Piringan Resmi</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Piringan referensi buku Ishihara resmi (termasuk plat diagnostik Protan/Deutan).
                  </p>
                </button>
              </div>

              {/* Opsi Timer & Kecepatan */}
              <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="timer-toggle"
                    checked={timerEnabled}
                    onChange={(e) => setTimerEnabled(e.target.checked)}
                    className="size-4 rounded border-slate-300 accent-red-600"
                  />
                  <label htmlFor="timer-toggle" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Aktifkan batas waktu baca piringan (Standar medis: 3–5 detik)
                  </label>
                </div>

                {timerEnabled ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Durasi:</span>
                    <select
                      value={secondsPerPlate}
                      onChange={(e) => setSecondsPerPlate(Number(e.target.value))}
                      className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-800 outline-none"
                    >
                      <option value={3}>3 Detik (Sangat Ketat)</option>
                      <option value={5}>5 Detik (Standar BPIP)</option>
                      <option value={8}>8 Detik (Santai)</option>
                    </select>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Santri terpilih: <strong className="text-slate-900 font-bold">{selectedCandidate.name}</strong> ({selectedCandidate.school})
              </div>
              <Button
                onClick={handleStartTest}
                className="bg-red-600 hover:bg-red-700 text-white font-bold h-10 px-6 gap-2 shadow-sm"
              >
                <Play className="size-4 fill-white" />
                Mulai Tes Ishihara Sekarang
              </Button>
            </div>
          </Card>

          {/* Panduan Medis Standar BPIP */}
          <Card className="p-6 flex flex-col justify-between bg-slate-50/50">
            <div>
              <div className="flex items-center gap-2 text-red-600">
                <ShieldAlert className="size-5 shrink-0" />
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Pedoman Medis Rikkes Paskibraka
                </h3>
              </div>
              <div className="mt-3.5 space-y-3 text-xs text-slate-600 leading-relaxed">
                <p>
                  <strong>Syarat Mutlak:</strong> Calon Paskibraka wajib bebas buta warna total maupun parsial (merah-hijau).
                </p>
                <p>
                  <strong>Kondisi Pencahayaan:</strong> Pastikan layar memiliki kecerahan cukup (tidak terlalu redup) dan tidak mengaktifkan mode *Night Light* / *True Tone* agar spektrum warna tidak terdistorsi.
                </p>
                <p>
                  <strong>Batas Waktu Baca:</strong> Sesuai protokol oftalmologi, waktu wajar membaca plat adalah maksimal 3–5 detik per piringan.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200/80 text-[0.68rem] text-slate-500">
              Disusun berdasarkan standar pemeriksaan kesehatan seleksi Paskibraka BPIP.
            </div>
          </Card>
        </div>
      ) : isStarted && !isFinished ? (
        /* Tampilan Ujian / Sesi Berjalan */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Kolom Piringan Canvas Ishihara (Center) */}
          <Card className="lg:col-span-7 p-6 flex flex-col items-center justify-center">
            {/* Indikator Progres & Timer */}
            <div className="w-full flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Piringan ke-{currentIndex + 1} dari {totalQuestions}
                </span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[0.68rem] font-bold text-slate-700">
                  {selectedCandidate.name}
                </span>
              </div>

              {timerEnabled ? (
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tabular-nums transition ${
                    timeLeft <= 2
                      ? "bg-red-100 text-red-700 animate-pulse"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <Timer className="size-3.5" />
                  <span>{timeLeft} detik</span>
                </div>
              ) : null}
            </div>

            {/* Canvas Piringan Dot Ishihara */}
            <div className="relative p-2 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-inner">
              <canvas
                ref={canvasRef}
                className="rounded-xl max-w-full h-auto drop-shadow-sm select-none"
                style={{ width: 340, height: 340 }}
              />
            </div>

            <p className="text-xs text-slate-400 mt-4 text-center">
              Perhatikan lingkaran di atas. Angka berapa yang tampak di dalam titik-titik warna?
            </p>
          </Card>

          {/* Kolom Input Jawaban & Keypad Numpad */}
          <Card className="lg:col-span-5 p-6">
            <h3 className="font-display text-sm font-bold text-slate-900 mb-1">
              Masukkan Angka yang Terbaca
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Gunakan tombol angka di bawah atau langsung ketik di keyboard Anda.
            </p>

            {/* Display Input Jawaban */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 h-14 rounded-xl border-2 border-slate-200 bg-slate-50 flex items-center justify-center text-2xl font-bold font-display text-slate-900 tracking-wider">
                {inputValue || <span className="text-slate-300 font-normal text-base">Ketik angka...</span>}
              </div>
              {inputValue ? (
                <button
                  type="button"
                  onClick={() => setInputValue("")}
                  className="size-14 rounded-xl border border-slate-200 bg-white grid place-items-center text-slate-500 hover:bg-slate-50"
                  title="Hapus"
                >
                  <X className="size-5" />
                </button>
              ) : null}
            </div>

            {/* Keypad On-Screen (0-9) */}
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() =>
                    setInputValue((prev) => (prev.length < 2 ? prev + digit : prev))
                  }
                  className="h-12 rounded-xl border border-slate-200 bg-white font-display text-lg font-bold text-slate-800 hover:bg-slate-50 active:bg-slate-100 shadow-2xs transition"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setInputValue("")}
                className="h-12 rounded-xl border border-slate-200 bg-slate-100 font-bold text-xs text-slate-600 hover:bg-slate-200 transition"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() =>
                  setInputValue((prev) => (prev.length < 2 ? prev + "0" : prev))
                }
                className="h-12 rounded-xl border border-slate-200 bg-white font-display text-lg font-bold text-slate-800 hover:bg-slate-50 active:bg-slate-100 shadow-2xs transition"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => {
                  if (inputValue) handleAnswer(Number(inputValue))
                }}
                disabled={!inputValue}
                className="h-12 rounded-xl bg-red-600 font-bold text-xs text-white hover:bg-red-700 disabled:opacity-40 transition shadow-xs"
              >
                Kirim
              </button>
            </div>

            {/* Tombol Opsi: Tidak Terbaca Angka */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleAnswer(null)}
                className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 font-bold text-xs text-slate-700 flex items-center justify-center gap-2 transition"
              >
                <HelpCircle className="size-4 text-slate-500" />
                Tidak Ada Angka / Tidak Terbaca (Tekan X / Spasi)
              </button>
            </div>

            {/* Tombol Batalkan Tes */}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  if (confirm("Hentikan sesi tes Ishihara ini?")) {
                    setIsStarted(false)
                    setIsFinished(false)
                  }
                }}
                className="text-[0.7rem] text-slate-400 hover:text-red-600 hover:underline"
              >
                Batalkan Sesi Tes
              </button>
            </div>
          </Card>
        </div>
      ) : (
        /* Hasil Akhir Evaluasi Medis Ishihara */
        stats && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Kartu Ringkasan Hasil Utama */}
            <Card className="lg:col-span-2 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Laporan Hasil Pengujian
                  </span>
                  <h2 className="font-display text-2xl font-bold text-slate-900 mt-1">
                    Hasil Tes Ishihara: {selectedCandidate.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedCandidate.number} · {selectedCandidate.school}
                  </p>
                </div>
                <Badge tone={stats.tone} className="text-xs px-3 py-1 font-bold">
                  Akurasi: {stats.accuracy}%
                </Badge>
              </div>

              {/* Status Diagnostik */}
              <div
                className={`mt-5 rounded-2xl p-4.5 border ${
                  stats.status === "normal"
                    ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                    : stats.status === "partial"
                      ? "bg-amber-50/70 border-amber-200 text-amber-950"
                      : "bg-red-50/70 border-red-200 text-red-950"
                }`}
              >
                <div className="flex items-start gap-3">
                  {stats.status === "normal" ? (
                    <CheckCircle2 className="size-6 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="size-6 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h3 className="font-bold text-base">{stats.statusLabel}</h3>
                    <p className="text-xs mt-1 leading-relaxed opacity-90">
                      {stats.status === "normal"
                        ? "Santri berhasil mengenali mayoritas piringan Ishihara dengan akurat dan cepat. Memenuhi kualifikasi bebas buta warna untuk Tahap 4 (Kesehatan)."
                        : "Santri mengalami kesulitan membaca sebagian piringan uji warna merah-hijau. Disarankan konfirmasi ulang melalui pemeriksaan langsung dengan buku Ishihara fisik atau dokter spesialis mata."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stat Metrik */}
              <div className="grid grid-cols-3 gap-3 mt-5">
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-center">
                  <p className="text-[0.68rem] font-bold text-slate-500 uppercase">Benar</p>
                  <p className="font-display text-xl font-bold text-emerald-700 mt-0.5">
                    {stats.correctCount} / {stats.total}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-center">
                  <p className="text-[0.68rem] font-bold text-slate-500 uppercase">Salah / Lewat</p>
                  <p className="font-display text-xl font-bold text-red-700 mt-0.5">
                    {stats.total - stats.correctCount}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-center">
                  <p className="text-[0.68rem] font-bold text-slate-500 uppercase">Rata-rata Respon</p>
                  <p className="font-display text-xl font-bold text-slate-800 mt-0.5">
                    {stats.avgTime}s
                  </p>
                </div>
              </div>

              {/* Rincian Jawaban Per Piringan */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-3">
                  Rincian Jawaban Tiap Piringan ({results.length} Soal)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 max-h-56 overflow-y-auto pr-1">
                  {results.map((r) => (
                    <div
                      key={r.plateIndex}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                        r.isCorrect
                          ? "bg-emerald-50/60 border-emerald-200 text-emerald-950"
                          : "bg-red-50/60 border-red-200 text-red-950"
                      }`}
                    >
                      <div>
                        <span className="font-bold text-[0.68rem] block text-slate-500">
                          Plat #{r.plateIndex}
                        </span>
                        <span className="font-bold tabular-nums">
                          {r.targetNumber}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="block font-bold">
                          {r.userAnswer !== null ? r.userAnswer : "—"}
                        </span>
                        <span className="text-[0.62rem] opacity-75">{r.timeSpentSec}s</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Aksi Selesai */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsFinished(false)
                    setIsStarted(false)
                  }}
                  className="gap-2"
                >
                  <RotateCcw className="size-4" /> Ulangi Tes
                </Button>

                <Button
                  onClick={handleSaveToCandidateRecord}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-sm"
                >
                  <UserCheck className="size-4" /> Simpan ke Berkas Rikkes Santri
                </Button>
              </div>
            </Card>

            {/* Panduan Tindak Lanjut */}
            <Card className="p-6">
              <h3 className="font-display text-sm font-bold text-slate-900 mb-2">
                Tindak Lanjut Pelatih / Panitia
              </h3>
              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <p className="font-bold text-slate-800">1. Hasil Memenuhi Syarat (Akurasi ≥ 85%):</p>
                  <p className="mt-0.5 text-slate-500">
                    Klik tombol <strong>"Simpan ke Berkas Rikkes Santri"</strong> agar status Tahap 4 (Kesehatan) langsung terverifikasi Siap Standar.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <p className="font-bold text-slate-800">2. Hasil Meragukan (Akurasi &lt; 85%):</p>
                  <p className="mt-0.5 text-slate-500">
                    Santri ditandai butuh <em>Penguatan / Konsultasi</em> pada Tahap 4 untuk diverifikasi menggunakan buku cetak fisik resmi di Puskesmas atau RS Mitra.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )
      )}
      </>
      )}
    </div>
  )
}
