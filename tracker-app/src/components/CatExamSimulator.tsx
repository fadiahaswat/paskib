import { useState, useEffect } from 'react';
import { 
  Clock, 
  RotateCcw, 
  HelpCircle, 
  Award, 
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { QUESTION_BANK, type Question } from '../data/questionBank';

interface CatExamSimulatorProps {
  onSaveScore?: (scoreTwk: number, scoreTiu: number) => void;
}

export function CatExamSimulator({ onSaveScore }: CatExamSimulatorProps) {
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'TWK' | 'TIU'>('ALL');
  const [questions, setQuestions] = useState<Question[]>(QUESTION_BANK);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [id: string]: 'A' | 'B' | 'C' | 'D' | 'E' }>({});
  const [markedDoubt, setMarkedDoubt] = useState<{ [id: string]: boolean }>({});
  
  // Timer State (default 15 menit)
  const [timeRemaining, setTimeRemaining] = useState(15 * 60);
  const [isExamActive, setIsExamActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    let filtered = QUESTION_BANK;
    if (selectedFilter !== 'ALL') {
      filtered = QUESTION_BANK.filter(q => q.category === selectedFilter);
    }
    setQuestions(filtered);
    setCurrentIndex(0);
  }, [selectedFilter]);

  // Countdown timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isExamActive && !isFinished && timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setIsFinished(true);
            setIsExamActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isExamActive, isFinished, timeRemaining]);

  const handleStartExam = () => {
    setUserAnswers({});
    setMarkedDoubt({});
    setTimeRemaining(15 * 60);
    setIsFinished(false);
    setIsExamActive(true);
    setCurrentIndex(0);
  };

  const handleSelectAnswer = (key: 'A' | 'B' | 'C' | 'D' | 'E') => {
    if (!isExamActive || isFinished) return;
    const currentQ = questions[currentIndex];
    setUserAnswers(prev => ({ ...prev, [currentQ.id]: key }));
  };

  const handleToggleDoubt = () => {
    const currentQ = questions[currentIndex];
    setMarkedDoubt(prev => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }));
  };

  const handleFinishExam = () => {
    setIsExamActive(false);
    setIsFinished(true);
    if (onSaveScore) {
      const stats = calculateResult();
      onSaveScore(stats.twkScore, stats.tiuScore);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateResult = () => {
    let totalCorrect = 0;
    let twkCorrect = 0;
    let twkTotal = 0;
    let tiuCorrect = 0;
    let tiuTotal = 0;

    questions.forEach(q => {
      const isCorrect = userAnswers[q.id] === q.correctAnswer;
      if (q.category === 'TWK') {
        twkTotal++;
        if (isCorrect) twkCorrect++;
      } else {
        tiuTotal++;
        if (isCorrect) tiuCorrect++;
      }
      if (isCorrect) totalCorrect++;
    });

    const totalQuestions = questions.length;
    const overallScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    const twkScore = twkTotal > 0 ? Math.round((twkCorrect / twkTotal) * 100) : 0;
    const tiuScore = tiuTotal > 0 ? Math.round((tiuCorrect / tiuTotal) * 100) : 0;

    // Passing grade standar BPIP: TWK min 70, TIU min 65
    const isPassed = twkScore >= 70 && tiuScore >= 65;

    return {
      totalCorrect,
      totalQuestions,
      overallScore,
      twkCorrect,
      twkTotal,
      twkScore,
      tiuCorrect,
      tiuTotal,
      tiuScore,
      isPassed
    };
  };

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(userAnswers).length;
  const result = isFinished ? calculateResult() : null;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-600/30 border border-red-500/40 rounded-full text-xs font-semibold text-red-200 mb-2">
              <Sparkles className="w-3.5 h3.5 text-amber-400" /> Standar BPIP & Seleksi Nasional 2025/2026
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Simulasi CAT (TWK & TIU) Paskibraka</h2>
            <p className="text-slate-300 text-sm mt-1">
              Latihan Computer Assisted Test: Tes Wawasan Kebangsaan (Pancasila, UUD 1945, NKRI, Bhinneka Tunggal Ika) & Tes Inteligensia Umum.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!isExamActive && !isFinished ? (
              <button
                onClick={handleStartExam}
                className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 font-bold rounded-xl shadow-lg shadow-red-900/30 transition cursor-pointer flex items-center gap-2"
              >
                Mulai Ujian CAT
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-mono text-lg font-bold ${
                  timeRemaining < 120 
                    ? 'bg-red-950/80 border-red-500 text-red-300 animate-pulse' 
                    : 'bg-slate-800/80 border-slate-700 text-amber-400'
                }`}>
                  <Clock className="w-5 h-5 text-amber-400" />
                  {formatTimer(timeRemaining)}
                </div>
                {isExamActive && (
                  <button
                    onClick={handleFinishExam}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 font-semibold text-sm rounded-xl transition cursor-pointer"
                  >
                    Selesai & Kumpulkan
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter / Tabs */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex gap-2">
          {(['ALL', 'TWK', 'TIU'] as const).map(f => (
            <button
              key={f}
              disabled={isExamActive}
              onClick={() => setSelectedFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                selectedFilter === f
                  ? 'bg-red-600 text-white shadow'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              } ${isExamActive ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {f === 'ALL' ? 'Semua Soal (TWK & TIU)' : f === 'TWK' ? 'Wawasan Kebangsaan (TWK)' : 'Inteligensia Umum (TIU)'}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Terjawab: <span className="font-bold text-slate-900 dark:text-white">{answeredCount}</span> / {questions.length} Soal
        </div>
      </div>

      {/* Result View */}
      {isFinished && result && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-700 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Award className={`w-7 h-7 ${result.isPassed ? 'text-emerald-500' : 'text-amber-500'}`} />
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Hasil Simulasi CAT: {result.isPassed ? 'MEMENUHI PASSING GRADE' : 'BELUM MEMENUHI STANDAR'}
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Passing Grade Minimal BPIP: TWK ≥ 70, TIU ≥ 65
              </p>
            </div>

            <button
              onClick={handleStartExam}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-semibold text-xs flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" /> Ulangi Simulasi
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-xs text-slate-500 uppercase font-semibold">Skor Total</span>
              <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">{result.overallScore}</div>
              <div className="text-xs text-slate-500 mt-1">{result.totalCorrect} benar dari {result.totalQuestions} soal</div>
            </div>

            <div className={`p-4 rounded-xl border text-center ${result.twkScore >= 70 ? 'bg-emerald-50/50 border-emerald-300 dark:bg-emerald-950/20' : 'bg-red-50/50 border-red-300 dark:bg-red-950/20'}`}>
              <span className="text-xs text-slate-500 uppercase font-semibold">Skor TWK</span>
              <div className={`text-3xl font-black mt-1 ${result.twkScore >= 70 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {result.twkScore}
              </div>
              <div className="text-xs text-slate-500 mt-1">{result.twkCorrect} benar / target min. 70</div>
            </div>

            <div className={`p-4 rounded-xl border text-center ${result.tiuScore >= 65 ? 'bg-emerald-50/50 border-emerald-300 dark:bg-emerald-950/20' : 'bg-red-50/50 border-red-300 dark:bg-red-950/20'}`}>
              <span className="text-xs text-slate-500 uppercase font-semibold">Skor TIU</span>
              <div className={`text-3xl font-black mt-1 ${result.tiuScore >= 65 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {result.tiuScore}
              </div>
              <div className="text-xs text-slate-500 mt-1">{result.tiuCorrect} benar / target min. 65</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Exam Area */}
      {questions.length > 0 && currentQ && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question & Option Panel */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col justify-between">
            <div>
              {/* Question Meta */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 mb-5">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    currentQ.category === 'TWK' 
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' 
                      : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                  }`}>
                    {currentQ.category}
                  </span>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {currentQ.subCategory}
                  </span>
                </div>

                <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Nomor {currentIndex + 1} dari {questions.length}
                </div>
              </div>

              {/* Question Text */}
              <div className="text-base md:text-lg font-medium text-slate-900 dark:text-slate-100 leading-relaxed mb-6">
                {currentQ.question}
              </div>

              {/* Options */}
              <div className="space-y-3">
                {currentQ.options.map(opt => {
                  const isSelected = userAnswers[currentQ.id] === opt.key;
                  const isCorrect = isFinished && currentQ.correctAnswer === opt.key;
                  const isWrong = isFinished && isSelected && currentQ.correctAnswer !== opt.key;

                  let borderClass = 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600';
                  let bgClass = 'bg-white dark:bg-slate-800';

                  if (isSelected) {
                    borderClass = 'border-red-500 bg-red-50/40 dark:bg-red-950/20';
                  }
                  if (isCorrect) {
                    borderClass = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 font-semibold';
                  } else if (isWrong) {
                    borderClass = 'border-red-500 bg-red-50 dark:bg-red-950/30';
                  }

                  return (
                    <button
                      key={opt.key}
                      onClick={() => handleSelectAnswer(opt.key)}
                      disabled={isFinished || !isExamActive}
                      className={`w-full text-left p-4 rounded-xl border transition flex items-start gap-3 cursor-pointer ${borderClass} ${bgClass}`}
                    >
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isSelected 
                          ? 'bg-red-600 text-white' 
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}>
                        {opt.key}
                      </span>
                      <span className="text-sm text-slate-800 dark:text-slate-200 pt-0.5">{opt.text}</span>
                    </button>
                  );
                })}
              </div>

              {/* Explanation (shown if finished) */}
              {isFinished && (
                <div className="mt-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs mb-1">
                    <BookOpen className="w-4 h-4" /> Kunci & Pembahasan Resmi:
                  </div>
                  <div className="text-xs text-amber-950 dark:text-amber-200 leading-relaxed">
                    Kunci Jawaban: <strong className="font-bold underline">{currentQ.correctAnswer}</strong>. {currentQ.explanation}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Navigation */}
            <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <button
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Sebelumnya
              </button>

              {isExamActive && (
                <button
                  onClick={handleToggleDoubt}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 cursor-pointer ${
                    markedDoubt[currentQ.id]
                      ? 'bg-amber-100 border-amber-400 text-amber-800 dark:bg-amber-950/40'
                      : 'border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-400'
                  }`}
                >
                  <HelpCircle className="w-4 h-4" /> {markedDoubt[currentQ.id] ? 'Ragu-ragu (Ditandai)' : 'Tandai Ragu'}
                </button>
              )}

              <button
                disabled={currentIndex === questions.length - 1}
                onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
              >
                Berikutnya <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Question Grid Pallete */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm h-fit">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Navigasi Nomor Soal
            </h4>

            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = !!userAnswers[q.id];
                const isDoubt = !!markedDoubt[q.id];

                let btnColor = 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
                if (isAnswered) {
                  btnColor = 'bg-emerald-600 text-white font-bold';
                }
                if (isDoubt) {
                  btnColor = 'bg-amber-500 text-white font-bold';
                }
                if (isCurrent) {
                  btnColor += ' ring-2 ring-red-500 ring-offset-2';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 rounded-lg text-xs font-medium flex items-center justify-center transition cursor-pointer ${btnColor}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-emerald-600 shrink-0" /> Terjawab
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-amber-500 shrink-0" /> Ragu-ragu
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-slate-200 dark:bg-slate-700 shrink-0" /> Belum Dijawab
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
