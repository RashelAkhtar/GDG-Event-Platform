'use client'

import React, { useState, useEffect } from 'react'
import {
  GdgEvent,
  QuestionData,
  WendBoardConfig,
  WendTargetWord,
  api,
  findWordPathInGrid,
} from '@/lib/api'
import {
  X,
  Plus,
  Trash2,
  Check,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Clock,
  Award,
  Globe,
  Brain,
  Sliders,
  Eye,
  RotateCcw,
  ExternalLink,
  AlertCircle,
  Save,
  Layers,
} from 'lucide-react'
import { WendBoardAdminStudio } from '@/components/wend/WendBoardAdminStudio'

interface GameManipulatorModalProps {
  event: GdgEvent
  isOpen: boolean
  onClose: () => void
  onSave: (
    updatedEvent: GdgEvent,
    updatedQuestions?: QuestionData[],
    updatedWendBoard?: WendBoardConfig
  ) => void
}

export function GameManipulatorModal(props: GameManipulatorModalProps) {
  if (!props.isOpen) return null
  return <GameManipulatorModalInner key={`${props.event._id}-${props.isOpen}`} {...props} />
}

function GameManipulatorModalInner({
  event,
  onClose,
  onSave,
}: GameManipulatorModalProps) {
  const isWend = event.slug === 'wend-game'
  const isMentis = event.slug.includes('mentis')

  // Active top tab in modal: 'questions' | 'details' | 'preview'
  const [activeTab, setActiveTab] = useState<'questions' | 'details' | 'preview'>('questions')

  // Event info state
  const [title, setTitle] = useState(event.title)
  const [description, setDescription] = useState(event.description || '')

  // Quiz Questions state (for web & mentis)
  const [questions, setQuestions] = useState<QuestionData[]>(() =>
    api.getQuestionsForSlug(event.slug)
  )
  const [selectedQIndex, setSelectedQIndex] = useState<number>(0)

  // Wend Board & Target words state (for wend)
  const [wendBoard, setWendBoard] = useState<WendBoardConfig>(() => api.getWendBoard())
  const [selectedWordId, setSelectedWordId] = useState<string | null>(() =>
    api.getWendBoard().targetWords[0]?.id || null
  )
  const [newWordInput, setNewWordInput] = useState('')
  const [newHintInput, setNewHintInput] = useState('')

  // Live Database Hydration on Studio Opening
  useEffect(() => {
    if (isWend) {
      void api.fetchWendBoard().then((fresh) => {
        if (fresh) {
          setWendBoard(fresh)
          if (fresh.targetWords && fresh.targetWords.length > 0) {
            setSelectedWordId(fresh.targetWords[0].id)
          }
        }
      })
    } else {
      void api.fetchQuestions(event.slug).then((fresh) => {
        if (fresh && fresh.length > 0) {
          setQuestions(fresh)
        }
      })
    }
  }, [isWend, event.slug])

  // Toast feedback inside modal
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  // Simulation preview state
  const [previewSelectedOption, setPreviewSelectedOption] = useState<number | null>(null)

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // --- Quiz Question Actions ---
  const activeQuestion: QuestionData | undefined = questions[selectedQIndex]

  const handleUpdateActiveQuestion = (field: keyof QuestionData, value: unknown) => {
    if (!activeQuestion) return
    const updated = [...questions]
    updated[selectedQIndex] = {
      ...activeQuestion,
      [field]: value,
    }
    setQuestions(updated)
  }

  const handleUpdateOption = (optionIndex: number, text: string) => {
    if (!activeQuestion) return
    const updatedOptions = [...activeQuestion.options]
    updatedOptions[optionIndex] = text
    handleUpdateActiveQuestion('options', updatedOptions)
  }

  const handleAddQuestion = () => {
    const newQ: QuestionData = {
      _id: `q_${Date.now()}_${questions.length + 1}`,
      questionText: 'New Question Prompt — Click here to enter question statement',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctOptionIndex: 0,
      points: 100,
      timeLimitSeconds: 30,
      order: questions.length + 1,
    }
    const updated = [...questions, newQ]
    setQuestions(updated)
    setSelectedQIndex(updated.length - 1)
    showToast(`Added Question #${updated.length}`)
  }

  const handleDeleteQuestion = (indexToDelete: number) => {
    if (questions.length <= 1) {
      showToast('You must keep at least 1 question for the arena!', 'error')
      return
    }
    const updated = questions
      .filter((_, idx) => idx !== indexToDelete)
      .map((q, idx) => ({ ...q, order: idx + 1 }))
    setQuestions(updated)
    setSelectedQIndex(Math.max(0, indexToDelete - 1))
    showToast('Question removed')
  }

  const handleResetDefaultQuestions = () => {
    if (confirm('Reset questions to standard curated defaults?')) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`gdg_questions_${event.slug}`)
      }
      const defaults = api.getQuestionsForSlug(event.slug)
      setQuestions(defaults)
      setSelectedQIndex(0)
      showToast('Reset to default questions!', 'info')
    }
  }

  // --- Wend Board Actions ---
  const handleAddTargetWord = (e: React.FormEvent) => {
    e.preventDefault()
    const wordUpper = newWordInput.trim().toUpperCase()
    if (!wordUpper) {
      showToast('Target word cannot be empty', 'error')
      return
    }
    if (wendBoard.targetWords.some((tw) => tw.word.toUpperCase() === wordUpper)) {
      showToast(`Word "${wordUpper}" is already in target bank`, 'error')
      return
    }
    const newTw: WendTargetWord = {
      id: `tw_${Date.now()}_${wordUpper.toLowerCase()}`,
      word: wordUpper,
      hint: newHintInput.trim() || undefined,
    }
    const path = findWordPathInGrid(wordUpper, wendBoard.grid)
    const isSolvable = Boolean(path && path.length > 0)

    const updatedWords = [...wendBoard.targetWords, newTw]
    const updatedBoard: WendBoardConfig = { ...wendBoard, targetWords: updatedWords }
    setWendBoard(updatedBoard)
    setNewWordInput('')
    setNewHintInput('')
    setSelectedWordId(newTw.id)
    if (isSolvable) {
      showToast(`Added "${wordUpper}" • Solvable on current grid!`, 'success')
    } else {
      showToast(`Added "${wordUpper}", but it cannot be traced on current grid!`, 'info')
    }
  }

  const handleDeleteTargetWord = (id: string) => {
    if (wendBoard.targetWords.length <= 1) {
      showToast('Keep at least 1 target word!', 'error')
      return
    }
    const updatedWords = wendBoard.targetWords.filter((tw) => tw.id !== id)
    const updatedBoard: WendBoardConfig = { ...wendBoard, targetWords: updatedWords }
    setWendBoard(updatedBoard)
    if (selectedWordId === id) {
      setSelectedWordId(updatedWords[0]?.id || null)
    }
    showToast('Target word removed')
  }

  // --- Save All & Deploy Directly to Database & Sockets ---
  const handleSaveAll = () => {
    const updatedEvent: GdgEvent = {
      ...event,
      title: title.trim() || event.title,
      description: description.trim() || event.description,
    }

    if (updatedEvent.title !== event.title || updatedEvent.description !== event.description) {
      void api.updateEventDetails(event._id, {
        title: updatedEvent.title,
        description: updatedEvent.description,
      })
    }

    if (isWend) {
      api.saveWendBoard(wendBoard)
      onSave(updatedEvent, undefined, wendBoard)
    } else {
      api.saveQuestionsForSlug(event.slug, questions)
      onSave(updatedEvent, questions, undefined)
    }
    onClose()
  }

  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 100), 0)
  const totalSeconds = questions.reduce((sum, q) => sum + (q.timeLimitSeconds || 30), 0)

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-0 sm:p-4 md:p-6 animate-in fade-in duration-200 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-5xl rounded-none sm:rounded-3xl bg-white text-[#111827] shadow-[0_24px_80px_rgba(0,0,0,0.18)] border-0 sm:border sm:border-[#E5E7EB] overflow-hidden"
      >
        {/* Top Single Hairline Google 4-Color Accent Strip */}
        <div className="google-hairline-strip" />

        {/* Modal Masthead */}
        <div className="flex items-center justify-between px-4 sm:px-7 py-3.5 sm:py-4 border-b border-[#E5E7EB] bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FAFAFA] border border-[#E5E7EB] text-[#111827]">
              {isWend ? (
                <Sparkles className="h-5 w-5 text-[#34A853]" />
              ) : isMentis ? (
                <Brain className="h-5 w-5 text-[#FBBC04]" />
              ) : (
                <Globe className="h-5 w-5 text-[#1A73E8]" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#6B7280]">
                  {isWend ? 'ARENA 03' : isMentis ? 'ARENA 02' : 'ARENA 01'} // CONTENT STUDIO
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#FAFAFA] border border-[#E5E7EB] px-2 py-0.5 font-mono text-[8.5px] uppercase tracking-wider text-[#111827]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#34A853] animate-pulse" />
                  Live Sync
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-medium tracking-[-0.03em] text-[#111827] truncate mt-0.5">
                {title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={isWend ? '/admin-panel/panel?tab=wend' : `/admin-panel/panel?tab=quiz&track=${event.slug}`}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-[#FAFAFA] px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-[#111827] hover:border-[#111827] hover:bg-white transition-all shadow-2xs"
              title="Open Full Studio in Command Center"
            >
              <ExternalLink className="h-3.5 w-3.5 text-[#1A73E8]" />
              <span>Full Studio</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] transition-all cursor-pointer"
              title="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Toast Alert Banner */}
        {toast && (
          <div
            className={`px-4 sm:px-7 py-2 text-xs font-medium flex items-center gap-2 border-b transition-all ${
              toast.type === 'success'
                ? 'bg-[#F0FDF4] text-[#15803D] border-[#86EFAC]'
                : toast.type === 'error'
                ? 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]'
                : 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#15803D]" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-[#DC2626]" />
            )}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Studio Sub-Tabs Bar */}
        <div className="flex items-center justify-between px-4 sm:px-7 border-b border-[#E5E7EB] bg-[#FAFAFA] overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 py-2">
            <button
              type="button"
              onClick={() => setActiveTab('questions')}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-xs uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                activeTab === 'questions'
                  ? 'bg-[#111827] text-white shadow-xs'
                  : 'text-[#6B7280] hover:bg-white hover:text-[#111827]'
              }`}
            >
              <Sliders className="h-3 w-3" />
              <span>
                {isWend ? `Target Words (${wendBoard.targetWords.length})` : `Questions (${questions.length})`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-xs uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                activeTab === 'details'
                  ? 'bg-[#111827] text-white shadow-xs'
                  : 'text-[#6B7280] hover:bg-white hover:text-[#111827]'
              }`}
            >
              <Layers className="h-3 w-3" />
              <span>Track Metadata</span>
            </button>

            {!isWend && (
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-xs uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                  activeTab === 'preview'
                    ? 'bg-[#111827] text-white shadow-xs'
                    : 'text-[#6B7280] hover:bg-white hover:text-[#111827]'
                }`}
              >
                <Eye className="h-3 w-3" />
                <span>Live Simulator</span>
              </button>
            )}
          </div>

          {!isWend && activeTab === 'questions' && (
            <div className="hidden md:flex items-center gap-3 font-mono text-xs text-[#6B7280]">
              <span className="inline-flex items-center gap-1 rounded-full border border-[#E5E7EB] bg-white px-2.5 py-0.5">
                <Award className="h-3 w-3 text-[#FBBC04]" />
                <strong className="text-[#111827]">{totalPoints}</strong> pts
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#E5E7EB] bg-white px-2.5 py-0.5">
                <Clock className="h-3 w-3 text-[#1A73E8]" />
                <strong className="text-[#111827]">{totalSeconds}s</strong> pool
              </span>
            </div>
          )}
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-7 bg-[#FAFAFA]">
          {/* TAB 1: QUESTIONS & ANSWERS (FOR QUIZ TRACKS) */}
          {!isWend && activeTab === 'questions' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Left Column: Questions List */}
              <div className="md:col-span-5 flex flex-col gap-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#6B7280]">
                    QUESTION POOL ({questions.length})
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleResetDefaultQuestions}
                      title="Reset to default questions"
                      className="p-1 rounded-md text-[#6B7280] hover:bg-white hover:text-[#111827] transition-all cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="inline-flex items-center gap-1 rounded-full bg-[#111827] px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-white shadow-2xs hover:bg-black active:scale-95 transition-all cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Question</span>
                    </button>
                  </div>
                </div>

                {questions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-dashed border-[#E5E7EB] bg-white text-center">
                    <HelpCircle className="h-6 w-6 text-[#9CA3AF] mb-2" />
                    <p className="font-mono text-[10px] uppercase tracking-wider text-[#6B7280]">No questions in pool</p>
                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#111827] px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-white hover:bg-black transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Create Question</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[260px] sm:max-h-[460px] overflow-y-auto pr-1">
                    {questions.map((q, idx) => {
                      const isSelected = selectedQIndex === idx
                      const correctChar = ['A', 'B', 'C', 'D'][q.correctOptionIndex ?? 0]
                      return (
                        <div
                          key={q._id || idx}
                          onClick={() => setSelectedQIndex(idx)}
                          className={`group flex items-start justify-between rounded-xl p-3 border transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#111827] bg-[#F4F4F5] shadow-xs ring-1 ring-[#111827]/10'
                              : 'border-[#E5E7EB] bg-white hover:border-[#9CA3AF]'
                          }`}
                        >
                          <div className="flex items-start gap-2.5 flex-1 min-w-0 pr-2">
                            <span
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-semibold ${
                                isSelected
                                  ? 'bg-[#111827] text-white'
                                  : 'bg-white border border-[#E5E7EB] text-[#4B5563]'
                              }`}
                            >
                              {(idx + 1).toString().padStart(2, '0')}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-normal text-[#111827] line-clamp-2 leading-snug">
                                {q.questionText}
                              </p>
                              <div className="mt-1.5 flex items-center gap-2 font-mono text-[9.5px] text-[#6B7280]">
                                <span className="rounded-full bg-[#F0FDF4] border border-[#DCFCE7] px-2 py-0.2 font-medium text-[#15803D]">
                                  Ans: {correctChar}
                                </span>
                                <span>• {q.points || 100} pts</span>
                                <span>• {q.timeLimitSeconds || 30}s</span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteQuestion(idx)
                            }}
                            className="opacity-60 group-hover:opacity-100 p-1 rounded-lg text-[#9CA3AF] hover:bg-[#FEF2F2] hover:text-[#DC2626] transition-all cursor-pointer"
                            title="Delete question"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Right Column: Active Question Editor */}
              <div className="md:col-span-7 flex flex-col gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 sm:p-6 shadow-xs">
                {activeQuestion ? (
                  <>
                    <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#111827] font-mono text-[11px] font-bold text-white">
                          #{(selectedQIndex + 1).toString().padStart(2, '0')}
                        </span>
                        <h3 className="text-sm font-medium text-[#111827]">
                          Question Specification
                        </h3>
                      </div>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[#6B7280]">
                        {selectedQIndex + 1} OF {questions.length} QUESTIONS
                      </span>
                    </div>

                    {/* Question Prompt */}
                    <div>
                      <label className="block font-mono text-[9.5px] uppercase tracking-wider text-[#6B7280] mb-1.5">
                        Question Statement
                      </label>
                      <textarea
                        rows={3}
                        value={activeQuestion.questionText}
                        onChange={(e) => handleUpdateActiveQuestion('questionText', e.target.value)}
                        placeholder="Type the question prompt statement here..."
                        className="w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] p-3 text-xs sm:text-[13px] font-normal text-[#111827] focus:outline-none focus:border-[#111827] focus:bg-white leading-relaxed transition-colors"
                      />
                    </div>

                    {/* 4 Options with Correct Answer Selector */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="font-mono text-[9.5px] uppercase tracking-wider text-[#6B7280]">
                          Option Values (Select letter to mark correct)
                        </label>
                        <span className="font-mono text-[10px] font-medium text-[#15803D]">
                          ✓ Correct: {['A', 'B', 'C', 'D'][activeQuestion.correctOptionIndex ?? 0]}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {activeQuestion.options.map((opt, optIdx) => {
                          const isCorrect = (activeQuestion.correctOptionIndex ?? 0) === optIdx
                          const letter = ['A', 'B', 'C', 'D'][optIdx]
                          return (
                            <div
                              key={optIdx}
                              className={`flex items-center gap-2 rounded-xl border p-2 transition-all ${
                                isCorrect
                                  ? 'border-[#86EFAC] bg-[#F0FDF4] ring-1 ring-[#86EFAC]'
                                  : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleUpdateActiveQuestion('correctOptionIndex', optIdx)}
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                                  isCorrect
                                    ? 'bg-[#15803D] text-white shadow-xs'
                                    : 'border border-[#E5E7EB] bg-white text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]'
                                }`}
                                title={isCorrect ? 'Marked as Correct' : `Click to set Option ${letter} as Correct`}
                              >
                                {letter}
                              </button>

                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => handleUpdateOption(optIdx, e.target.value)}
                                placeholder={`Option ${letter} statement`}
                                className="w-full bg-transparent px-2 text-xs font-normal text-[#111827] focus:outline-none"
                              />

                              {isCorrect && (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#15803D] px-2.5 py-0.5 font-mono text-[8.5px] font-bold text-white shadow-2xs">
                                  <Check className="h-2.5 w-2.5" />
                                  <span>Correct</span>
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Question Scoring & Timer Settings */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#F3F4F6]">
                      <div>
                        <label className="block font-mono text-[9.5px] uppercase tracking-wider text-[#6B7280] mb-1">
                          Scoring Points
                        </label>
                        <input
                          type="number"
                          min={10}
                          max={1000}
                          step={10}
                          value={activeQuestion.points || 100}
                          onChange={(e) => handleUpdateActiveQuestion('points', Number(e.target.value))}
                          className="w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-2 font-mono text-xs font-semibold text-[#111827] focus:outline-none focus:border-[#111827] focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block font-mono text-[9.5px] uppercase tracking-wider text-[#6B7280] mb-1">
                          Round Time Limit (Seconds)
                        </label>
                        <input
                          type="number"
                          min={5}
                          max={300}
                          step={5}
                          value={activeQuestion.timeLimitSeconds || 30}
                          onChange={(e) => handleUpdateActiveQuestion('timeLimitSeconds', Number(e.target.value))}
                          className="w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-2 font-mono text-xs font-semibold text-[#111827] focus:outline-none focus:border-[#111827] focus:bg-white"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-[#6B7280] text-center">
                    <HelpCircle className="h-8 w-8 mb-2 text-[#9CA3AF]" />
                    <p className="text-xs font-medium text-[#111827]">No Question Selected</p>
                    <p className="text-[11px] text-[#6B7280] mt-0.5 max-w-xs">
                      Pick a question from the left pool or add a new question to edit prompt and choices.
                    </p>
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={handleAddQuestion}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#111827] px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-white hover:bg-black transition-colors cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Question</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleResetDefaultQuestions}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-3.5 py-2 font-mono text-[10px] uppercase tracking-wider text-[#111827] hover:border-[#111827] transition-colors cursor-pointer"
                      >
                        <RotateCcw className="h-3 w-3 text-[#6B7280]" />
                        <span>Load Curated</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 1 (WEND): TARGET WORDS & GRID SETUP */}
          {isWend && activeTab === 'questions' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Left Column: Add Word & Target Word List */}
              <div className="md:col-span-5 flex flex-col gap-3">
                <form
                  onSubmit={handleAddTargetWord}
                  className="rounded-2xl border border-[#E5E7EB] bg-white p-3.5 shadow-2xs space-y-2"
                >
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#15803D] font-medium flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Add Target Word
                  </span>
                  <input
                    type="text"
                    value={newWordInput}
                    onChange={(e) => setNewWordInput(e.target.value.toUpperCase())}
                    placeholder="TARGET WORD (e.g. FLUTTER)"
                    className="w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-2 font-mono text-xs font-semibold text-[#111827] focus:outline-none focus:border-[#15803D] focus:bg-white"
                  />
                  <input
                    type="text"
                    value={newHintInput}
                    onChange={(e) => setNewHintInput(e.target.value)}
                    placeholder="Clue or hint for participants"
                    className="w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#15803D] focus:bg-white"
                  />
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-full bg-[#111827] py-2 font-mono text-xs uppercase tracking-wider text-white shadow-2xs hover:bg-black transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Word to Bank</span>
                  </button>
                </form>

                <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#6B7280]">
                    TARGET WORDS ({wendBoard.targetWords.length})
                  </span>
                  {wendBoard.targetWords.map((tw) => {
                    const isSelected = selectedWordId === tw.id
                    const path = findWordPathInGrid(tw.word, wendBoard.grid)
                    const isSolvable = Boolean(path && path.length > 0)

                    return (
                      <div
                        key={tw.id}
                        onClick={() => setSelectedWordId(tw.id)}
                        className={`group flex items-start justify-between rounded-xl p-3 border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#15803D] bg-white ring-1 ring-[#15803D]/20 shadow-xs'
                            : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-[#111827] tracking-wider">
                              {tw.word}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.2 font-mono text-[9px] font-medium ${
                                isSolvable
                                  ? 'bg-[#F0FDF4] text-[#15803D]'
                                  : 'bg-[#FEF2F2] text-[#DC2626]'
                              }`}
                            >
                              {isSolvable ? '✓ Solvable' : '✕ Blocked'}
                            </span>
                          </div>
                          {tw.hint && (
                            <p className="text-[11px] text-[#6B7280] mt-1 line-clamp-1">{tw.hint}</p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteTargetWord(tw.id)
                          }}
                          className="opacity-60 group-hover:opacity-100 p-1 rounded-lg text-[#9CA3AF] hover:bg-[#FEF2F2] hover:text-[#DC2626] transition-all cursor-pointer"
                          title="Delete word"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Right Column: Grid Information & Studio Shortcut */}
              <div className="md:col-span-7 flex flex-col gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 sm:p-6 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
                  <div>
                    <h3 className="text-sm font-medium text-[#111827]">
                      Wend Board Configuration ({wendBoard.rows}×{wendBoard.cols})
                    </h3>
                    <p className="text-xs text-[#6B7280]">
                      Participants trace adjacent letter paths on this matrix.
                    </p>
                  </div>
                  <a
                    href="/admin-panel/panel?tab=wend"
                    className="inline-flex items-center gap-1 rounded-full bg-[#111827] px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-white shadow-2xs hover:bg-black"
                  >
                    <span>Full Grid Studio</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {/* Wend Round Time Limit */}
                <div className="rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] p-4 text-left">
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[#E5E7EB]">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#15803D] font-medium flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      <span>Round Time Limit</span>
                    </span>
                    <span className="font-mono text-xs font-semibold text-[#111827]">
                      {wendBoard.timeLimitSeconds || 120}s ({Math.floor((wendBoard.timeLimitSeconds || 120) / 60)}m {((wendBoard.timeLimitSeconds || 120) % 60)}s)
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[60, 90, 120, 180, 300].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => {
                          const updated = { ...wendBoard, timeLimitSeconds: sec }
                          setWendBoard(updated)
                          api.saveWendBoard(updated)
                          showToast(`Set round timer to ${sec}s!`)
                        }}
                        className={`rounded-full px-3 py-1 font-mono text-xs transition-all cursor-pointer ${
                          (wendBoard.timeLimitSeconds || 120) === sec
                            ? 'bg-[#111827] text-white shadow-xs'
                            : 'border border-[#E5E7EB] bg-white text-[#4B5563] hover:border-[#111827]'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                    <input
                      type="number"
                      min={15}
                      max={1800}
                      value={wendBoard.timeLimitSeconds || 120}
                      onChange={(e) => {
                        const sec = Math.max(15, Number(e.target.value))
                        const updated = { ...wendBoard, timeLimitSeconds: sec }
                        setWendBoard(updated)
                        api.saveWendBoard(updated)
                      }}
                      className="w-20 rounded-xl border border-[#E5E7EB] bg-white px-2.5 py-1 font-mono text-xs font-semibold text-[#111827]"
                    />
                    <span className="font-mono text-xs text-[#6B7280]">sec</span>
                  </div>
                </div>

                {/* Interactive 8×8 Matrix Studio */}
                <div className="rounded-2xl border border-[#E5E7EB] bg-[#FAFAFA] p-4 text-center">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#E5E7EB]">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#15803D] font-semibold">
                      Interactive 8×8 Grid Layout
                    </span>
                    <span className="text-[10px] text-[#6B7280]">Real-time live sync</span>
                  </div>
                  <WendBoardAdminStudio
                    board={wendBoard}
                    onChange={(updated) => {
                      setWendBoard(updated)
                      api.saveWendBoard(updated)
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TITLE & DESCRIPTION */}
          {activeTab === 'details' && (
            <div className="max-w-xl mx-auto rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-xs space-y-4">
              <div>
                <label className="block font-mono text-[9.5px] uppercase tracking-wider text-[#6B7280] mb-1.5">
                  Track Display Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Event track title"
                  className="w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] p-3 text-sm font-medium text-[#111827] focus:outline-none focus:border-[#111827] focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block font-mono text-[9.5px] uppercase tracking-wider text-[#6B7280] mb-1.5">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Event track description"
                  className="w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] p-3 text-xs text-[#111827] focus:outline-none focus:border-[#111827] focus:bg-white leading-relaxed transition-colors"
                />
              </div>
            </div>
          )}

          {/* TAB 3: LIVE QUIZ SIMULATOR */}
          {!isWend && activeTab === 'preview' && activeQuestion && (
            <div className="max-w-md mx-auto rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F3F4F6]">
                <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#6B7280]">
                  PARTICIPANT PERSPECTIVE
                </span>
                <span className="rounded-full bg-[#FEF7E0] border border-[#FDE68A] px-2.5 py-0.5 font-mono text-[10px] font-medium text-[#B45309]">
                  {activeQuestion.timeLimitSeconds || 30}s Timer
                </span>
              </div>

              <h4 className="text-base font-normal tracking-tight text-[#111827] mb-4">
                {activeQuestion.questionText}
              </h4>

              <div className="space-y-2.5">
                {activeQuestion.options.map((opt, idx) => {
                  const isSelected = previewSelectedOption === idx
                  const isCorrect = idx === (activeQuestion.correctOptionIndex ?? 0)
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPreviewSelectedOption(idx)}
                      className={`w-full flex items-center gap-3 rounded-xl p-3 text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border border-[#111827] bg-[#F4F4F5] text-[#111827]'
                          : 'border border-[#E5E7EB] bg-white text-[#4B5563] hover:border-[#D1D5DB]'
                      }`}
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white border border-[#E5E7EB] font-mono text-xs font-semibold text-[#111827] shadow-2xs">
                        {['A', 'B', 'C', 'D'][idx]}
                      </span>
                      <span className="text-xs font-normal flex-1">{opt}</span>
                      {isSelected && isCorrect && (
                        <span className="font-mono text-[10px] font-semibold text-[#15803D]">✓ Correct</span>
                      )}
                    </button>
                  )
                })}
              </div>

              <p className="mt-4 text-center font-mono text-[9.5px] text-[#9CA3AF] uppercase tracking-wider">
                Simulated participant view
              </p>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer Action Bar */}
        <div className="flex items-center justify-between px-4 sm:px-7 py-3.5 sm:py-4 border-t border-[#E5E7EB] bg-white shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#6B7280]">
            <span className="h-2 w-2 rounded-full bg-[#22C55E] animate-pulse" />
            <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-wider">
              Realtime WebSocket sync on save
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#E5E7EB] bg-white px-4 py-2 font-mono text-xs uppercase tracking-wider text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              className="inline-flex items-center gap-2 rounded-full bg-[#111827] px-5 py-2 font-mono text-xs uppercase tracking-wider text-white shadow-xs hover:bg-black active:scale-95 transition-all cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save & Apply Live</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
