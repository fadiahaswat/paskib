import React, { useState } from 'react';
import { 
  Users, 
  Calendar, 
  CheckSquare, 
  ClipboardCheck, 
  TrendingUp, 
  Award, 
  AlertTriangle, 
  Plus, 
  ChevronRight, 
  Flame, 
  Database,
  ArrowUpRight,
  Sparkles,
  Save,
  Clock,
  MapPin,
  Target,
  BookOpen,
  ShieldCheck,
  Calculator,
  Lock,
  CheckCircle2,
  HeartPulse
} from 'lucide-react';

import { 
  INITIAL_PARTICIPANTS, 
  INITIAL_TRAINING_SESSIONS, 
  type Participant, 
  type TrainingSession 
} from './initialData';
import { 
  TAHAPAN_SELEKSI_BPIP,
  CALCULATE_BBI
} from './selectionStandards';
import { CatExamSimulator } from './components/CatExamSimulator';
import { SamaptaModule } from './components/SamaptaModule';
import { JuryAssessmentModule } from './components/JuryAssessmentModule';
import { ParticipantModal } from './components/ParticipantModal';

export function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'participants' | 'cat' | 'samapta' | 'jury' | 'training' | 'attendance' | 'assessment' | 'ranking' | 'standards' | 'settings'>('dashboard');
  const [participants, setParticipants] = useState<Participant[]>(() => {
    const saved = localStorage.getItem('paskibraka_participants');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_PARTICIPANTS;
  });
  const [sessions] = useState<TrainingSession[]>(INITIAL_TRAINING_SESSIONS);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  
  // Participant CRUD Modal
  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  
  // GAS Web App URL state
  const [gasUrl, setGasUrl] = useState<string>(() => localStorage.getItem('gas_api_url') || '');
  const [syncStatus, setSyncStatus] = useState<string>('Local Mode (Siap Sync Google Sheets)');

  // Standards Tab Sub-filter
  const [selectedStageId, setSelectedStageId] = useState<string>('all');
  
  // Interactive BBI Calculator State
  const [calcHeight, setCalcHeight] = useState<number>(172);
  const [calcWeight, setCalcWeight] = useState<number>(64);
  const bbiResult = CALCULATE_BBI(calcHeight);
  const isWeightSafe = calcWeight >= bbiResult.minSafe && calcWeight <= bbiResult.maxSafe;

  // Quick Attendance State
  const [selectedSessionId, setSelectedSessionId] = useState<string>(sessions[0]?.id || '');
  const [attendanceRecords, setAttendanceRecords] = useState<{ [id: string]: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa' | 'Terlambat' }>({
    "PAS-001": 'Hadir',
    "PAS-002": 'Hadir',
    "PAS-003": 'Hadir',
    "PAS-004": 'Hadir',
    "PAS-005": 'Terlambat',
    "PAS-006": 'Alpa'
  });

  // Assessment Input State
  const [assessmentForm, setAssessmentForm] = useState({
    participantId: "PAS-001",
    category: "Kesamaptaan",
    indicator: "Lari 12 Menit",
    rawMetric: "3050m (7 putaran + 250m)",
    score: 95,
    strength: "Kecepatan lap stabil di 1:38, pernapasan diafragma konsisten",
    weakness: "Akselerasi sprint lap terakhir baru dimulai di 1 menit sisa",
    recommendation: "Mulai all-out sprint di 2 menit terakhir tanda peluit juri"
  });

  // Calculate Dashboard Totals
  const activeCount = participants.length;
  const avgScore = (participants.reduce((acc, p) => acc + p.final_bpip_score, 0) / (activeCount || 1)).toFixed(1);
  const avgAttendance = Math.round(participants.reduce((acc, p) => acc + p.attendance_pct, 0) / (activeCount || 1));
  const readyCount = participants.filter(p => p.status === 'READY' || p.status === 'RECOMMENDED').length;
  const attentionParticipants = participants.filter(p => p.alerts.length > 0);

  const handleSaveParticipant = (participant: Participant) => {
    setParticipants(prev => {
      const exists = prev.some(p => p.id === participant.id);
      let updated: Participant[];
      if (exists) {
        updated = prev.map(p => p.id === participant.id ? participant : p);
      } else {
        updated = [participant, ...prev];
      }
      localStorage.setItem('paskibraka_participants', JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteParticipant = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Yakin ingin menghapus calon peserta ini dari database?')) {
      setParticipants(prev => {
        const updated = prev.filter(p => p.id !== id);
        localStorage.setItem('paskibraka_participants', JSON.stringify(updated));
        return updated;
      });
      if (selectedParticipant?.id === id) {
        setSelectedParticipant(null);
      }
    }
  };

  const handleUpdateSamapta = (participantId: string, samaptaData: {
    distance: number;
    pushUp: number;
    sitUp: number;
    shuttleRun: number;
    score: number;
  }) => {
    setParticipants(prev => {
      const updated = prev.map(p => {
        if (p.id === participantId) {
          const finalScore = Number(((p.score_pbb * 0.3) + (samaptaData.score * 0.3) + (p.score_wawancara * 0.4)).toFixed(1));
          return {
            ...p,
            lari_12m_distance: samaptaData.distance,
            push_up_count: samaptaData.pushUp,
            sit_up_count: samaptaData.sitUp,
            shuttle_run_time: samaptaData.shuttleRun,
            score_samapta: samaptaData.score,
            final_bpip_score: finalScore,
            latest_score: finalScore
          };
        }
        return p;
      });
      localStorage.setItem('paskibraka_participants', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSaveJuryScore = (participantId: string, scores: {
    scorePbb: number;
    scoreSamapta: number;
    scoreWawancara: number;
    finalBpipScore: number;
  }) => {
    setParticipants(prev => {
      const updated = prev.map(p => {
        if (p.id === participantId) {
          return {
            ...p,
            score_pbb: scores.scorePbb,
            score_samapta: scores.scoreSamapta,
            score_wawancara: scores.scoreWawancara,
            final_bpip_score: scores.finalBpipScore,
            latest_score: scores.finalBpipScore
          };
        }
        return p;
      });
      localStorage.setItem('paskibraka_participants', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSaveGasUrl = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('gas_api_url', gasUrl);
    setSyncStatus('URL Google Apps Script Disimpan!');
  };

  const handleAttendanceChange = (pId: string, status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa' | 'Terlambat') => {
    setAttendanceRecords(prev => ({ ...prev, [pId]: status }));
  };

  const handleSaveAttendance = async () => {
    if (!gasUrl) {
      alert('Presensi tersimpan lokal! (Hubungkan URL Google Apps Script di tab G-Sheets untuk sinkronisasi otomatis)');
      return;
    }
    try {
      setSyncStatus('Menyimpan ke Google Sheets...');
      const payload = {
        action: 'saveAttendance',
        trainingId: selectedSessionId,
        records: Object.entries(attendanceRecords).map(([pId, st]) => ({
          participantId: pId,
          status: st,
          notes: ''
        }))
      };
      await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        mode: 'no-cors'
      });
      setSyncStatus('Presensi berhasil disinkronkan ke Spreadsheet!');
      alert('Presensi berhasil dikirim ke Google Sheets!');
    } catch {
      alert('Gagal mengirim ke Google Sheets, periksa koneksi.');
    }
  };

  return (

    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 selection:bg-rose-500 selection:text-white">
      {/* Top Modern Command Bar */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-4 py-3 sm:px-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-red-500/25 ring-1 ring-white/20">
              P
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-white m-0">
                  PASKIBRAKA COMMAND CENTER
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  BPIP 2026
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Sistem Pemantauan Seleksi, Evaluasi Samapta & CAT Ideologi
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button 
              onClick={() => setActiveTab('standards')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5 text-emerald-400" />
              <span>Standar 8 Tahap</span>
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>G-Sheets Cloud</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs - Modern Pill Bar */}
        <div className="max-w-7xl mx-auto mt-3 pt-2 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
            { id: 'participants', label: 'Peserta & Odontogram', icon: Users },
            { id: 'cat', label: 'Simulasi CAT (TWK/TIU)', icon: Sparkles },
            { id: 'samapta', label: 'Samapta Jasmani', icon: HeartPulse },
            { id: 'jury', label: 'Rubrik Juri BPIP', icon: ClipboardCheck },
            { id: 'training', label: 'Program Latihan', icon: Calendar },
            { id: 'attendance', label: 'Presensi Lapangan', icon: CheckSquare },
            { id: 'ranking', label: 'Ranking Seleksi', icon: Award },
            { id: 'standards', label: 'Standar & Regulasi', icon: BookOpen },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); setSelectedParticipant(null); }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  isActive 
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-900/40 ring-1 ring-rose-400/30' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">

        {/* ================= DASHBOARD TAB ================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Peserta Aktif</span>
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-white mt-3">{activeCount}</div>
                <div className="text-xs text-slate-400 font-medium mt-1">Calon Paskibraka 2026</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rata-Rata BPIP</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-emerald-400 mt-3">{avgScore}</div>
                <div className="text-xs text-slate-400 font-medium mt-1">Formula 30:30:40</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kehadiran Latihan</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-amber-400 mt-3">{avgAttendance}%</div>
                <div className="text-xs text-slate-400 font-medium mt-1">Presensi Terverifikasi</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Siap Seleksi</span>
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-rose-400 mt-3">{readyCount}</div>
                <div className="text-xs text-slate-400 font-medium mt-1">Zona Unggulan / Ready</div>
              </div>
            </div>

            {/* Alert Box: Deteksi Titik Gugur & Warning BPIP */}
            <div className="bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-900 border border-red-500/30 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-red-500/20">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-red-500/20 text-red-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm text-white uppercase tracking-wider">
                      Deteksi Titik Gugur &amp; Peringatan Medis BPIP
                    </h2>
                    <p className="text-xs text-slate-400">Kasus kritis yang perlu tindakan perbaikan sebelum hari-H seleksi</p>
                  </div>
                </div>
                <span className="text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30 px-2.5 py-1 rounded-full">
                  {attentionParticipants.length} Kasus Perlu Evaluasi
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {attentionParticipants.map(p => (
                  <div key={p.id} className="bg-slate-900/90 border border-slate-800 hover:border-red-500/40 rounded-xl p-4 transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-sm text-white uppercase">{p.name}</span>
                        <span className="text-xs text-slate-400 block mt-0.5">Kelas {p.class} • Kehadiran {p.attendance_pct}%</span>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-800 text-rose-400 border border-rose-500/20">
                        {p.status}
                      </span>
                    </div>
                    <ul className="mt-2.5 space-y-1.5 pt-2 border-t border-slate-800">
                      {p.alerts.map((alt, idx) => (
                        <li key={idx} className="text-xs text-rose-300 font-medium flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0"></span>
                          {alt}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Progress & Program Latihan Hari Ini */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
                  <h2 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" /> Top Progress Pembinaan
                  </h2>
                  <span className="text-xs font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">7 Hari Terakhir</span>
                </div>
                <div className="space-y-2.5">
                  {participants.slice(0, 3).map((p, i) => (
                    <div key={p.id} className="border border-slate-800/80 hover:border-slate-700 p-3 rounded-xl flex justify-between items-center bg-slate-950/50 transition">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 font-black rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center text-xs">
                          0{i+1}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-white uppercase">{p.name}</p>
                          <p className="text-xs text-slate-400">Skor BPIP: <strong className="text-emerald-400">{p.final_bpip_score}</strong> • Readiness: {p.readiness_score}%</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold inline-flex items-center gap-0.5">
                          <ArrowUpRight className="w-3.5 h-3.5" /> +{p.score_change}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
                  <h2 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-rose-400" /> Sesi Latihan Hari Ini
                  </h2>
                  <button 
                    onClick={() => setActiveTab('attendance')}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    Buka Presensi
                  </button>
                </div>
                {sessions[0] && (
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20">
                        {sessions[0].category}
                      </span>
                      <span className="text-xs font-medium text-slate-400">{sessions[0].date}</span>
                    </div>
                    <h3 className="font-bold text-base text-white tracking-tight">{sessions[0].title}</h3>
                    <div className="mt-3 text-xs text-slate-400 space-y-1.5">
                      <p className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-500" /> {sessions[0].start_time} - {sessions[0].end_time} WIB
                      </p>
                      <p className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-500" /> {sessions[0].location}
                      </p>
                      <p className="flex items-center gap-2 text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800 mt-2">
                        <Target className="w-4 h-4 text-amber-400 shrink-0" /> Target: {sessions[0].target}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= PESERTA & ODONTOGRAM TAB ================= */}
        {activeTab === 'participants' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
              <div>
                <h2 className="font-extrabold text-lg text-white uppercase tracking-tight">Data Peserta &amp; Screening BPIP ({participants.length})</h2>
                <p className="text-xs text-slate-400 mt-0.5">Database antropometri, odontogram gigi, riwayat penyakit, dan audit akun media sosial calon terpilih.</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setEditingParticipant(null);
                    setIsParticipantModalOpen(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-900/30 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Tambah Calon Baru
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {participants.map(p => (
                <div 
                  key={p.id} 
                  onClick={() => setSelectedParticipant(p)}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 hover:shadow-xl rounded-2xl p-5 cursor-pointer transition transform hover:-translate-y-1 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between pb-3 border-b border-slate-800 mb-3">
                    <div>
                      <span className="font-bold text-sm text-white uppercase block truncate max-w-[200px]">{p.name}</span>
                      <span className="text-xs text-slate-400">{p.school} • Kls {p.class}</span>
                    </div>
                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${
                      p.status === 'RECOMMENDED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                      p.status === 'READY' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' :
                      p.status === 'NEAR READY' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                      p.status === 'PEMBINAAN KHUSUS' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {p.status}
                    </span>
                  </div>

                  {/* Metrik 3 Pilar BPIP */}
                  <div className="grid grid-cols-3 gap-2 text-center my-3 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                    <div>
                      <span className="text-[10px] font-medium text-slate-400 block uppercase">PBB (30%)</span>
                      <span className="text-xs font-black text-amber-400">{p.score_pbb}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-medium text-slate-400 block uppercase">SAMAPTA (30%)</span>
                      <span className="text-xs font-black text-emerald-400">{p.score_samapta}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-medium text-slate-400 block uppercase">WAWANCARA (40%)</span>
                      <span className="text-xs font-black text-cyan-400">{p.score_wawancara}</span>
                    </div>
                  </div>

                  {/* Status Odontogram & Screening Medis BPIP */}
                  <div className="text-xs font-medium text-slate-300 space-y-1.5 bg-slate-800/40 p-2.5 rounded-xl border border-slate-800/60 my-3">
                    <p className="flex justify-between text-[11px]">
                      <span>TB / BB: <strong className="text-white">{p.height}cm / {p.weight}kg</strong></span>
                      <span className={p.riwayat_penyakit_ya > 5 ? "text-rose-400 font-bold" : "text-emerald-400"}>
                        Sakit (Ya): {p.riwayat_penyakit_ya}/5
                      </span>
                    </p>
                    <p className="text-[11px] flex justify-between text-slate-400">
                      <span>Caries: <strong className="text-slate-200">{p.caries_dentis}</strong> (≤3)</span>
                      <span>Tumpatan: <strong className="text-slate-200">{p.tumpatan_gigi}</strong> (≤5)</span>
                      <span>Impaksi: <strong className="text-slate-200">{p.impaksi_gigi}</strong> (≤2)</span>
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-slate-400">Total BPIP: <strong className="text-emerald-400 text-sm font-black">{p.final_bpip_score}</strong></span>
                    <span className="font-semibold text-rose-400 hover:text-rose-300 flex items-center">
                      Detail Lengkap <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Detail Peserta Terintegrasi Odontogram & Samapta Detail */}
            {selectedParticipant && (
              <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-7 max-h-[92vh] overflow-y-auto shadow-2xl space-y-5">
                  <div className="flex justify-between items-start pb-4 border-b border-slate-800">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        {selectedParticipant.registration_number}
                      </span>
                      <h2 className="font-extrabold text-xl text-white uppercase mt-1.5">{selectedParticipant.name}</h2>
                      <p className="text-xs text-slate-400">Panggilan: {selectedParticipant.nickname} • Telp: {selectedParticipant.phone}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedParticipant(null)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Nilai Akhir BPIP (Formula 3 Pilar) */}
                    <div className="rounded-2xl border border-indigo-500/30 p-4 bg-gradient-to-br from-indigo-950/40 to-slate-900">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <span className="font-bold text-xs uppercase tracking-wider text-indigo-300 block">Nilai Akhir BPIP (Formula Seleksi)</span>
                          <span className="text-[10px] text-slate-400">Bobot: 30% PBB + 30% Samapta + 40% Wawancara</span>
                        </div>
                        <span className="font-black text-2xl text-emerald-400 px-3 py-1 bg-slate-900 rounded-xl border border-slate-800">
                          {selectedParticipant.final_bpip_score}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                        <div className="text-amber-400">PBB: {selectedParticipant.score_pbb} (30%)</div>
                        <div className="text-emerald-400">Samapta: {selectedParticipant.score_samapta} (30%)</div>
                        <div className="text-cyan-400">Wawancara: {selectedParticipant.score_wawancara} (40%)</div>
                      </div>
                    </div>

                    {/* Rincian Samapta Format BPIP Modal */}
                    <div className="border border-slate-800 rounded-2xl p-4 bg-slate-950/60">
                      <h3 className="font-bold text-xs uppercase mb-3 text-slate-300 flex items-center gap-2">
                        <HeartPulse className="w-4 h-4 text-rose-500" /> Hasil Fisik Samapta (Format BPIP)
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-semibold">
                        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center">
                          <span className="text-[10px] text-slate-400 block">Push-Up (1 Mnt)</span>
                          <span className="text-sm font-bold text-white mt-1 block">{selectedParticipant.push_up_count} kali</span>
                          <span className="text-[10px] text-emerald-400">≥40x Aman</span>
                        </div>
                        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center">
                          <span className="text-[10px] text-slate-400 block">Sit-Up (1 Mnt)</span>
                          <span className="text-sm font-bold text-white mt-1 block">{selectedParticipant.sit_up_count} kali</span>
                          <span className="text-[10px] text-emerald-400">≥40x Aman</span>
                        </div>
                        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center">
                          <span className="text-[10px] text-slate-400 block">Shuttle Run</span>
                          <span className="text-sm font-bold text-white mt-1 block">{selectedParticipant.shuttle_run_time}s</span>
                          <span className="text-[10px] text-emerald-400">&lt;16.0s Target</span>
                        </div>
                        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center">
                          <span className="text-[10px] text-slate-400 block">Lari 12 Menit</span>
                          <span className="text-sm font-bold text-white mt-1 block">{selectedParticipant.lari_12m_distance}m</span>
                          <span className="text-[10px] text-emerald-400">Target 3.000m</span>
                        </div>
                      </div>
                    </div>

                    {/* Odontogram & Screening Medis BPIP */}
                    <div className="border border-slate-800 rounded-2xl p-4 bg-slate-950/60">
                      <h3 className="font-bold text-xs uppercase mb-3 text-slate-300">
                        Odontogram Gigi &amp; Screening Medis
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-medium mb-3">
                        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">CARIES DENTIS</span>
                          <span className={selectedParticipant.caries_dentis <= 3 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                            {selectedParticipant.caries_dentis} gigi (Maks ≤3)
                          </span>
                        </div>
                        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">TUMPATAN GIGI</span>
                          <span className={selectedParticipant.tumpatan_gigi <= 5 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                            {selectedParticipant.tumpatan_gigi} gigi (Maks ≤5)
                          </span>
                        </div>
                        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">IMPAKSI GIGI</span>
                          <span className={selectedParticipant.impaksi_gigi <= 2 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                            {selectedParticipant.impaksi_gigi} gigi (Maks ≤2)
                          </span>
                        </div>
                        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">GIGI DEPAN TANGGAL</span>
                          <span className={!selectedParticipant.kehilangan_gigi_depan ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                            {selectedParticipant.kehilangan_gigi_depan ? "ADA (GUGUR)" : "TIDAK ADA"}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex justify-between items-center">
                        <span className="text-slate-300">Total Riwayat Penyakit (YA): <strong className="text-white">{selectedParticipant.riwayat_penyakit_ya}</strong></span>
                        <span className={selectedParticipant.riwayat_penyakit_ya <= 5 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                          {selectedParticipant.riwayat_penyakit_ya <= 5 ? "Verifikasi Medis Lolos" : "TERKUNCI MELEBIHI 5"}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons: Edit & Hapus */}
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={(e) => handleDeleteParticipant(selectedParticipant.id, e)}
                        className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs rounded-xl transition cursor-pointer"
                      >
                        Hapus Peserta
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingParticipant(selectedParticipant);
                          setIsParticipantModalOpen(true);
                          setSelectedParticipant(null);
                        }}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-md cursor-pointer"
                      >
                        Edit Data Peserta
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= PRESENSI LAPANGAN TAB ================= */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4 mb-4">
                <div>
                  <h2 className="font-extrabold text-lg text-white uppercase tracking-tight">Presensi Lapangan Cepat (Mobile-First)</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Tandai status kehadiran setiap peserta latihan lalu sinkronkan langsung ke database.</p>
                </div>
                <div className="w-full sm:w-auto">
                  <select 
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    className="w-full sm:w-auto bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2 text-xs font-semibold"
                  >
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>{s.date} - {s.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2.5">
                {participants.map(p => {
                  const currentStatus = attendanceRecords[p.id] || 'Hadir';
                  return (
                    <div key={p.id} className="bg-slate-950/60 border border-slate-800 hover:border-slate-700 p-3.5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition">
                      <div>
                        <span className="font-bold text-sm text-white uppercase">{p.name}</span>
                        <span className="text-xs text-slate-400 block mt-0.5">Kelas {p.class} • No. {p.registration_number}</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                        {(['Hadir', 'Izin', 'Sakit', 'Alpa', 'Terlambat'] as const).map(st => {
                          const isSelected = currentStatus === st;
                          let btnStyle = 'bg-slate-800/60 text-slate-400 hover:text-white border-transparent';
                          if (isSelected) {
                            if (st === 'Hadir') btnStyle = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm';
                            else if (st === 'Izin') btnStyle = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm';
                            else if (st === 'Sakit') btnStyle = 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm';
                            else if (st === 'Alpa') btnStyle = 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm';
                            else if (st === 'Terlambat') btnStyle = 'bg-orange-500/20 text-orange-300 border-orange-500/50 shadow-sm';
                          }
                          return (
                            <button
                              key={st}
                              type="button"
                              onClick={() => handleAttendanceChange(p.id, st)}
                              className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition cursor-pointer ${btnStyle}`}
                            >
                              {st}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <span className="text-xs text-slate-400 font-medium">{syncStatus}</span>
                <button 
                  onClick={handleSaveAttendance}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Simpan Presensi Hari Ini
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= INPUT TES & NILAI TAB ================= */}
        {activeTab === 'assessment' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 brutal-card bg-white p-5">
                <div className="border-b-3 border-black pb-3 mb-4">
                  <h2 className="font-black text-xl uppercase tracking-tight">Input Nilai &amp; Metrik Mentah (Raw Metric)</h2>
                  <p className="text-xs font-bold text-gray-600">Simpan jarak tempuh lari (meter + lap), repetisi push up, dan catatan evaluasi.</p>
                </div>

                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert('Nilai berhasil disimpan!'); }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-black uppercase block mb-1">Peserta</label>
                      <select 
                        value={assessmentForm.participantId}
                        onChange={(e) => setAssessmentForm({ ...assessmentForm, participantId: e.target.value })}
                        className="brutal-input text-xs font-bold"
                      >
                        {participants.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.class})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase block mb-1">Kategori Tes</label>
                      <select 
                        value={assessmentForm.category}
                        onChange={(e) => setAssessmentForm({ ...assessmentForm, category: e.target.value })}
                        className="brutal-input text-xs font-bold"
                      >
                        <option value="Kesamaptaan">Kesamaptaan (Fisik Militer)</option>
                        <option value="PBB">PBB &amp; Baris-Berbaris</option>
                        <option value="Postur &amp; Penampilan">Parade &amp; Antropometri</option>
                        <option value="Disiplin">Kepribadian &amp; Disiplin</option>
                        <option value="Mental &amp; Kepribadian">Mental &amp; Wawancara STAR</option>
                        <option value="Wawasan">PIP (TWK) &amp; TIU</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-black uppercase block mb-1">Indikator</label>
                      <input 
                        type="text" 
                        value={assessmentForm.indicator}
                        onChange={(e) => setAssessmentForm({ ...assessmentForm, indicator: e.target.value })}
                        className="brutal-input text-xs" 
                        placeholder="Misal: Lari 12 Menit / Push-Up"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase block mb-1">Hasil Mentah (Raw Data BPIP)</label>
                      <input 
                        type="text" 
                        value={assessmentForm.rawMetric}
                        onChange={(e) => setAssessmentForm({ ...assessmentForm, rawMetric: e.target.value })}
                        className="brutal-input text-xs" 
                        placeholder="Contoh: 3000m (7 lap + 200m) / 42 kali"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase block mb-1">Skor Konversi (0-100)</label>
                      <input 
                        type="number" 
                        min="0"
                        max="100"
                        value={assessmentForm.score}
                        onChange={(e) => setAssessmentForm({ ...assessmentForm, score: Number(e.target.value) })}
                        className="brutal-input text-xs font-black" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase block mb-1">Kelebihan Gerakan / Performa</label>
                    <input 
                      type="text" 
                      value={assessmentForm.strength}
                      onChange={(e) => setAssessmentForm({ ...assessmentForm, strength: e.target.value })}
                      className="brutal-input text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase block mb-1">Perlu Diperbaiki (Kekurangan)</label>
                    <input 
                      type="text" 
                      value={assessmentForm.weakness}
                      onChange={(e) => setAssessmentForm({ ...assessmentForm, weakness: e.target.value })}
                      className="brutal-input text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase block mb-1">Rekomendasi Latihan Khusus</label>
                    <input 
                      type="text" 
                      value={assessmentForm.recommendation}
                      onChange={(e) => setAssessmentForm({ ...assessmentForm, recommendation: e.target.value })}
                      className="brutal-input text-xs"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="brutal-btn bg-[#FFE500] text-black w-full flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" /> SIMPAN PENILAIAN PESERTA
                  </button>
                </form>
              </div>

              {/* Rubrik Panduan Cepat Standar BPIP */}
              <div className="brutal-card bg-[#FEF08A] p-5">
                <h3 className="font-black text-sm uppercase border-b-2 border-black pb-2 mb-3">
                  Benchmark Target Nilai 100 BPIP
                </h3>
                <div className="space-y-2 text-xs font-bold">
                  <div className="p-2 border-2 border-black bg-[#A3E635]">
                    <span className="font-black">Samapta A: Lari 12 Menit</span>
                    <p className="text-[11px] font-semibold">Putra ≥ 3.000 - 3.200m (7.5-8 lap)</p>
                    <p className="text-[11px] font-semibold">Putri ≥ 2.300 - 2.400m (5.5-6 lap)</p>
                  </div>
                  <div className="p-2 border-2 border-black bg-white">
                    <span className="font-black">Push-Up (1 Menit)</span>
                    <p className="text-[11px] font-semibold">Putra ≥ 42 kali (sempurna dada rata)</p>
                    <p className="text-[11px] font-semibold">Putri ≥ 37 kali (tumpuan lutut)</p>
                  </div>
                  <div className="p-2 border-2 border-black bg-white">
                    <span className="font-black">Sit-Up (1 Menit)</span>
                    <p className="text-[11px] font-semibold">Putra ≥ 41 kali | Putri ≥ 42 kali</p>
                  </div>
                  <div className="p-2 border-2 border-black bg-[#FBBF24]">
                    <span className="font-black">Back-Up (1 Menit)</span>
                    <p className="text-[11px] font-semibold">Putra ≥ 40 kali | Putri ≥ 35 kali</p>
                  </div>
                  <div className="p-2 border-2 border-black bg-[#67E8F9]">
                    <span className="font-black">Shuttle Run (3x angka 8)</span>
                    <p className="text-[11px] font-semibold">Putra &lt; 16.0 detik | Putri &lt; 17.0 detik</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= RANKING TINGKAT KOTA / PROVINSI (FORMULA RESMI BPIP) ================= */}
        {activeTab === 'ranking' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4 mb-5">
                <div>
                  <h2 className="font-extrabold text-xl text-white uppercase tracking-tight">
                    Klasemen &amp; Ranking Resmi Seleksi BPIP
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Formula Terpadu = <strong className="text-amber-400">PBB 30%</strong> + <strong className="text-emerald-400">Samapta 30%</strong> + <strong className="text-cyan-400">Kepribadian &amp; Wawancara 40%</strong>.
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Standar Kelulusan Kota &amp; Provinsi
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950/80 text-slate-400 text-xs uppercase font-bold border-b border-slate-800">
                      <th className="p-3.5">Rank</th>
                      <th className="p-3.5">Nama Peserta</th>
                      <th className="p-3.5">Kelas</th>
                      <th className="p-3.5 text-center">PBB (30%)</th>
                      <th className="p-3.5 text-center">Samapta (30%)</th>
                      <th className="p-3.5 text-center">Wawancara (40%)</th>
                      <th className="p-3.5 text-center">Nilai Akhir BPIP</th>
                      <th className="p-3.5 text-center">Kesiapan</th>
                      <th className="p-3.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-medium divide-y divide-slate-800/80 bg-slate-900/60">
                    {participants
                      .slice()
                      .sort((a, b) => b.final_bpip_score - a.final_bpip_score)
                      .map((p, idx) => (
                        <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5 font-bold">
                            <span className={`w-7 h-7 rounded-lg inline-flex items-center justify-center font-black ${
                              idx === 0 ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20' :
                              idx === 1 ? 'bg-slate-300 text-slate-950' :
                              idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {idx + 1}
                            </span>
                          </td>
                          <td className="p-3.5 font-bold text-white uppercase">
                            {p.name}
                          </td>
                          <td className="p-3.5 text-slate-400">{p.class}</td>
                          <td className="p-3.5 text-center font-bold text-amber-400">{p.score_pbb}</td>
                          <td className="p-3.5 text-center font-bold text-emerald-400">{p.score_samapta}</td>
                          <td className="p-3.5 text-center font-bold text-cyan-400">{p.score_wawancara}</td>
                          <td className="p-3.5 text-center font-black text-sm text-emerald-300 bg-emerald-950/20">
                            {p.final_bpip_score}
                          </td>
                          <td className="p-3.5 text-center font-bold text-emerald-400">
                            {p.readiness_score}%
                          </td>
                          <td className="p-3.5 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              p.status === 'RECOMMENDED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                              p.status === 'READY' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' :
                              p.status === 'NEAR READY' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                              p.status === 'PEMBINAAN KHUSUS' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= STANDAR, AMBANG BATAS & STRATEGI BPIP TAB ================= */}
        {activeTab === 'standards' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-800 pb-4 mb-5">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-1 inline-flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> STANDAR TRANSPARANSI BPIP
                  </span>
                  <h2 className="font-extrabold text-xl text-white uppercase tracking-tight mt-1">
                    Rincian Teknis, Ambang Batas &amp; Strategi Lolos 100
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Panduan resmi 8 tahapan seleksi nasional berdasar regulasi BPIP &amp; petunjuk teknis juri lapangan.
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Gugur Otomatis Jika di Bawah Ambang
                  </span>
                </div>
              </div>

              {/* Kalkulator Cepat IMT & Berat Badan Ideal (BBI) Militer */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 mb-6">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
                  <Calculator className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-sm text-white uppercase tracking-wide">
                    Simulasi Antropometri Parade: Rumus BBI Proporsional (TB - 100) x 90% (±5 kg)
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Tinggi Badan (cm)</label>
                    <input 
                      type="number" 
                      value={calcHeight} 
                      onChange={(e) => setCalcHeight(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm font-bold text-white outline-none focus:border-rose-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Putra: 170-180 | Putri: 165-175</span>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Berat Badan Aktual (kg)</label>
                    <input 
                      type="number" 
                      value={calcWeight} 
                      onChange={(e) => setCalcWeight(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm font-bold text-white outline-none focus:border-rose-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Toleransi maks ±5 kg</span>
                  </div>
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Target BBI Murni</span>
                    <span className="text-xl font-black text-amber-400">{bbiResult.bbi} kg</span>
                    <span className="text-[10px] text-slate-500 block">Rentang: {bbiResult.minSafe} - {bbiResult.maxSafe} kg</span>
                  </div>
                  <div>
                    <div className={`p-3 rounded-xl border text-center font-bold text-xs uppercase ${
                      isWeightSafe ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    }`}>
                      {isWeightSafe ? 'STATUS: AMAN (MEMENUHI SYARAT)' : 'STATUS: PERLU CUTTING / BULKING'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stage Filter Buttons */}
              <div className="flex flex-wrap gap-1.5 mb-5">
                <button
                  onClick={() => setSelectedStageId('all')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                    selectedStageId === 'all' ? 'bg-rose-600 text-white border-rose-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  Semua 8 Tahapan
                </button>
                {TAHAPAN_SELEKSI_BPIP.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStageId(s.id)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                      selectedStageId === s.id ? 'bg-rose-600 text-white border-rose-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    {s.id.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Stage Cards Grid */}
              <div className="space-y-4">
                {TAHAPAN_SELEKSI_BPIP
                  .filter(s => selectedStageId === 'all' || selectedStageId === s.id)
                  .map(stage => (
                    <div key={stage.id} className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3 mb-3">
                        <div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold mr-2 ${
                            stage.sifatKelulusan === 'Gugur Otomatis (Locked)' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                            stage.sifatKelulusan === 'Objektif Medis' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' :
                            stage.sifatKelulusan === 'Pemeringkatan Kuota' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-purple-500/10 text-purple-400'
                          }`}>
                            {stage.sifatKelulusan}
                          </span>
                          <h3 className="font-bold text-base text-white tracking-tight mt-1 inline-block">
                            {stage.namaTahap}
                          </h3>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] text-slate-400 block">Ambang Batas (Passing Grade):</span>
                          <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold">
                            {stage.passingGrade}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-400 mb-4 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                        <strong className="text-slate-300">Metode Sistem:</strong> {stage.sistemUjian}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border border-rose-500/20 rounded-xl p-3.5 bg-rose-950/20">
                          <span className="font-bold text-xs uppercase text-rose-300 flex items-center gap-1.5 mb-2 pb-1.5 border-b border-rose-500/20">
                            <AlertTriangle className="w-4 h-4 text-rose-400" /> Parameter Penilaian &amp; Titik Gugur
                          </span>
                          <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4">
                            {stage.parameterKritis.map((param, i) => (
                              <li key={i}>{param}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="border border-emerald-500/20 rounded-xl p-3.5 bg-emerald-950/20">
                          <span className="font-bold text-xs uppercase text-emerald-300 flex items-center gap-1.5 mb-2 pb-1.5 border-b border-emerald-500/20">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Trik Rahasia Menembus Nilai 100
                          </span>
                          <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4">
                            {stage.trikLolos100.map((trik, i) => (
                              <li key={i}>{trik}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

            </div>
          </div>
        )}

        {/* ================= PROGRAM LATIHAN TAB ================= */}
        {activeTab === 'training' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
              <div>
                <h2 className="font-extrabold text-lg text-white uppercase tracking-tight">Agenda Program Latihan ({sessions.length})</h2>
                <p className="text-xs text-slate-400 mt-0.5">Jadwal pembinaan fisik, drill PBB, dan simulasi pos seleksi.</p>
              </div>
              <button 
                onClick={() => alert('Fitur Tambah Sesi Latihan')}
                className="px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-pink-900/30"
              >
                <Plus className="w-4 h-4" /> Tambah Sesi
              </button>
            </div>

            <div className="space-y-4">
              {sessions.map(s => (
                <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition">
                  <div className="flex justify-between items-start border-b border-slate-800 pb-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20">{s.category}</span>
                      <h3 className="font-bold text-base text-white tracking-tight">{s.title}</h3>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg border border-slate-700">
                      {s.date}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium text-slate-300">
                    <div className="space-y-2">
                      <p className="flex items-center gap-2 text-slate-400">
                        <Clock className="w-4 h-4 text-slate-500" /> {s.start_time} - {s.end_time} WIB
                      </p>
                      <p className="flex items-center gap-2 text-slate-400">
                        <MapPin className="w-4 h-4 text-slate-500" /> {s.location}
                      </p>
                      <div className="mt-2 text-slate-200 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                        <strong className="text-amber-400">Target:</strong> {s.target}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-slate-400"><strong className="text-slate-200">Deskripsi:</strong> {s.description}</p>
                      <div className="italic bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-slate-400">
                        <strong className="text-slate-300 not-italic">Catatan Pelatih:</strong> "{s.coach_notes}"
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= GOOGLE SHEETS & SETTINGS TAB ================= */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="border-b border-slate-800 pb-4 mb-5">
                <h2 className="font-extrabold text-xl text-white uppercase tracking-tight flex items-center gap-2">
                  <Database className="w-5 h-5 text-cyan-400" /> Integrasi Database Google Sheets Cloud
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Hubungkan URL Google Apps Script Web App agar seluruh data presensi, nilai seleksi, dan data calon otomatis tersimpan ke Spreadsheet Anda.
                </p>
              </div>

              <form onSubmit={handleSaveGasUrl} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Google Apps Script Web App URL:
                  </label>
                  <input 
                    type="url" 
                    value={gasUrl}
                    onChange={(e) => setGasUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-cyan-500 font-mono"
                  />
                  <span className="text-[11px] text-slate-500 mt-1.5 block">
                    File skrip GAS tersedia di: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300 font-mono">gas/Code.gs</code>
                  </span>
                </div>

                <div className="flex gap-2.5">
                  <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-md shadow-emerald-900/30">
                    Simpan URL API
                  </button>
                  <button 
                    type="button" 
                    onClick={() => alert('Skrip GAS di file gas/Code.gs siap dicopy ke Tools > Script Editor di Google Sheets Anda.')}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer border border-slate-700"
                  >
                    Petunjuk Pemasangan GAS
                  </button>
                </div>
              </form>

              <div className="mt-6 border-t border-slate-800 pt-5">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3">Langkah Pemasangan Google Sheets:</h3>
                <ol className="text-xs font-medium space-y-2 list-decimal pl-5 text-slate-300">
                  <li>Buka <a href="https://sheets.new" target="_blank" rel="noreferrer" className="underline text-cyan-400 font-bold">Google Sheets</a> baru Anda.</li>
                  <li>Klik menu <strong>Extensions &gt; Apps Script</strong>.</li>
                  <li>Copy seluruh isi file <code className="bg-slate-800 px-1 rounded text-amber-300">gas/Code.gs</code> dan paste ke editor Apps Script.</li>
                  <li>Jalankan fungsi <code className="bg-slate-800 px-1 rounded text-amber-300">setupDatabase()</code> satu kali (akan otomatis membuat semua sheet &amp; header).</li>
                  <li>Klik <strong>Deploy &gt; New deployment &gt; Select type: Web app</strong>.</li>
                  <li>Set <em>Execute as: Me</em> dan <em>Who has access: Anyone</em>, lalu klik <strong>Deploy</strong>.</li>
                  <li>Copy Web App URL dan tempelkan pada kolom di atas!</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* ================= SIMULASI CAT TAB ================= */}
        {activeTab === 'cat' && (
          <CatExamSimulator />
        )}

        {/* ================= SAMAPTA JASMANI TAB ================= */}
        {activeTab === 'samapta' && (
          <SamaptaModule 
            participants={participants} 
            onUpdateParticipantSamapta={handleUpdateSamapta} 
          />
        )}

        {/* ================= RUBRIK JURI BPIP TAB ================= */}
        {activeTab === 'jury' && (
          <JuryAssessmentModule 
            participants={participants} 
            onSaveJuryScore={handleSaveJuryScore} 
          />
        )}

      </main>

      {/* Modal Tambah / Edit Peserta */}
      <ParticipantModal
        isOpen={isParticipantModalOpen}
        initialData={editingParticipant}
        onClose={() => setIsParticipantModalOpen(false)}
        onSave={handleSaveParticipant}
      />
    </div>
  );
}

export default App;
