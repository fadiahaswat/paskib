import React from "react"

export type LineChartColor =
  | "blue"
  | "emerald"
  | "red"
  | "amber"
  | "purple"
  | "indigo"

const COLOR_MAP: Record<
  LineChartColor,
  {
    stroke: string
    fill: string
    dot: string
  }
> = {
  blue: { stroke: "#3b82f6", fill: "rgba(59, 130, 246, 0.08)", dot: "#2563eb" },
  emerald: { stroke: "#10b981", fill: "rgba(16, 185, 129, 0.08)", dot: "#059669" },
  red: { stroke: "#ef4444", fill: "rgba(239, 68, 68, 0.08)", dot: "#dc2626" },
  amber: { stroke: "#f59e0b", fill: "rgba(245, 158, 11, 0.08)", dot: "#d97706" },
  purple: { stroke: "#a855f7", fill: "rgba(168, 85, 247, 0.08)", dot: "#9333ea" },
  indigo: { stroke: "#6366f1", fill: "rgba(99, 102, 241, 0.08)", dot: "#4f46e5" },
}

export function LineChart({
  values = [],
  target,
  color = "blue",
  lowerIsBetter = false,
  height = 24,
  className = "",
}: {
  values?: number[]
  target?: number
  baseline?: number
  unit?: string
  color?: LineChartColor
  lowerIsBetter?: boolean
  height?: number
  className?: string
}) {
  const palette = COLOR_MAP[color] ?? COLOR_MAP.blue
  const valid = values.filter((v) => Number.isFinite(v))

  // 1. No data: simple flat track
  if (valid.length === 0) {
    return (
      <div className={`flex items-center ${className}`} style={{ height }}>
        <div className="w-full h-1 rounded-full bg-slate-100" />
      </div>
    )
  }

  // 2. Single data point: clean, minimalist horizontal indicator with dot
  if (valid.length === 1) {
    const val = valid[0]
    let pct = 70
    if (target && target > 0) {
      pct = lowerIsBetter
        ? Math.max(10, Math.min(100, (target / val) * 100))
        : Math.max(10, Math.min(100, (val / target) * 100))
    } else if (val <= 100) {
      pct = Math.max(10, Math.min(100, val))
    }

    return (
      <div className={`relative flex items-center ${className}`} style={{ height }}>
        <div className="w-full h-1 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, backgroundColor: palette.stroke }}
          />
        </div>
        <div
          className="absolute size-2.5 rounded-full border-2 border-white shadow-2xs -translate-x-1/2"
          style={{ left: `${pct}%`, backgroundColor: palette.dot }}
        />
      </div>
    )
  }

  // 3. Multiple real data points: simple, elegant SVG sparkline
  const min = Math.min(...valid)
  const max = Math.max(...valid)
  const range = max - min || 1

  const paddingTop = 3
  const paddingBottom = 3
  const availableHeight = height - paddingTop - paddingBottom

  const points = valid.map((v, i) => {
    const x = (i / (valid.length - 1)) * 96 + 2
    const ratio = (v - min) / range
    const y = height - paddingBottom - ratio * availableHeight
    return { x, y }
  })

  const pointsStr = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
  const areaStr = `2,${height} ${pointsStr} 98,${height}`
  const lastPoint = points[points.length - 1]

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="w-full h-full overflow-visible"
      >
        <polygon points={areaStr} fill={palette.fill} />
        <polyline
          points={pointsStr}
          fill="none"
          stroke={palette.stroke}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r="2.5"
          fill={palette.dot}
          stroke="#ffffff"
          strokeWidth="1"
        />
      </svg>
    </div>
  )
}
