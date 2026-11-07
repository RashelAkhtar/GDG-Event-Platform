'use client'

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { GridCell, DiscoveredWordRecord, WEND_PASTEL_PALETTE, WendWordColor } from '@/lib/api'
import { soundManager } from '@/lib/sound'

interface WendSnakeGridProps {
  grid: GridCell[][]
  onPathComplete: (word: string, path: { row: number; col: number }[]) => void
  onPathChange?: (word: string, path: { row: number; col: number }[]) => void
  hintCell?: { row: number; col: number } | null
  discoveredWords?: DiscoveredWordRecord[]
}

interface Point {
  row: number
  col: number
}

export function WendSnakeGrid({
  grid,
  onPathComplete,
  onPathChange,
  hintCell,
  discoveredWords = [],
}: WendSnakeGridProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const isPointerDownRef = useRef(false)
  const [activePath, setActivePath] = useState<Point[]>([])
  const [cellRects, setCellRects] = useState<Map<string, { x: number; y: number; width: number; height: number }>>(new Map())

  const rows = grid.length
  const cols = grid[0]?.length || 8

  // Lookup map: Coordinate "r-c" -> { color: WendWordColor, word: string }
  const discoveredCellsMap = useMemo(() => {
    const map = new Map<string, { color: WendWordColor; word: string; wordId: string }>()
    for (const dw of discoveredWords) {
      const color = WEND_PASTEL_PALETTE[dw.colorIndex % WEND_PASTEL_PALETTE.length]
      for (const pt of dw.path) {
        map.set(`${pt.row}-${pt.col}`, { color, word: dw.word, wordId: dw.wordId })
      }
    }
    return map
  }, [discoveredWords])

  // Measure cell positions within container for pixel-perfect SVG ribbon rendering
  const updateCellRects = useCallback(() => {
    if (!containerRef.current) return
    const container = containerRef.current.getBoundingClientRect()
    const rects = new Map<string, { x: number; y: number; width: number; height: number }>()

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const el = document.getElementById(`wend-cell-${r}-${c}`)
        if (el) {
          const b = el.getBoundingClientRect()
          rects.set(`${r}-${c}`, {
            x: b.left - container.left,
            y: b.top - container.top,
            width: b.width,
            height: b.height,
          })
        }
      }
    }
    setCellRects(rects)
  }, [rows, cols])

  useEffect(() => {
    updateCellRects()
    window.addEventListener('resize', updateCellRects)
    return () => window.removeEventListener('resize', updateCellRects)
  }, [updateCellRects, grid])

  // Get current word string from active path
  const getWordFromPath = useCallback(
    (path: Point[]) => {
      return path.map((p) => grid[p.row]?.[p.col]?.letter || '').join('')
    },
    [grid]
  )

  // Notify parent component of path and word changes cleanly outside of render/updater
  useEffect(() => {
    onPathChange?.(getWordFromPath(activePath), activePath)
  }, [activePath, onPathChange, getWordFromPath])

  // Handle cell entry during drag or click
  const handleCellEnter = useCallback(
    (row: number, col: number) => {
      const cell = grid[row]?.[col]
      if (!cell || cell.type === 'OBSTACLE') return

      setActivePath((prev) => {
        if (prev.length === 0) return prev
        const last = prev[prev.length - 1]

        // If stepping back onto the second-to-last cell, undo last move
        if (prev.length >= 2) {
          const secondLast = prev[prev.length - 2]
          if (secondLast.row === row && secondLast.col === col) {
            return prev.slice(0, -1)
          }
        }

        // Check orthogonal adjacency (Up, Down, Left, Right only)
        const isAdjacent = Math.abs(last.row - row) + Math.abs(last.col - col) === 1
        if (!isAdjacent) return prev

        // Check if cell is already in the current path
        const alreadyVisited = prev.some((p) => p.row === row && p.col === col)
        if (alreadyVisited) return prev

        return [...prev, { row, col }]
      })
    },
    [grid]
  )

  const handlePointerDown = (row: number, col: number, e: React.PointerEvent) => {
    // Prime and unlock audio pipeline on initial touch
    void soundManager.unlock()

    const cell = grid[row]?.[col]
    if (!cell || cell.type === 'OBSTACLE') return

    try {
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    } catch {}

    isPointerDownRef.current = true

    // If tapping an adjacent cell when a path is already started, append it!
    if (activePath.length > 0) {
      const last = activePath[activePath.length - 1]
      const isAdjacent = Math.abs(last.row - row) + Math.abs(last.col - col) === 1
      if (isAdjacent && !activePath.some((p) => p.row === row && p.col === col)) {
        setActivePath([...activePath, { row, col }])
        return
      }
    }

    setActivePath([{ row, col }])
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDownRef.current || !containerRef.current) return

    // Hit-test element under pointer across touch movement
    const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
    const cellId = target?.getAttribute('data-cell-coord')
    if (cellId) {
      const [rStr, cStr] = cellId.split('-')
      const r = parseInt(rStr, 10)
      const c = parseInt(cStr, 10)
      if (!isNaN(r) && !isNaN(c)) {
        handleCellEnter(r, c)
      }
    }
  }

  const handlePointerUp = () => {
    if (!isPointerDownRef.current) return
    isPointerDownRef.current = false

    if (activePath.length > 0) {
      const word = getWordFromPath(activePath)
      onPathComplete(word, activePath)
    }
    setActivePath([])
    onPathChange?.('', [])
  }

  // Calculate direction chevron between consecutive cells
  const getDirectionChevron = (from: Point, to: Point) => {
    if (to.col > from.col) return '›'
    if (to.col < from.col) return '‹'
    if (to.row > from.row) return '⌄'
    if (to.row < from.row) return '⌃'
    return ''
  }

  // Determine if a cell is in the active path
  const isCellInActivePath = (r: number, c: number) => {
    return activePath.some((p) => p.row === r && p.col === c)
  }

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative mx-auto aspect-square w-full max-w-[300px] xs:max-w-[330px] sm:max-w-[380px] select-none touch-none rounded-[28px] sm:rounded-[34px] border border-white/90 bg-white/95 p-2 sm:p-2.5 shadow-[0_15px_45px_rgba(0,0,0,0.08)] ring-1 ring-black/5 backdrop-blur-xl overflow-hidden"
    >
      {/* 8x8 Grid Container */}
      <div
        className="grid h-full w-full gap-1 sm:gap-1.5"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {grid.map((rowArr, r) =>
          rowArr.map((cell, c) => {
            const isObstacle = cell.type === 'OBSTACLE'
            const inActive = isCellInActivePath(r, c)
            const discovered = discoveredCellsMap.get(`${r}-${c}`)
            const isHint = hintCell && hintCell.row === r && hintCell.col === c

            // Determine styling with Google tactile aesthetic
            let cellStyle = 'bg-white hover:bg-[#F4F4F5] text-[#111827] border border-[#E5E7EB] shadow-[0_2px_4px_rgba(0,0,0,0.02)] hover:border-[#111827] cursor-pointer'

            if (isObstacle) {
              cellStyle = 'bg-gradient-to-br from-[#374151] to-[#1F2937] border border-[#111827] shadow-inner cursor-not-allowed'
            } else if (inActive) {
              // Active dragged path: glowing Google Green
              cellStyle = 'bg-gradient-to-br from-[#E8F5E9] to-[#C8E6C9] border-2 border-[#34A853] text-[#137333] shadow-[0_0_12px_rgba(52,168,83,0.35)] z-20 scale-[1.04]'
            } else if (discovered) {
              // Discovered word: Persistent light pastel background & matching border
              cellStyle = `${discovered.color.bg} ${discovered.color.border} ${discovered.color.text} border-2 shadow-2xs z-10 font-black`
            }

            return (
              <div
                key={`${r}-${c}`}
                id={`wend-cell-${r}-${c}`}
                data-cell-coord={`${r}-${c}`}
                onPointerDown={(e) => handlePointerDown(r, c, e)}
                className={`relative flex items-center justify-center rounded-lg sm:rounded-xl transition-all select-none touch-none ${cellStyle} ${
                  isHint ? 'ring-3 sm:ring-4 ring-[#FBBC04] shadow-[0_0_15px_rgba(251,188,4,0.5)] animate-pulse z-30' : ''
                }`}
              >
                {!isObstacle && (
                  <span
                    className={`relative z-20 pointer-events-none select-none text-xs xs:text-sm sm:text-lg font-black tracking-tight ${
                      inActive
                        ? 'text-[#1B5E20]'
                        : discovered
                        ? discovered.color.text
                        : 'text-[#111827]'
                    }`}
                  >
                    {cell.letter}
                  </span>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Persistent SVG Connecting Lines for ALL Discovered Words */}
      {discoveredWords.length > 0 && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full z-15">
          {discoveredWords.map((dw) => {
            const color = WEND_PASTEL_PALETTE[dw.colorIndex % WEND_PASTEL_PALETTE.length]
            return dw.path.map((pt, idx) => {
              if (idx === dw.path.length - 1) return null
              const next = dw.path[idx + 1]
              const r1 = cellRects.get(`${pt.row}-${pt.col}`)
              const r2 = cellRects.get(`${next.row}-${next.col}`)
              if (!r1 || !r2) return null

              const x1 = r1.x + r1.width / 2
              const y1 = r1.y + r1.height / 2
              const x2 = r2.x + r2.width / 2
              const y2 = r2.y + r2.height / 2

              return (
                <line
                  key={`disc-seg-${dw.wordId}-${idx}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={color.hex}
                  strokeWidth={4}
                  strokeLinecap="round"
                  strokeOpacity={0.65}
                />
              )
            })
          })}
        </svg>
      )}

      {/* Real-time SVG Ribbon for the Active Path (Behind Letter Layer) */}
      {activePath.length >= 2 && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full z-15">
          {activePath.map((pt, idx) => {
            if (idx === activePath.length - 1) return null
            const next = activePath[idx + 1]
            const r1 = cellRects.get(`${pt.row}-${pt.col}`)
            const r2 = cellRects.get(`${next.row}-${next.col}`)
            if (!r1 || !r2) return null

            const x1 = r1.x + r1.width / 2
            const y1 = r1.y + r1.height / 2
            const x2 = r2.x + r2.width / 2
            const y2 = r2.y + r2.height / 2

            const midX = (x1 + x2) / 2
            const midY = (y1 + y2) / 2
            const chevron = getDirectionChevron(pt, next)

            return (
              <g key={`active-seg-${idx}`}>
                {/* Connecting Path Line */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#34A853"
                  strokeWidth={5}
                  strokeLinecap="round"
                  strokeOpacity={0.8}
                />

                {/* Subtle direction indicator at intersection */}
                <circle cx={midX} cy={midY} r={8} fill="#FFFFFF" stroke="#34A853" strokeWidth={1.5} />
                <text
                  x={midX}
                  y={midY + 0.5}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#137333"
                  fontSize="10"
                  fontWeight="900"
                  className="select-none pointer-events-none"
                >
                  {chevron}
                </text>
              </g>
            )
          })}
        </svg>
      )}
    </div>
  )
}
