import { useState } from 'react';
import { 
  Flame, 
  Award, 
  Timer, 
  Activity, 
  CheckCircle2, 
  TrendingUp, 
  UserCheck 
} from 'lucide-react';
import { evaluateSamapta, type SamaptaInput } from '../utils/samaptaScoring';
import { type Participant } from '../initialData';

interface SamaptaModuleProps {
  participants: Participant[];
  onUpdateParticipantSamapta?: (participantId: string, samaptaData: {
    distance: number;
    pushUp: number;
    sitUp: number;
    shuttleRun: number;
    score: number;
  }) => void;
}

export function SamaptaModule({ participants, onUpdateParticipantSamapta }: SamaptaModuleProps) {
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>(participants[0]?.id || '');
  const [gender, setGender] = useState<'L' | 'P'>('L');
  const [distance, setDistance] = useState<number>(3100);
  const [pushUp, setPushUp] = useState<number>(43);
  const [sitUp, setSitUp] = useState<number>(42);
  const [shuttleRun, setShuttleRun] = useState<number>(15.4);
  const [notification, setNotification] = useState<string | null>(null);

  // Sync with participant if selected
  const handleSelectParticipant = (pId: string) => {
    setSelectedParticipantId(pId);
    const p = participants.find(item => item.id === pId);
    if (p) {
      setGender(p.gender);
      setDistance(p.lari_12m_distance || 2800);
      setPushUp(p.push_up_count || 35);
      setSitUp(p.sit_up_count || 35);
      setShuttleRun(p.shuttle_run_time || 16.5);
    }
  };

  const samaptaInput: SamaptaInput = {
    gender,
    lari12mDistance: distance,
    pushUpCount: pushUp,
    sitUpCount: sitUp,
    shuttleRunTime: shuttleRun
  };

  const result = evaluateSamapta(samaptaInput);

  const handleSaveToParticipant = () => {
    if (onUpdateParticipantSamapta && selectedParticipantId) {
      onUpdateParticipantSamapta(selectedParticipantId, {
        distance,
        pushUp,
        sitUp,
        shuttleRun,
        score: result.scoreTotalSamapta
      });
      setNotification(`Nilai Samapta berhasil disimpan ke profil peserta (${result.scoreTotalSamapta} pts)!`);
      setTimeout(() => setNotification(null), 3500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border border-emerald-500/30 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-xs font-semibold text-emerald-300 mb-2">
              <Activity className="w-3.5 h-3.5" /> Standar BPIP & Jasmani Militer / Polri
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Kalkulator & Pengujian Kesamaptaan Jasmani</h2>
            <p className="text-slate-300 text-sm mt-1">
              Kalkulasi otomatis skor Samapta A (Lari 12 Menit) dan Samapta B (Push-Up, Sit-Up, Shuttle Run 6x10m) dengan pembobotan gender.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedParticipantId}
              onChange={(e) => handleSelectParticipant(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-xs font-medium cursor-pointer"
            >
              <option value="">-- Mode Simulasi Bebas --</option>
              {participants.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.gender === 'L' ? 'Putra' : 'Putri'})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {notification && (
        <div className="p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" /> {notification}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Parameters */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-red-500" /> Parameter Uji Jasmani
            </h3>

            {/* Gender Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setGender('L')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  gender === 'L' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Putra (L)
              </button>
              <button
                type="button"
                onClick={() => setGender('P')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  gender === 'P' ? 'bg-pink-600 text-white shadow' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Putri (P)
              </button>
            </div>
          </div>

          {/* Samapta A - Lari 12 Menit */}
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Timer className="w-4 h-4 text-emerald-500" /> Samapta A: Lari 12 Menit
              </label>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                Skor: {result.scoreLari} pts
              </span>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1000"
                max="3800"
                step="50"
                value={distance}
                onChange={(e) => setDistance(Number(e.target.value))}
                className="flex-1 accent-emerald-600 cursor-pointer"
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={distance}
                  onChange={(e) => setDistance(Number(e.target.value))}
                  className="w-24 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-right text-sm font-bold"
                />
                <span className="text-xs text-slate-500">meter</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Target Putra: 3.000m+ (~7.5 keliling lap 400m) | Putri: 2.600m+ (~6.5 keliling lap)
            </p>
          </div>

          {/* Samapta B: Push Up */}
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" /> Samapta B1: Push Up (1 Menit)
              </label>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                Skor: {result.scorePushUp} pts
              </span>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="60"
                value={pushUp}
                onChange={(e) => setPushUp(Number(e.target.value))}
                className="flex-1 accent-blue-600 cursor-pointer"
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={pushUp}
                  onChange={(e) => setPushUp(Number(e.target.value))}
                  className="w-20 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-right text-sm font-bold"
                />
                <span className="text-xs text-slate-500">kali</span>
              </div>
            </div>
          </div>

          {/* Samapta B: Sit Up */}
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-500" /> Samapta B2: Sit Up (1 Menit)
              </label>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                Skor: {result.scoreSitUp} pts
              </span>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="60"
                value={sitUp}
                onChange={(e) => setSitUp(Number(e.target.value))}
                className="flex-1 accent-purple-600 cursor-pointer"
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={sitUp}
                  onChange={(e) => setSitUp(Number(e.target.value))}
                  className="w-20 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-right text-sm font-bold"
                />
                <span className="text-xs text-slate-500">kali</span>
              </div>
            </div>
          </div>

          {/* Samapta B: Shuttle Run */}
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-orange-500" /> Samapta B3: Shuttle Run 6x10 Meter (Kelincahan)
              </label>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300">
                Skor: {result.scoreShuttleRun} pts
              </span>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="14"
                max="26"
                step="0.1"
                value={shuttleRun}
                onChange={(e) => setShuttleRun(Number(e.target.value))}
                className="flex-1 accent-orange-600 cursor-pointer"
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.1"
                  value={shuttleRun}
                  onChange={(e) => setShuttleRun(Number(e.target.value))}
                  className="w-20 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-right text-sm font-bold"
                />
                <span className="text-xs text-slate-500">detik</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Waktu semakin kecil semakin tinggi nilai. Nilai maksimal jika ≤ 16.0s (Putra) atau ≤ 17.5s (Putri).
            </p>
          </div>

          {/* Save button if participant chosen */}
          {selectedParticipantId && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveToParticipant}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserCheck className="w-5 h-5" /> Simpan Hasil Uji ke Profil Peserta
              </button>
            </div>
          )}
        </div>

        {/* Results & Evaluation Summary */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" /> Hasil Rekapitulasi Samapta
            </h3>

            {/* Score Big Display */}
            <div className={`p-5 rounded-2xl border text-center ${result.categoryColor} mb-6`}>
              <span className="text-xs uppercase font-bold tracking-wider">Nilai Total Akhir</span>
              <div className="text-5xl font-black my-1">{result.scoreTotalSamapta}</div>
              <div className="text-sm font-semibold">Predikat: {result.grade}</div>
            </div>

            {/* Sub-scores breakdown */}
            <div className="space-y-3 pb-6 border-b border-slate-100 dark:border-slate-700">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 dark:text-slate-400">Samapta A (Lari 12M):</span>
                <span className="font-bold text-slate-900 dark:text-white">{result.scoreLari} / 100</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 dark:text-slate-400">Samapta B (Rata-rata):</span>
                <span className="font-bold text-slate-900 dark:text-white">{result.scoreSamaptaB} / 100</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-500 pl-3">
                <span>• Push Up</span>
                <span>{result.scorePushUp}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-500 pl-3">
                <span>• Sit Up</span>
                <span>{result.scoreSitUp}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-500 pl-3">
                <span>• Shuttle Run</span>
                <span>{result.scoreShuttleRun}</span>
              </div>
            </div>

            {/* Recommendations */}
            <div className="mt-5 space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Rekomendasi Pelatih & Dokter
              </h4>
              <div className="space-y-2">
                {result.recommendations.map((rec, i) => (
                  <div key={i} className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800 leading-relaxed">
                    💡 {rec}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
