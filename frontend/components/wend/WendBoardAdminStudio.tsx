'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  WendBoardConfig,
  GridCell,
} from '@/lib/api'
import {
  Grid,
  BrickWall,
  Type,
  Eraser,
  RotateCcw,
  EyeOff,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Check,
} from 'lucide-react'

interface WendBoardAdminStudioProps {
  board: WendBoardConfig
  onChange: (updatedBoard: WendBoardConfig) => void
  previewWordPath?: { row: number; col: number }[] | null
  onClearPreview?: () => void
  onResetBoard?: () => void
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export function WendBoardAdminStudio({
  board,
  onChange,
  previewWordPath = null,
  onClearPreview,
  onResetBoard,
}: WendBoardAdminStudioProps) {
  const [focusedCell, setFocusedCell] = useState<{ r: number; c: number }>({ r: 0, c: 0 })
  const [editTool, setEditTool] = useState<'letter' | 'obstacle'>('letter')
  const cellInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

  const rows = board.rows || 8
  const cols = board.cols || 8

  // Helper to move focus safely across cells
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

  // Focus the input of the active cell whenever focusedCell changes in letter mode
  useEffect(() => {
    if (editTool === 'letter') {
      const key = `${focusedCell.r}-${focusedCell.c}`
      const el = cellInputRefs.current[key]
      if (el && document.activeElement !== el) {
        el.focus()
        el.select()
      }
    }
  }, [focusedCell, editTool])

  // Set letter for a cell
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

  // Toggle cell type (OBSTACLE <-> LETTER)
  const handleToggleObstacle = (r: number, c: number) => {
    const updatedGrid = board.grid.map((rowArr, rowIdx) =>
      rowArr.map((cell, colIdx) => {
        if (rowIdx === r && colIdx === c) {
          const isObstacle = cell.type === 'OBSTACLE'
          return {
            ...cell,
            type: (isObstacle ? 'LETTER' : 'OBSTACLE') as 'LETTER' | 'OBSTACLE',
            letter: isObstacle ? cell.letter || '' : undefined,
          }
        }
        return cell
      })
    )
    onChange({ ...board, grid: updatedGrid })
  }

  // Clear cell contents
  const handleClear = (r: number, c: number) => {
    const updatedGrid = board.grid.map((rowArr, rowIdx) =>
      rowArr.map((cell, colIdx) => {
        if (rowIdx === r && colIdx === c) {
          return {
            ...cell,
            type: 'LETTER' as const,
            letter: '',
          }
        }
        return cell
      })
    )
    onChange({ ...board, grid: updatedGrid })
  }

  const currentCell: GridCell | undefined = board.grid[focusedCell.r]?.[focusedCell.c]
  const isCurrentObstacle = currentCell?.type === 'OBSTACLE'
  const currentLetter = currentCell?.letter || ''

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto space-y-4">
      {/* Studio Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between w-full gap-2 pb-3 border-b border-[#E5E7EB]">
        {/* Tool Mode Pill Selector */}
        <div className="inline-flex items-center rounded-2xl bg-[#F3F4F6] p-1 border border-[#E5E7EB]">
          <button
            type="button"
            onClick={() => setEditTool('letter')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              editTool === 'letter'
                ? 'bg-white text-[#111827] shadow-xs'
                : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            <Type className="h-3.5 w-3.5 text-[#1A73E8]" />
            <span>Letter Mode</span>
          </button>

          <button
            type="button"
            onClick={() => setEditTool('obstacle')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              editTool === 'obstacle'
                ? 'bg-[#111827] text-white shadow-xs'
                : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            <BrickWall className="h-3.5 w-3.5 text-[#FBBC04]" />
            <span>Obstacle Brush</span>
          </button>
        </div>

        {/* Action Controls */}
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

          {onResetBoard && (
            <button
              type="button"
              onClick={onResetBoard}
              className="inline-flex items-center gap-1 rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-xs font-bold text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB] transition-colors shadow-2xs cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Grid</span>
            </button>
          )}
        </div>
      </div>

      {/* Helper Mode Indicator */}
      <div className="w-full flex items-center justify-between text-xs text-[#6B7280] px-1">
        <span>
          {editTool === 'letter' ? (
            <strong className="text-[#1A73E8] font-semibold">
              Letter Entry Mode: Tap any cell to type. Auto-advances to next cell.
            </strong>
          ) : (
            <strong className="text-[#111827] font-semibold">
              Obstacle Wall Brush: Tap any cell to stamp or remove a wall block.
            </strong>
          )}
        </span>
        <span className="font-mono text-[11px] text-[#9CA3AF]">
          Cell [R{focusedCell.r + 1}, C{focusedCell.c + 1}]
        </span>
      </div>

      {/* 8×8 Matrix Canvas */}
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
              const isEmpty = !isObstacle && !letter

              const previewIdx = previewWordPath
                ? previewWordPath.findIndex((p) => p.row === r && p.col === c)
                : -1
              const isInPreview = previewIdx !== -1

              return (
                <div
                  key={`admin-matrix-cell-${r}-${c}`}
                  onClick={() => {
                    setFocusedCell({ r, c })
                    if (editTool === 'obstacle') {
                      handleToggleObstacle(r, c)
                    }
                  }}
                  onDoubleClick={() => handleToggleObstacle(r, c)}
                  className={`relative flex items-center justify-center rounded-xl font-mono font-black text-sm sm:text-base transition-all select-none cursor-pointer ${
                    isObstacle
                      ? 'bg-[#1E293B] text-[#94A3B8] border border-[#334155] shadow-inner'
                      : isInPreview
                      ? 'bg-[#E6F4EA] border-2 border-[#34A853] text-[#137333] shadow-xs'
                      : isEmpty
                      ? 'border-2 border-dashed border-[#D1D5DB] bg-white text-[#9CA3AF] hover:bg-[#F3F4F6] hover:border-[#1A73E8]/60'
                      : 'bg-white text-[#111827] border border-[#D1D5DB] shadow-2xs hover:border-[#1A73E8]'
                  } ${
                    isFocused
                      ? 'ring-4 ring-[#1A73E8] border-[#1A73E8] bg-[#E8F0FE] text-[#1A73E8] z-20 scale-105 shadow-md'
                      : ''
                  }`}
                >
                  {/* Preview Path Step Indicator Badge */}
                  {isInPreview && (
                    <span className="absolute top-0.5 right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#34A853] text-[8px] font-black text-white leading-none z-30 pointer-events-none">
                      {previewIdx + 1}
                    </span>
                  )}

                  {/* Obstacle Glyph Presentation */}
                  {isObstacle ? (
                    <div className="flex flex-col items-center justify-center pointer-events-none">
                      <BrickWall className="h-3.5 w-3.5 text-[#94A3B8]" />
                      <span className="text-[7.5px] font-mono font-bold text-[#94A3B8] uppercase tracking-tighter leading-none mt-0.5">
                        #
                      </span>
                    </div>
                  ) : (
                    /* Letter Direct Input Element (Natively handles touch software keyboards & desktop keystrokes) */
                    <input
                      ref={(el) => {
                        cellInputRefs.current[`${r}-${c}`] = el
                      }}
                      type="text"
                      maxLength={1}
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      value={letter}
                      readOnly={editTool === 'obstacle'}
                      onChange={(e) => {
                        if (editTool === 'obstacle') return
                        const char = e.target.value.replace(/[^a-zA-Z]/g, '').slice(-1).toUpperCase()
                        handleSetLetter(r, c, char, true)
                      }}
                      onFocus={() => {
                        setFocusedCell({ r, c })
                      }}
                      onClick={(e) => {
                        if (editTool === 'obstacle') {
                          e.preventDefault()
                          handleToggleObstacle(r, c)
                          return
                        }
                        setFocusedCell({ r, c })
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
                          handleToggleObstacle(r, c)
                        } else if (e.key === 'Backspace') {
                          if (!letter) {
                            e.preventDefault()
                            moveFocus(0, -1)
                            const prevC = c > 0 ? c - 1 : (r > 0 ? cols - 1 : 0)
                            const prevR = c > 0 ? r : Math.max(0, r - 1)
                            handleSetLetter(prevR, prevC, '', false)
                          } else {
                            handleSetLetter(r, c, '', false)
                          }
                        } else if (e.key === 'Delete') {
                          e.preventDefault()
                          handleClear(r, c)
                        }
                      }}
                      className={`grid-box-input absolute inset-0 h-full w-full rounded-xl bg-transparent text-center font-mono font-black text-sm sm:text-base uppercase outline-none select-none transition-colors ${
                        isFocused
                          ? 'text-[#1A73E8] caret-[#1A73E8]'
                          : letter
                          ? 'text-[#111827] caret-[#111827]'
                          : 'text-transparent placeholder:text-[#9CA3AF] caret-[#1A73E8]'
                      } cursor-pointer focus:cursor-text`}
                      placeholder={isFocused ? '·' : ''}
                    />
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Tactile Quick Action Dock (Under Grid Controls) */}
      <div className="w-full rounded-2xl border border-[#E5E7EB] bg-white p-3.5 shadow-xs flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#F3F4F6]">
          {/* Selected Cell Status */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-lg bg-[#F3F4F6] px-2.5 py-1 font-mono text-xs font-bold text-[#111827]">
              Row {focusedCell.r + 1}, Col {focusedCell.c + 1}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-mono text-xs font-semibold ${
                isCurrentObstacle
                  ? 'bg-[#1E293B] text-white'
                  : currentLetter
                  ? 'bg-[#E8F0FE] text-[#1967D2]'
                  : 'bg-[#F9FAFB] text-[#6B7280] border border-[#E5E7EB]'
              }`}
            >
              {isCurrentObstacle ? (
                <>
                  <BrickWall className="h-3 w-3" />
                  <span>Obstacle Wall (#)</span>
                </>
              ) : currentLetter ? (
                <>
                  <Type className="h-3 w-3" />
                  <span>Letter: "{currentLetter}"</span>
                </>
              ) : (
                <span>Empty Cell</span>
              )}
            </span>
          </div>

          {/* Directional Pad */}
          <div className="inline-flex items-center gap-1 rounded-xl bg-[#F9FAFB] p-1 border border-[#E5E7EB]">
            <button
              type="button"
              onClick={() => moveFocus(-1, 0)}
              className="p-1 rounded-lg hover:bg-white text-[#4B5563] hover:text-[#111827] transition-colors"
              title="Navigate Up"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => moveFocus(1, 0)}
              className="p-1 rounded-lg hover:bg-white text-[#4B5563] hover:text-[#111827] transition-colors"
              title="Navigate Down"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => moveFocus(0, -1)}
              className="p-1 rounded-lg hover:bg-white text-[#4B5563] hover:text-[#111827] transition-colors"
              title="Navigate Left"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => moveFocus(0, 1)}
              className="p-1 rounded-lg hover:bg-white text-[#4B5563] hover:text-[#111827] transition-colors"
              title="Navigate Right"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Toggle Obstacle Button */}
          <button
            type="button"
            onClick={() => handleToggleObstacle(focusedCell.r, focusedCell.c)}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              isCurrentObstacle
                ? 'bg-[#1A73E8] text-white hover:bg-[#1557B0] shadow-xs'
                : 'bg-[#1E293B] text-white hover:bg-black shadow-xs'
            }`}
          >
            <BrickWall className="h-3.5 w-3.5" />
            <span>{isCurrentObstacle ? 'Convert to Letter' : 'Set as Wall (#)'}</span>
          </button>

          {/* Clear Current Cell */}
          <button
            type="button"
            onClick={() => handleClear(focusedCell.r, focusedCell.c)}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white py-2 px-3 font-mono text-xs font-bold uppercase tracking-wider text-[#4B5563] hover:bg-[#F9FAFB] hover:text-[#111827] transition-all cursor-pointer shadow-2xs"
          >
            <Eraser className="h-3.5 w-3.5" />
            <span>Clear Cell</span>
          </button>

          {/* Quick Letter Input Box */}
          <div className="flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1">
            <label className="font-mono text-[10px] uppercase font-bold text-[#6B7280] shrink-0">
              Type:
            </label>
            <input
              type="text"
              maxLength={1}
              value={isCurrentObstacle ? '' : currentLetter}
              disabled={isCurrentObstacle}
              placeholder={isCurrentObstacle ? '#' : 'A-Z'}
              onChange={(e) => {
                const char = e.target.value.replace(/[^a-zA-Z]/g, '').slice(-1).toUpperCase()
                handleSetLetter(focusedCell.r, focusedCell.c, char, true)
              }}
              className="w-full bg-transparent font-mono font-black text-center text-xs uppercase text-[#111827] focus:outline-none"
            />
          </div>
        </div>

        {/* Tactile Quick-Tap A–Z Alphabet Ribbon (Touch Optimized) */}
        <div className="pt-2 border-t border-[#F3F4F6]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#6B7280] font-semibold">
              One-Touch Letter Pad (Mobile Quick Entry)
            </span>
            <span className="text-[10px] text-[#9CA3AF]">Tap to place & advance</span>
          </div>

          <div className="flex flex-wrap gap-1">
            {ALPHABET.map((char) => (
              <button
                key={`quick-pad-${char}`}
                type="button"
                onClick={() => handleSetLetter(focusedCell.r, focusedCell.c, char, true)}
                className={`h-7 w-7 rounded-lg font-mono text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                  !isCurrentObstacle && currentLetter === char
                    ? 'bg-[#1A73E8] text-white shadow-xs'
                    : 'bg-[#F3F4F6] text-[#111827] hover:bg-[#E5E7EB] active:scale-95'
                }`}
              >
                {char}
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                handleToggleObstacle(focusedCell.r, focusedCell.c)
                moveFocus(0, 1)
              }}
              className="h-7 px-2 rounded-lg font-mono text-[10px] font-black bg-[#1E293B] text-white hover:bg-black transition-all cursor-pointer flex items-center justify-center gap-1"
              title="Set obstacle wall and advance"
            >
              <BrickWall className="h-2.5 w-2.5" />
              <span>WALL</span>
            </button>

            <button
              type="button"
              onClick={() => {
                handleClear(focusedCell.r, focusedCell.c)
                moveFocus(0, -1)
              }}
              className="h-7 px-2 rounded-lg font-mono text-[10px] font-black bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]/40 hover:bg-[#FEE2E2] transition-all cursor-pointer flex items-center justify-center"
              title="Erase and retreat"
            >
              DEL
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
