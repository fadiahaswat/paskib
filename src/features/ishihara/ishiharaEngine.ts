export const AUTHENTIC_ISHIHARA_PALETTES = {
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
    digitNoise: ["#628B78", "#547C6A", "#709986", "#486F5E", "#5B8371"],
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
    bgNoise: ["#9E8256", "#8F7449", "#AC9063", "#82693E", "#A4885B"],
  },
}

export const OFFICIAL_ISHIHARA_PLATES: {
  number: number
  difficulty: "demo" | "standard" | "diagnostic"
  note: string
}[] = [
  {
    number: 12,
    difficulty: "demo",
    note: "Plat 1: Terbaca jelas oleh semua mata (normal & buta warna).",
  },
  {
    number: 8,
    difficulty: "standard",
    note: "Plat 2: Buta warna merah-hijau membaca 3.",
  },
  {
    number: 6,
    difficulty: "standard",
    note: "Plat 3: Buta warna merah-hijau membaca 5.",
  },
  {
    number: 29,
    difficulty: "standard",
    note: "Plat 4: Buta warna merah-hijau membaca 70.",
  },
  {
    number: 57,
    difficulty: "standard",
    note: "Plat 5: Buta warna merah-hijau membaca 35.",
  },
  {
    number: 5,
    difficulty: "standard",
    note: "Plat 6: Buta warna merah-hijau membaca 2.",
  },
  {
    number: 3,
    difficulty: "standard",
    note: "Plat 7: Buta warna merah-hijau membaca 5.",
  },
  {
    number: 15,
    difficulty: "standard",
    note: "Plat 8: Buta warna merah-hijau membaca 17.",
  },
  {
    number: 74,
    difficulty: "standard",
    note: "Plat 9: Buta warna merah-hijau membaca 21.",
  },
  {
    number: 2,
    difficulty: "standard",
    note: "Plat 10: Buta warna sebagian tidak dapat membaca.",
  },
  {
    number: 6,
    difficulty: "standard",
    note: "Plat 11: Buta warna sebagian tidak dapat membaca.",
  },
  {
    number: 97,
    difficulty: "standard",
    note: "Plat 12: Buta warna merah-hijau tidak dapat membaca.",
  },
  {
    number: 45,
    difficulty: "standard",
    note: "Plat 13: Buta warna merah-hijau tidak dapat membaca.",
  },
  {
    number: 5,
    difficulty: "standard",
    note: "Plat 14: Buta warna merah-hijau tidak dapat membaca.",
  },
  {
    number: 7,
    difficulty: "standard",
    note: "Plat 15: Buta warna merah-hijau tidak dapat membaca.",
  },
  {
    number: 16,
    difficulty: "standard",
    note: "Plat 16: Buta warna merah-hijau tidak dapat membaca.",
  },
  {
    number: 73,
    difficulty: "standard",
    note: "Plat 17: Buta warna merah-hijau tidak dapat membaca.",
  },
  {
    number: 26,
    difficulty: "diagnostic",
    note: "Plat 22: Protanopia membaca 6, Deuteranopia membaca 2.",
  },
  {
    number: 42,
    difficulty: "diagnostic",
    note: "Plat 23: Protanopia membaca 2, Deuteranopia membaca 4.",
  },
  {
    number: 35,
    difficulty: "diagnostic",
    note: "Plat 24: Protanopia membaca 5, Deuteranopia membaca 3.",
  },
  {
    number: 96,
    difficulty: "diagnostic",
    note: "Plat 25: Protanopia membaca 6, Deuteranopia membaca 9.",
  },
  {
    number: 16,
    difficulty: "standard",
    note: "Plat 18: Buta warna merah-hijau tidak dapat membaca.",
  },
  {
    number: 73,
    difficulty: "standard",
    note: "Plat 19: Buta warna merah-hijau tidak dapat membaca.",
  },
  {
    number: 8,
    difficulty: "standard",
    note: "Plat 20: Buta warna merah-hijau tidak dapat membaca.",
  },
  {
    number: 6,
    difficulty: "standard",
    note: "Plat 21: Buta warna merah-hijau tidak dapat membaca.",
  },
]

export interface IshiharaPlateAnswerItem {
  plateIndex: number
  targetNumber: number | null
  userAnswer: number | null
  isCorrect: boolean
  timeSpentSec: number
}

