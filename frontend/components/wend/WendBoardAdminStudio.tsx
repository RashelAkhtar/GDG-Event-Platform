'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { WendBoardConfig, GridCell } from '@/lib/api'
import { BrickWall, RotateCcw, EyeOff } from 'lucide-react'

interface WendBoardAdminStudioProps {
  board: WendBoardConfig
  onChange: (updatedBoard: WendBoardConfig) => void
  previewWordPath?: { row: number; col: number }[] | null
  onClearPreview?: () => void
  onResetBoard?: () => void
}

export function WendBoardAdminStudio({
  board,
  onChange,
  previewWordPath = null,
  onClearPreview,
  onResetBoard,
}: WendBoardAdminStudioProps) {
  const [focusedCell, setFocusedCell] = useState<{ r: number; c: number }>({ r: 0, c: 0 })
  const cellInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

  const rows = board.rows || 8
  const cols = board.cols || 8

  // Helper to move focus safely across the matrix
  const moveFocus = useCallback(
    (dr: number, dc: number) => {
      setFocusedCell((prev) => {
        let nextR = prev.r + dr
        let nextC = prev.c + dc

        // Wrap around across rows
        if (nextC >= cols) {
          if (nextR < rows - 1) {
            nextR += 1
            nextC = 0
          } else {
            nextC = cols - 1
          }
        } else if (nextC < 0) {
          if (nextR > 0) {
            nextR -= 1
            nextC = cols - 1
          } else {
            nextC = 0
          }
        }

        nextR = Math.max(0, Math.min(rows - 1, nextR))
        nextC = Math.max(0, Math.min(cols - 1, nextC))
        return { r: nextR, c: nextC }
      })
    },
    [rows, cols]
  )

  // Focus the input inside the active cell whenever focusedCell changes
  useEffect(() => {
    const key = `${focusedCell.r}-${focusedCell.c}`
    const el = cellInputRefs.current[key]
    if (el && document.activeElement !== el) {
      el.focus()
      el.select()
    }
  }, [focusedCell])

  // Set letter for a cell: unblocks the cell and places the letter
  const handleSetLetter = (r: number, c: number, rawChar: string, advance = true) => {
    const char = rawChar.replace(/[^a-zA-Z]/g, '').slice(-1).toUpperCase()
    const updatedGrid = board.grid.map((rowArr, rowIdx) =>
      rowArr.map((cell, colIdx) => {
        if (rowIdx === r && colIdx === c) {
          return {
            ...cell,
            type: 'LETTER' as const,
            letter: char,
          }
        }
        return cell
      })
    )
    onChange({ ...board, grid: updatedGrid })
    if (advance && char) {
      moveFocus(0, 1)
    }
  }

  // Turn a specific cell into a blocked obstacle
  const handleBlockCell = (r: number, c: number) => {
    const updatedGrid = board.grid.map((rowArr, rowIdx) =>
      rowArr.map((cell, colIdx) => {
        if (rowIdx === r && colIdx === c) {
          return {
            ...cell,
            type: 'OBSTACLE' as const,
            letter: undefined,
          }
        }
        return cell
      })
    )
    onChange({ ...board, grid: updatedGrid })
  }

  // Toggle cell between blocked obstacle and letter cell
  const handleToggleCellBlock = (r: number, c: number) => {
    const current = board.grid[r]?.[c]
    if (!current) return
    const isObstacle = current.type === 'OBSTACLE'
    const updatedGrid = board.grid.map((rowArr, rowIdx) =>
      rowArr.map((cell, colIdx) => {
        if (rowIdx === r && colIdx === c) {
          return {
            ...cell,
            type: (isObstacle ? 'LETTER' : 'OBSTACLE') as 'LETTER' | 'OBSTACLE',
            letter: isObstacle ? '' : undefined,
          }
        }
        return cell
      })
    )
    onChange({ ...board, grid: updatedGrid })
  }

  // Reset / Block all 64 cells to obstacles
  const handleBlockAllCells = () => {
    const updatedGrid = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => ({
        row: r,
        col: c,
        type: 'OBSTACLE' as const,
        letter: undefined,
      }))
    )
    onChange({ ...board, grid: updatedGrid })
    setFocusedCell({ r: 0, c: 0 })
  }

  return (
    <div className="flex flex-col items-center w-full max-w-xl mx-auto space-y-3.5">
      {/* Top Header Strip: Instructions & Actions */}
      <div className="flex flex-wrap items-center justify-between w-full gap-2 pb-2.5 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-1.5 text-xs text-[#4B5563]">
          <span className="font-mono text-[10px] tracking-wider uppercase text-[#6B7280]">
            Click cell to type • Double-click to block (#) • Arrow keys to move
          </span>
        </div>

        <div className="flex items-center gap-2">
          {previewWordPath && onClearPreview && (
            <button
              type="button"
              onClick={onClearPreview}
              className="inline-flex items-center gap-1 rounded-full bg-[#FEF7E0] border border-[#FBBC04]/50 px-3 py-1 text-xs font-bold text-[#B06000] hover:bg-[#FEEFC3] transition-colors shadow-2xs cursor-pointer"
            >
              <EyeOff className="h-3 w-3" />
              <span>Clear Path</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleBlockAllCells}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-xs font-mono font-medium text-[#111827] hover:bg-[#F9FAFB] hover:border-[#111827] transition-all shadow-2xs cursor-pointer"
            title="Reset every block on the board to obstacle wall"
          >
            <BrickWall className="h-3 w-3 text-[#DC2626]" />
            <span>Block All Cells</span>
          </button>
        </div>
      </div>

      {/* 8×8 Matrix Canvas: Edit Directly in Each Box */}
      <div className="relative aspect-square w-full max-w-[340px] xs:max-w-[380px] sm:max-w-[420px] rounded-3xl border-2 border-[#111827] bg-[#F9FAFB] p-2.5 sm:p-3.5 shadow-md">
        <div
          className="grid h-full w-full gap-1.5"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          }}
        >
          {board.grid.map((rowArr, r) =>
            rowArr.map((cell, c) => {
              const isFocused = focusedCell.r === r && focusedCell.c === c
              const isObstacle = cell.type === 'OBSTACLE'
              const letter = cell.letter || ''

              const previewIdx = previewWordPath
                ? previewWordPath.findIndex((p) => p.row === r && p.col === c)
                : -1
              const isInPreview = previewIdx !== -1

              return (
                <div
                  key={`matrix-cell-${r}-${c}`}
                  onClick={() => setFocusedCell({ r, c })}
                  onDoubleClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleToggleCellBlock(r, c)
                  }}
                  className={`relative flex items-center justify-center rounded-xl font-mono transition-all select-none cursor-pointer ${
                    isObstacle
                      ? 'bg-[#1E293B] text-[#94A3B8] border border-[#334155] shadow-inner'
                      : isInPreview
                      ? 'bg-[#E6F4EA] border-2 border-[#34A853] text-[#137333] shadow-xs'
                      : 'bg-white text-[#111827] border-2 border-[#111827] shadow-xs'
                  } ${
                    isFocused
                      ? 'ring-4 ring-[#1A73E8] border-[#1A73E8] z-20 scale-105 shadow-md'
                      : ''
                  }`}
                  title={
                    isObstacle
                      ? `Row ${r + 1}, Col ${c + 1} (Blocked) • Click to type letter or double-click to unblock`
                      : `Row ${r + 1}, Col ${c + 1}: "${letter}" • Double-click to block cell (#)`
                  }
                >
                  {/* Step Number Badge when Previewing Target Word Path */}
                  {isInPreview && (
                    <span className="absolute top-0.5 right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#34A853] text-[8px] font-black text-white leading-none z-30 pointer-events-none">
                      {previewIdx + 1}
                    </span>
                  )}

                  {/* Direct Input Element: Type to enter letters, Arrows to move, Double-click to block */}
                  <input
                    ref={(el) => {
                      cellInputRefs.current[`${r}-${c}`] = el
                    }}
                    type="text"
                    maxLength={1}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    value={isObstacle ? '' : letter}
                    placeholder={isObstacle ? '#' : ''}
                    onFocus={() => setFocusedCell({ r, c })}
                    onClick={() => setFocusedCell({ r, c })}
                    onDoubleClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleToggleCellBlock(r, c)
                    }}
                    onChange={(e) => {
                      const char = e.target.value.replace(/[^a-zA-Z]/g, '').slice(-1).toUpperCase()
                      if (char) {
                        handleSetLetter(r, c, char, true)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp') {
                        e.preventDefault()
                        moveFocus(-1, 0)
                      } else if (e.key === 'ArrowDown') {
                        e.preventDefault()
                        moveFocus(1, 0)
                      } else if (e.key === 'ArrowLeft') {
                        e.preventDefault()
                        moveFocus(0, -1)
                      } else if (e.key === 'ArrowRight') {
                        e.preventDefault()
                        moveFocus(0, 1)
                      } else if (e.key === ' ' || e.key === 'Spacebar') {
                        e.preventDefault()
                        handleToggleCellBlock(r, c)
                      } else if (e.key === 'Backspace') {
                        e.preventDefault()
                        if (isObstacle) {
                          moveFocus(0, -1)
                          const prevC = c > 0 ? c - 1 : (r > 0 ? cols - 1 : 0)
                          const prevR = c > 0 ? r : Math.max(0, r - 1)
                          handleBlockCell(prevR, prevC)
                        } else {
                          handleBlockCell(r, c)
                        }
                      } else if (e.key === 'Delete') {
                        e.preventDefault()
                        handleBlockCell(r, c)
                      }
                    }}
                    className={`grid-box-input absolute inset-0 h-full w-full rounded-xl text-center font-mono font-black text-base sm:text-lg uppercase outline-none select-none transition-colors cursor-pointer focus:cursor-text ${
                      isObstacle
                        ? 'bg-[#1E293B] text-[#94A3B8] placeholder:text-[#64748B]/60 caret-[#1A73E8]'
                        : isFocused
                        ? 'bg-[#E8F0FE] text-[#1A73E8] caret-[#1A73E8]'
                        : 'bg-white text-[#111827] caret-[#111827]'
                    }`}
                  />
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Active Cell Coordinates Status */}
      <div className="flex items-center justify-between w-full px-1 text-[11px] font-mono text-[#6B7280]">
        <span>
          Selected: <strong className="text-[#111827]">Row {focusedCell.r + 1}, Col {focusedCell.c + 1}</strong>
        </span>
        <span>
          State:{' '}
          <strong className={board.grid[focusedCell.r]?.[focusedCell.c]?.type === 'OBSTACLE' ? 'text-[#DC2626]' : 'text-[#15803D]'}>
            {board.grid[focusedCell.r]?.[focusedCell.c]?.type === 'OBSTACLE'
              ? 'Blocked (#)'
              : `Letter "${board.grid[focusedCell.r]?.[focusedCell.c]?.letter || ''}"`}
          </strong>
        </span>
      </div>
    </div>
  )
}
