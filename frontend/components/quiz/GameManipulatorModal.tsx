'use client'

import React, { useState } from 'react'
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
} from 'lucide-react'

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
      questionText: 'New Question Prompt — Click here to edit',
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
      showToast('You must keep at least 1 question for the quiz!', 'error')
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
    if (confirm('Reset questions to standard Google-themed defaults?')) {
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
      showToast(`Word "${wordUpper}" is already in target list`, 'error')
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

  // --- Save All & Deploy ---
  const handleSaveAll = () => {
    const updatedEvent: GdgEvent = {
      ...event,
      title: title.trim() || event.title,
      description: description.trim() || event.description,
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-4xl max-h-[92vh] rounded-[28px] sm:rounded-[32px] bg-white text-[#202124] shadow-2xl border border-[#DADCE0] overflow-hidden"
      >
        {/* Top Google Quad-Color Header Stripe */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC04] to-[#34A853]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-[#F1F3F4] bg-[#F8F9FA]/80">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-2xl shadow-2xs ${
                isWend
                  ? 'bg-[#E6F4EA] text-[#137333]'
                  : isMentis
                  ? 'bg-[#FEF7E0] text-[#B06000]'
                  : 'bg-[#E8F0FE] text-[#1967D2]'
              }`}
            >
              {isWend ? <Sparkles className="h-5 w-5" /> : isMentis ? <Brain className="h-5 w-5" /> : <Globe className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#202124]">
                  {title} • Game Content Studio
                </h2>
                <span className="hidden sm:inline-flex items-center rounded-full bg-[#1A73E8]/10 px-2 py-0.5 text-[10px] font-bold text-[#1A73E8] uppercase tracking-wider">
                  Admin Manipulator
                </span>
              </div>
              <p className="text-xs text-[#5F6368] line-clamp-1">
                Edit questions, answers, points, and timers. Changes sync immediately to all players.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={isWend ? '/admin?tab=wend' : `/admin?tab=quiz&track=${event.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-[#DADCE0] bg-white px-3 py-1.5 text-xs font-semibold text-[#5F6368] hover:bg-[#F1F3F4] hover:text-[#202124] transition-colors"
              title="Open dedicated tab in Admin Command Center"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Full Studio</span>
            </a>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#DADCE0] bg-white text-[#5F6368] hover:bg-[#F1F3F4] hover:text-[#202124] transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Toast alert banner */}
        {toast && (
          <div
            className={`px-5 py-2 text-xs font-medium flex items-center gap-2 border-b transition-all ${
              toast.type === 'success'
                ? 'bg-[#E6F4EA] text-[#137333] border-[#34A853]/30'
                : toast.type === 'error'
                ? 'bg-[#FCE8E6] text-[#C5221F] border-[#EA4335]/30'
                : 'bg-[#E8F0FE] text-[#1967D2] border-[#1A73E8]/30'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Sub-Tabs: Questions & Answers | Track Details | Live Preview */}
        <div className="flex items-center justify-between px-5 sm:px-7 border-b border-[#F1F3F4] bg-white overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 py-2">
            <button
              onClick={() => setActiveTab('questions')}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'questions'
                  ? 'bg-[#1A73E8] text-white shadow-xs'
                  : 'text-[#5F6368] hover:bg-[#F1F3F4] hover:text-[#202124]'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>
                {isWend ? `Target Words (${wendBoard.targetWords.length})` : `Questions & Answers (${questions.length})`}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('details')}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'details'
                  ? 'bg-[#1A73E8] text-white shadow-xs'
                  : 'text-[#5F6368] hover:bg-[#F1F3F4] hover:text-[#202124]'
              }`}
            >
              <span>Track Title & Card Content</span>
            </button>

            {!isWend && (
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-[#1A73E8] text-white shadow-xs'
                    : 'text-[#5F6368] hover:bg-[#F1F3F4] hover:text-[#202124]'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Live Quiz Simulator</span>
              </button>
            )}
          </div>

          {!isWend && activeTab === 'questions' && (
            <div className="hidden sm:flex items-center gap-3 text-xs text-[#5F6368]">
              <span className="inline-flex items-center gap-1">
                <Award className="h-3.5 w-3.5 text-[#FBBC04]" />
                <strong className="text-[#202124]">{totalPoints}</strong> pts total
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-[#1A73E8]" />
                <strong className="text-[#202124]">{totalSeconds}s</strong> duration
              </span>
            </div>
          )}
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 bg-[#FAFAFA]">
          {/* TAB 1: QUESTIONS & ANSWERS (FOR QUIZ TRACKS) */}
          {!isWend && activeTab === 'questions' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Left Column: Questions List */}
              <div className="md:col-span-5 flex flex-col gap-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#5F6368] uppercase tracking-wider">
                    Question Pool ({questions.length})
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleResetDefaultQuestions}
                      title="Reset to default questions"
                      className="p-1 rounded-md text-[#5F6368] hover:bg-[#E8EAED] hover:text-[#202124]"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={handleAddQuestion}
                      className="inline-flex items-center gap-1 rounded-full bg-[#1A73E8] px-3 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-[#1765CC] active:scale-95 transition-all cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Question</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2 max-h-[460px] overflow-y-auto pr-1">
                  {questions.map((q, idx) => {
                    const isSelected = selectedQIndex === idx
                    const correctChar = ['A', 'B', 'C', 'D'][q.correctOptionIndex ?? 0]
                    return (
                      <div
                        key={q._id || idx}
                        onClick={() => setSelectedQIndex(idx)}
                        className={`group flex items-start justify-between rounded-2xl p-3 border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#1A73E8] bg-white ring-2 ring-[#1A73E8]/20 shadow-sm'
                            : 'border-[#DADCE0] bg-white hover:border-[#BDC1C6] hover:bg-[#F8F9FA]'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 flex-1 min-w-0 pr-2">
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                              isSelected
                                ? 'bg-[#1A73E8] text-white'
                                : 'bg-[#E8F0FE] text-[#1967D2]'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-[#202124] line-clamp-2 leading-snug">
                              {q.questionText}
                            </p>
                            <div className="mt-1.5 flex items-center gap-2 text-[10px] text-[#5F6368]">
                              <span className="rounded-full bg-[#E6F4EA] px-2 py-0.5 font-bold text-[#137333]">
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
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-[#5F6368] hover:bg-[#FCE8E6] hover:text-[#C5221F] transition-all cursor-pointer"
                          title="Delete question"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Right Column: Active Question Editor */}
              <div className="md:col-span-7 flex flex-col gap-4 rounded-3xl border border-[#DADCE0] bg-white p-5 shadow-xs">
                {activeQuestion ? (
                  <>
                    <div className="flex items-center justify-between pb-3 border-b border-[#F1F3F4]">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#1A73E8] text-xs font-bold text-white">
                          #{selectedQIndex + 1}
                        </span>
                        <h3 className="text-sm font-semibold text-[#202124]">
                          Edit Question Details
                        </h3>
                      </div>
                      <span className="text-[11px] text-[#5F6368]">
                        Question {selectedQIndex + 1} of {questions.length}
                      </span>
                    </div>

                    {/* Question Prompt */}
                    <div>
                      <label className="block text-xs font-semibold text-[#3C4043] mb-1">
                        Question Prompt
                      </label>
                      <textarea
                        rows={3}
                        value={activeQuestion.questionText}
                        onChange={(e) => handleUpdateActiveQuestion('questionText', e.target.value)}
                        placeholder="Type the question prompt here..."
                        className="w-full rounded-2xl border border-[#DADCE0] bg-white p-3 text-xs sm:text-sm font-medium text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
                      />
                    </div>

                    {/* 4 Options with Correct Answer Selector */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-[#3C4043]">
                          Answer Choices (Click letter pill to mark Correct Answer)
                        </label>
                        <span className="text-[11px] font-semibold text-[#137333]">
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
                              className={`flex items-center gap-2 rounded-2xl border p-2 transition-all ${
                                isCorrect
                                  ? 'border-[#34A853] bg-[#E6F4EA]/40 ring-1 ring-[#34A853]/40'
                                  : 'border-[#DADCE0] bg-white hover:border-[#BDC1C6]'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleUpdateActiveQuestion('correctOptionIndex', optIdx)}
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer ${
                                  isCorrect
                                    ? 'bg-[#34A853] text-white hover:bg-[#2E7D32]'
                                    : 'border border-[#DADCE0] bg-white text-[#5F6368] hover:bg-[#E8F0FE] hover:text-[#1967D2]'
                                }`}
                                title={isCorrect ? 'Marked as Correct Answer' : `Click to set Option ${letter} as Correct`}
                              >
                                {letter}
                              </button>

                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => handleUpdateOption(optIdx, e.target.value)}
                                placeholder={`Option ${letter} text`}
                                className="w-full bg-transparent px-2 text-xs font-medium text-[#202124] focus:outline-none"
                              />

                              {isCorrect && (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#34A853] px-2.5 py-0.5 text-[10px] font-bold text-white shadow-2xs">
                                  <Check className="h-3 w-3" />
                                  <span>Correct Answer</span>
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Question Scoring & Timer Settings */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#F1F3F4]">
                      <div>
                        <label className="block text-xs font-semibold text-[#5F6368] mb-1">
                          Score Points
                        </label>
                        <input
                          type="number"
                          min={10}
                          max={1000}
                          step={10}
                          value={activeQuestion.points || 100}
                          onChange={(e) => handleUpdateActiveQuestion('points', Number(e.target.value))}
                          className="w-full rounded-xl border border-[#DADCE0] bg-white px-3 py-2 text-xs font-semibold text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#5F6368] mb-1">
                          Time Limit (Seconds)
                        </label>
                        <input
                          type="number"
                          min={5}
                          max={300}
                          step={5}
                          value={activeQuestion.timeLimitSeconds || 30}
                          onChange={(e) => handleUpdateActiveQuestion('timeLimitSeconds', Number(e.target.value))}
                          className="w-full rounded-xl border border-[#DADCE0] bg-white px-3 py-2 text-xs font-semibold text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-[#5F6368]">
                    <HelpCircle className="h-8 w-8 mb-2 text-[#BDC1C6]" />
                    <p className="text-xs">Select or add a question from the left panel.</p>
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
                  className="rounded-2xl border border-[#DADCE0] bg-white p-3.5 shadow-2xs space-y-2"
                >
                  <span className="text-xs font-bold text-[#137333] uppercase tracking-wider flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Add Target Word
                  </span>
                  <input
                    type="text"
                    value={newWordInput}
                    onChange={(e) => setNewWordInput(e.target.value.toUpperCase())}
                    placeholder="TARGET WORD (e.g. FLUTTER)"
                    className="w-full rounded-xl border border-[#DADCE0] bg-white px-3 py-1.5 text-xs font-bold text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#34A853]"
                  />
                  <input
                    type="text"
                    value={newHintInput}
                    onChange={(e) => setNewHintInput(e.target.value)}
                    placeholder="Clue or hint for participants"
                    className="w-full rounded-xl border border-[#DADCE0] bg-white px-3 py-1.5 text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#34A853]"
                  />
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-full bg-[#34A853] py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#2E7D32] transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Word to Bank</span>
                  </button>
                </form>

                <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1">
                  <span className="text-xs font-bold text-[#5F6368] uppercase tracking-wider">
                    Target Words ({wendBoard.targetWords.length})
                  </span>
                  {wendBoard.targetWords.map((tw) => {
                    const isSelected = selectedWordId === tw.id
                    const path = findWordPathInGrid(tw.word, wendBoard.grid)
                    const isSolvable = Boolean(path && path.length > 0)

                    return (
                      <div
                        key={tw.id}
                        onClick={() => setSelectedWordId(tw.id)}
                        className={`group flex items-start justify-between rounded-2xl p-3 border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#34A853] bg-white ring-2 ring-[#34A853]/20 shadow-xs'
                            : 'border-[#DADCE0] bg-white hover:border-[#BDC1C6]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#202124] tracking-wider">
                              {tw.word}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                isSolvable
                                  ? 'bg-[#E6F4EA] text-[#137333]'
                                  : 'bg-[#FCE8E6] text-[#C5221F]'
                              }`}
                            >
                              {isSolvable ? '✓ Solvable on Grid' : '✕ Path Blocked'}
                            </span>
                          </div>
                          {tw.hint && (
                            <p className="text-[11px] text-[#5F6368] mt-1 line-clamp-1">{tw.hint}</p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteTargetWord(tw.id)
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-[#5F6368] hover:bg-[#FCE8E6] hover:text-[#C5221F] transition-all cursor-pointer"
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
              <div className="md:col-span-7 flex flex-col gap-4 rounded-3xl border border-[#DADCE0] bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-[#F1F3F4]">
                  <div>
                    <h3 className="text-sm font-semibold text-[#202124]">
                      Wend Board Configuration ({wendBoard.rows}x{wendBoard.cols})
                    </h3>
                    <p className="text-xs text-[#5F6368]">
                      Participants trace adjacent snake paths across letters on this grid.
                    </p>
                  </div>
                  <a
                    href="/admin?tab=wend"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-[#1A73E8] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#1765CC]"
                  >
                    <span>Open Grid Studio</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

                <div className="rounded-2xl border border-[#DADCE0] bg-[#F8F9FA] p-4 text-center">
                  <p className="text-xs text-[#5F6368] leading-relaxed mb-3">
                    The 8x8 Wend board features obstacle cutouts and letter matrix. For detailed letter-by-letter board painting, obstacle toggling, and live grid manipulation, open the dedicated Wend Studio.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {wendBoard.targetWords.map((tw) => (
                      <span
                        key={tw.id}
                        className="rounded-full bg-white border border-[#DADCE0] px-3 py-1 text-xs font-bold text-[#202124] shadow-2xs"
                      >
                        {tw.word}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TITLE & DESCRIPTION */}
          {activeTab === 'details' && (
            <div className="max-w-xl mx-auto rounded-3xl border border-[#DADCE0] bg-white p-6 shadow-xs space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#3C4043] mb-1">
                  Track Display Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Event track title"
                  className="w-full rounded-2xl border border-[#DADCE0] bg-white p-3 text-sm font-semibold text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3C4043] mb-1">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Event track description"
                  className="w-full rounded-2xl border border-[#DADCE0] bg-white p-3 text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
                />
              </div>
            </div>
          )}

          {/* TAB 3: LIVE QUIZ SIMULATOR */}
          {!isWend && activeTab === 'preview' && activeQuestion && (
            <div className="max-w-lg mx-auto rounded-3xl border border-[#DADCE0] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F1F3F4]">
                <span className="text-xs font-bold text-[#1A73E8] uppercase tracking-wider">
                  Participant Perspective Preview
                </span>
                <span className="rounded-full bg-[#FEF7E0] px-3 py-1 text-xs font-bold text-[#B06000]">
                  {activeQuestion.timeLimitSeconds || 30}s Timer
                </span>
              </div>

              <h4 className="text-base font-semibold text-[#202124] mb-4">
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
                      className={`w-full flex items-center gap-3 rounded-2xl p-3 text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-2 border-[#1A73E8] bg-[#E8F0FE] text-[#1967D2]'
                          : 'border border-[#DADCE0] bg-white text-[#202124] hover:bg-[#F8F9FA]'
                      }`}
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-white border border-[#DADCE0] text-xs font-bold text-[#5F6368] shadow-2xs">
                        {['A', 'B', 'C', 'D'][idx]}
                      </span>
                      <span className="text-xs font-medium flex-1">{opt}</span>
                      {isSelected && isCorrect && (
                        <span className="text-xs font-bold text-[#137333]">✓ Correct Answer!</span>
                      )}
                    </button>
                  )
                })}
              </div>

              <p className="mt-4 text-center text-[11px] text-[#5F6368]">
                Interactive preview simulating the participant mobile and desktop experience.
              </p>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer Action Bar */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-t border-[#DADCE0] bg-white">
          <div className="flex items-center gap-1.5 text-xs text-[#5F6368]">
            <span className="h-2 w-2 rounded-full bg-[#34A853] animate-pulse" />
            <span className="hidden sm:inline">Real-time sync to all participants on save</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#DADCE0] bg-white px-4 py-2 text-xs font-medium text-[#5F6368] hover:bg-[#F1F3F4] hover:text-[#202124] transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              className="inline-flex items-center gap-2 rounded-full bg-[#1A73E8] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#1765CC] active:scale-95 transition-all cursor-pointer"
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