export function drawOfficialIshiharaPlate(
  canvas: HTMLCanvasElement | null,
  num: number,
): void {
  if (!canvas) return
  const ctx = canvas.getContext("2d")
  if (!ctx) return

  const size = 420
  canvas.width = size
  canvas.height = size
  const center = size / 2
  const plateRadius = size / 2 - 10

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

  const fontSize = num > 9 ? 200 : 225
  offCtx.font = `bold ${fontSize}px "Trebuchet MS", "Segoe UI", Arial, sans-serif`
  offCtx.fillText(String(num), center, center + 4)

  const offData = offCtx.getImageData(0, 0, size, size).data

  ctx.clearRect(0, 0, size, size)
  ctx.beginPath()
  ctx.arc(center, center, plateRadius + 4, 0, Math.PI * 2)
  ctx.fillStyle = "#ffffff"
  ctx.fill()
  ctx.lineWidth = 1.5
  ctx.strokeStyle = "#e2e8f0"
  ctx.stroke()

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

  type PlacedCircle = { x: number; y: number; r: number }
  const placedCircles: PlacedCircle[] = []

  const cellSize = 16
  const gridCols = Math.ceil(size / cellSize)
  const gridRows = Math.ceil(size / cellSize)
  const grid: number[][][] = Array.from({ length: gridCols }, () =>
    Array.from({ length: gridRows }, () => []),
  )

  function canPlace(x: number, y: number, r: number): boolean {
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

  for (let i = 0; i < 900; i++) {
    const angle = Math.random() * Math.PI * 2
    const dist = Math.sqrt(Math.random()) * (plateRadius - 8)
    const x = center + Math.cos(angle) * dist
    const y = center + Math.sin(angle) * dist
    const r = 5.0 + Math.random() * 2.6
    if (canPlace(x, y, r)) addCircle(x, y, r)
  }

  for (let i = 0; i < 3500; i++) {
    const angle = Math.random() * Math.PI * 2
    const dist = Math.sqrt(Math.random()) * (plateRadius - 6)
    const x = center + Math.cos(angle) * dist
    const y = center + Math.sin(angle) * dist
    const r = 3.2 + Math.random() * 1.8
    if (canPlace(x, y, r)) addCircle(x, y, r)
  }

  for (let i = 0; i < 6000; i++) {
    const angle = Math.random() * Math.PI * 2
    const dist = Math.sqrt(Math.random()) * (plateRadius - 4)
    const x = center + Math.cos(angle) * dist
    const y = center + Math.sin(angle) * dist
    const r = 1.7 + Math.random() * 1.5
    if (canPlace(x, y, r)) addCircle(x, y, r)
  }

  for (let i = 0; i < placedCircles.length; i++) {
    const dot = placedCircles[i]
    const px = Math.min(size - 1, Math.max(0, Math.round(dot.x)))
    const py = Math.min(size - 1, Math.max(0, Math.round(dot.y)))
    const imgIndex = (py * size + px) * 4
    const alpha = 255 - offData[imgIndex]

    let color = ""
    if (alpha >= 120) {
      color =
        Math.random() < 0.16
          ? palette.digitNoise[
              Math.floor(Math.random() * palette.digitNoise.length)
            ]
          : palette.digitPrimary[
              Math.floor(Math.random() * palette.digitPrimary.length)
            ]
    } else if (alpha <= 25) {
      color =
        Math.random() < 0.14
          ? palette.bgNoise[Math.floor(Math.random() * palette.bgNoise.length)]
          : palette.bgPrimary[
              Math.floor(Math.random() * palette.bgPrimary.length)
            ]
    } else {
      const isDigitProb = (alpha - 25) / 95
      if (Math.random() < isDigitProb) {
        color =
          Math.random() < 0.25
            ? palette.digitNoise[
                Math.floor(Math.random() * palette.digitNoise.length)
              ]
            : palette.digitPrimary[
                Math.floor(Math.random() * palette.digitPrimary.length)
              ]
      } else {
        color =
          Math.random() < 0.25
            ? palette.bgNoise[
                Math.floor(Math.random() * palette.bgNoise.length)
              ]
            : palette.bgPrimary[
                Math.floor(Math.random() * palette.bgPrimary.length)
              ]
      }
    }

    ctx.beginPath()
    ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
  }
}

export function evaluateIshiharaResults(results: IshiharaPlateAnswerItem[]) {
  if (!results.length) return null
  const correctCount = results.filter((r) => r.isCorrect).length
  const accuracy = Math.round((correctCount / results.length) * 100)
  const avgTime = (
    results.reduce((acc, curr) => acc + curr.timeSpentSec, 0) / results.length
  ).toFixed(1)

  let status: "normal" | "partial" | "total" = "normal"
  let statusLabel = "Penglihatan Warna Normal (Layak Syarat Rikkes)"
  let tone: "success" | "warning" | "danger" = "success"

  if (accuracy >= 85) {
    status = "normal"
    statusLabel = "Penglihatan Warna Normal (Layak Syarat Rikkes)"
    tone = "success"
  } else if (accuracy >= 55) {
    status = "partial"
    statusLabel =
      "Suspek Buta Warna Parsial (Perlu Pemeriksaan Dokter Spesialis Mata)"
    tone = "warning"
  } else {
    status = "total"
    statusLabel =
      "Indikasi Buta Warna Signifikan (Tidak Memenuhi Syarat Rikkes)"
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
}
