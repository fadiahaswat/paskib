import { useState } from 'react';
import { 
  CheckCircle, 
  UserCheck,
  Compass, 
  Award, 
  MessageSquare, 
  ClipboardList
} from 'lucide-react';
import { type Participant } from '../initialData';

interface JuryAssessmentModuleProps {
  participants: Participant[];
  onSaveJuryScore?: (participantId: string, scores: {
    scorePbb: number;
    scoreSamapta: number;
    scoreWawancara: number;
    finalBpipScore: number;
  }) => void;
}

export function JuryAssessmentModule({ participants, onSaveJuryScore }: JuryAssessmentModuleProps) {
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>(participants[0]?.id || '');
  
  // Rubrik PBB (Bobot 30%)
  const [sikapSempurna, setSikapSempurna] = useState<number>(85);
  const [penghormatan, setPenghormatan] = useState<number>(88);
  const [langkahTegap, setLangkahTegap] = useState<number>(85);
  const [jalanDiTempat, setJalanDiTempat] = useState<number>(82);

  // Rubrik Wawancara (Bobot 40%)
  const [wawasanKebangsaan, setWawasanKebangsaan] = useState<number>(90);
  const [integritasEtika, setIntegritasEtika] = useState<number>(92);
  const [artikulasiBahasa, setArtikulasiBahasa] = useState<number>(88);
  const [minatBakat, setMinatBakat] = useState<number>(85);

  // Samapta Score (Bobot 30%)
  const [scoreSamaptaCurrent, setScoreSamaptaCurrent] = useState<number>(90);

  const [notification, setNotification] = useState<string | null>(null);

  const handleSelectParticipant = (pId: string) => {
    setSelectedParticipantId(pId);
    const p = participants.find(item => item.id === pId);
    if (p) {
      setScoreSamaptaCurrent(p.score_samapta || 85);
      setSikapSempurna(p.score_pbb || 85);
      setPenghormatan(p.score_pbb || 85);
      setLangkahTegap(p.score_pbb || 85);
      setJalanDiTempat(p.score_pbb || 85);

      setWawasanKebangsaan(p.score_wawancara || 88);
      setIntegritasEtika(p.score_wawancara || 88);
      setArtikulasiBahasa(p.score_wawancara || 88);
      setMinatBakat(p.score_wawancara || 88);
    }
  };

  // Nilai Komponen
  const calculatedPbbScore = Math.round((sikapSempurna + penghormatan + langkahTegap + jalanDiTempat) / 4);
  const calculatedWawancaraScore = Math.round((wawasanKebangsaan + integritasEtika + artikulasiBahasa + minatBakat) / 4);
  
  // Rumus Kelulusan Akhir BPIP: PBB 30% + Samapta 30% + Wawancara 40%
  const finalBpipScore = Number(
    ((calculatedPbbScore * 0.3) + (scoreSamaptaCurrent * 0.3) + (calculatedWawancaraScore * 0.4)).toFixed(1)
  );

  const handleSave = () => {
    if (onSaveJuryScore && selectedParticipantId) {
      onSaveJuryScore(selectedParticipantId, {
        scorePbb: calculatedPbbScore,
        scoreSamapta: scoreSamaptaCurrent,
        scoreWawancara: calculatedWawancaraScore,
        finalBpipScore
      });
      setNotification(`Nilai Seleksi BPIP berhasil disimpan! (Total Skor: ${finalBpipScore})`);
      setTimeout(() => setNotification(null), 3500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-indigo-950 border border-red-500/30 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-600/30 border border-red-500/40 rounded-full text-xs font-semibold text-red-200 mb-2">
              <ClipboardList className="w-3.5 h-3.5" /> Rumus Akurasi Kelulusan Seleksi BPIP
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Rubrik Lembar Penilaian Juri / Selektor</h2>
            <p className="text-slate-300 text-sm mt-1">
              Standar Bobot Akhir: PBB (30%) + Kesamaptaan Jasmani (30%) + Wawancara & Kepribadian (40%).
            </p>
          </div>

          <div>
            <select
              value={selectedParticipantId}
              onChange={(e) => handleSelectParticipant(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-xs font-semibold cursor-pointer"
            >
              {participants.map(p => (
                <option key={p.id} value={p.id}>
                  {p.registration_number} - {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {notification && (
        <div className="p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle className="w-5 h-5" /> {notification}
        </div>
      )}

      {/* Grid 2 Column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Rubrik Juri */}
        <div className="lg:col-span-2 space-y-6">
          {/* Rubrik 1: PBB & Parade */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Compass className="w-5 h-5 text-indigo-500" /> Rubrik PBB & Parade (Bobot 30%)
              </h3>
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                Rata-rata PBB: {calculatedPbbScore}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Sikap Sempurna, Kerapian & Bentuk Kaki</span>
                  <span>{sikapSempurna} pts</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={sikapSempurna}
                  onChange={(e) => setSikapSempurna(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Penghormatan & Artikulasi Aba-aba</span>
                  <span>{penghormatan} pts</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={penghormatan}
                  onChange={(e) => setPenghormatan(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Langkah Tegap Maju & Kekompakan Tangan</span>
                  <span>{langkahTegap} pts</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={langkahTegap}
                  onChange={(e) => setLangkahTegap(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Jalan di Tempat & Gerakan Berputar</span>
                  <span>{jalanDiTempat} pts</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={jalanDiTempat}
                  onChange={(e) => setJalanDiTempat(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Rubrik 2: Wawancara & Kepribadian */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-rose-500" /> Rubrik Wawancara & Kepribadian (Bobot 40%)
              </h3>
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                Rata-rata Wawancara: {calculatedWawancaraScore}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Wawasan Kebangsaan, Pancasila & Lambang Negara</span>
                  <span>{wawasanKebangsaan} pts</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={wawasanKebangsaan}
                  onChange={(e) => setWawasanKebangsaan(Number(e.target.value))}
                  className="w-full accent-rose-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Integritas, Etika Berbicara & Ketahanan Mental</span>
                  <span>{integritasEtika} pts</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={integritasEtika}
                  onChange={(e) => setIntegritasEtika(Number(e.target.value))}
                  className="w-full accent-rose-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Artikulasi Nada Suara & Bahasa Asing / Daerah</span>
                  <span>{artikulasiBahasa} pts</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={artikulasiBahasa}
                  onChange={(e) => setArtikulasiBahasa(Number(e.target.value))}
                  className="w-full accent-rose-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Kesenian Tradisional, Olahraga & Minat Bakat</span>
                  <span>{minatBakat} pts</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={minatBakat}
                  onChange={(e) => setMinatBakat(Number(e.target.value))}
                  className="w-full accent-rose-600 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Scoring Card & Submit */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" /> Rekap Nilai Seleksi BPIP
            </h3>

            {/* Score Big Display */}
            <div className="p-5 rounded-2xl border bg-gradient-to-br from-indigo-50 to-slate-50 dark:from-indigo-950/40 dark:to-slate-900/40 border-indigo-200 dark:border-indigo-800 text-center mb-6">
              <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">Skor Kelulusan Akhir</span>
              <div className="text-5xl font-black text-indigo-600 dark:text-indigo-400 my-1">{finalBpipScore}</div>
              <div className="text-xs text-slate-500">
                {finalBpipScore >= 85 ? '✨ Rekomendasi Provinsi / Nasional' : finalBpipScore >= 75 ? '✅ Siap Tingkat Kota/Kab' : '⚠️ Pembinaan Intensif'}
              </div>
            </div>

            {/* Bobot Breakdown */}
            <div className="space-y-3 pb-6 border-b border-slate-100 dark:border-slate-700">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-400">PBB (30%):</span>
                <span className="font-bold text-slate-900 dark:text-white">{calculatedPbbScore} x 0.3 = {(calculatedPbbScore * 0.3).toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-400">Samapta Jasmani (30%):</span>
                <span className="font-bold text-slate-900 dark:text-white">{scoreSamaptaCurrent} x 0.3 = {(scoreSamaptaCurrent * 0.3).toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-400">Wawancara (40%):</span>
                <span className="font-bold text-slate-900 dark:text-white">{calculatedWawancaraScore} x 0.4 = {(calculatedWawancaraScore * 0.4).toFixed(1)}</span>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-6">
              <button
                type="button"
                onClick={handleSave}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-900/30 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserCheck className="w-5 h-5" /> Simpan Penilaian Seleksi
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
