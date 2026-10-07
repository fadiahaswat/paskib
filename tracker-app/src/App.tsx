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
  Globe,
  Share2,
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

export function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'participants' | 'training' | 'attendance' | 'assessment' | 'ranking' | 'standards' | 'settings'>('dashboard');
  const [participants] = useState<Participant[]>(INITIAL_PARTICIPANTS);
  const [sessions] = useState<TrainingSession[]>(INITIAL_TRAINING_SESSIONS);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  
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

    <div className="min-h-screen bg-[#F4F4F0] text-black pb-20">
      {/* Top Brutalist Header */}
      <header className="bg-[#FFE500] border-b-4 border-black px-4 py-3 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-3">
            <div className="bg-black text-[#FFE500] font-black text-xl px-3 py-1 border-2 border-black shadow-[3px_3px_0px_#000]">
              PASKIBRAKA
            </div>
            <div>
              <h1 className="font-black text-lg sm:text-xl uppercase tracking-tight leading-none m-0">
                Training & Selection Tracker
              </h1>
              <p className="text-xs font-bold text-black uppercase tracking-wider mt-0.5">
                Dashboard Pelatih • Pembinaan Kota &amp; Portal Resmi BPIP
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setActiveTab('standards')}
              className="brutal-badge bg-[#A3E635] text-black cursor-pointer hover:bg-lime-400 flex items-center"
            >
              <Flame className="w-3.5 h-3.5 mr-1" /> STANDAR BPIP 8 TAHAP
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className="brutal-btn bg-white hover:bg-[#F3F4F6] text-xs py-1 px-2.5 flex items-center gap-1.5"
            >
              <Database className="w-3.5 h-3.5" />
              <span>G-Sheets</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs - Brutalism Bar */}
      <nav className="bg-white border-b-4 border-black sticky top-0 z-30 overflow-x-auto shadow-[0_4px_0_#000]">
        <div className="max-w-6xl mx-auto flex items-center gap-1 px-3 py-2 min-w-max">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: TrendingUp, color: '#FFE500' },
            { id: 'participants', label: 'Peserta & Odontogram', icon: Users, color: '#67E8F9' },
            { id: 'training', label: 'Program Latihan', icon: Calendar, color: '#F472B6' },
            { id: 'attendance', label: 'Presensi Lapangan', icon: CheckSquare, color: '#A3E635' },
            { id: 'assessment', label: 'Input Nilai & Samapta', icon: ClipboardCheck, color: '#FBBF24' },
            { id: 'ranking', label: 'Ranking Formula BPIP', icon: Award, color: '#C084FC' },
            { id: 'standards', label: 'Ambang Batas & Strategi', icon: BookOpen, color: '#FDE047' },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); setSelectedParticipant(null); }}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-black uppercase tracking-wider border-2 border-black transition-transform cursor-pointer ${
                  isActive 
                    ? 'shadow-[3px_3px_0px_#000] -translate-y-0.5' 
                    : 'bg-[#F4F4F0] hover:bg-[#E5E5DF]'
                }`}
                style={{ backgroundColor: isActive ? tab.color : undefined }}
              >
                <Icon className="w-4 h-4 stroke-[2.5]" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">

        {/* ================= DASHBOARD TAB ================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="brutal-card bg-[#67E8F9] p-4">
                <span className="text-xs font-black uppercase tracking-wider block">Peserta Aktif</span>
                <span className="text-4xl font-black block mt-1">{activeCount}</span>
                <span className="text-xs font-bold mt-1 inline-block bg-black text-white px-2 py-0.5">Mu'allimin 2026</span>
              </div>
              <div className="brutal-card bg-[#A3E635] p-4">
                <span className="text-xs font-black uppercase tracking-wider block">Rata-Rata BPIP</span>
                <span className="text-4xl font-black block mt-1">{avgScore}</span>
                <span className="text-xs font-bold mt-1 inline-block bg-black text-[#A3E635] px-2 py-0.5">Bobot 40:30:30</span>
              </div>
              <div className="brutal-card bg-[#FFE500] p-4">
                <span className="text-xs font-black uppercase tracking-wider block">Kehadiran</span>
                <span className="text-4xl font-black block mt-1">{avgAttendance}%</span>
                <span className="text-xs font-bold mt-1 inline-block bg-black text-[#FFE500] px-2 py-0.5">Konsisten</span>
              </div>
              <div className="brutal-card bg-[#F472B6] p-4">
                <span className="text-xs font-black uppercase tracking-wider block">Siap Seleksi</span>
                <span className="text-4xl font-black block mt-1">{readyCount}</span>
                <span className="text-xs font-bold mt-1 inline-block bg-black text-white px-2 py-0.5">Ready / Recommended</span>
              </div>
            </div>

            {/* Alert Box: Deteksi Titik Gugur & Warning BPIP */}
            <div className="brutal-card bg-[#FF6B6B] p-5 text-white">
              <div className="flex items-center justify-between mb-3 border-b-2 border-black pb-2 text-black bg-white px-3 py-1.5 shadow-[2px_2px_0px_#000]">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 fill-red-600" />
                  <h2 className="font-black text-sm uppercase tracking-wide">
                    Deteksi Titik Gugur &amp; Peringatan BPIP (Perlu Tindakan Pelatih)
                  </h2>
                </div>
                <span className="text-xs font-black bg-red-600 text-white px-2 py-0.5 border border-black">
                  {attentionParticipants.length} Kasus Kritis
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-black">
                {attentionParticipants.map(p => (
                  <div key={p.id} className="bg-white border-2 border-black p-3 shadow-[3px_3px_0px_#000]">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-black text-sm uppercase">{p.name}</span>
                        <span className="text-xs font-bold text-gray-700 block">Kelas {p.class} • Kehadiran {p.attendance_pct}%</span>
                      </div>
                      <span className="brutal-badge bg-black text-white text-[10px]">{p.status}</span>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {p.alerts.map((alt, idx) => (
                        <li key={idx} className="text-xs font-bold text-red-600 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-red-600 rounded-full inline-block flex-shrink-0"></span>
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
              <div className="brutal-card bg-white p-5">
                <div className="flex justify-between items-center mb-4 border-b-2 border-black pb-2">
                  <h2 className="font-black text-base uppercase flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-500 fill-yellow-400" /> Top Progress Pembinaan
                  </h2>
                  <span className="text-xs font-bold bg-yellow-200 border border-black px-2 py-0.5">7 Hari Terakhir</span>
                </div>
                <div className="space-y-3">
                  {participants.slice(0, 3).map((p, i) => (
                    <div key={p.id} className="border-2 border-black p-3 flex justify-between items-center bg-[#FDFBF7] shadow-[2px_2px_0px_#000]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 font-black bg-[#FFE500] border-2 border-black flex items-center justify-center text-sm shadow-[1px_1px_0_#000]">
                          0{i+1}
                        </div>
                        <div>
                          <p className="font-black text-sm uppercase">{p.name}</p>
                          <p className="text-xs font-bold text-gray-600">Skor BPIP: {p.final_bpip_score} • Readiness: {p.readiness_score}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="brutal-badge bg-[#A3E635] text-black flex items-center gap-0.5">
                          <ArrowUpRight className="w-3.5 h-3.5 stroke-[3]" /> +{p.score_change}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="brutal-card bg-[#FEF08A] p-5">
                <div className="flex justify-between items-center mb-4 border-b-2 border-black pb-2">
                  <h2 className="font-black text-base uppercase flex items-center gap-2">
                    <Calendar className="w-5 h-5" /> Sesi Latihan Hari Ini
                  </h2>
                  <button 
                    onClick={() => setActiveTab('attendance')}
                    className="brutal-btn bg-black text-white text-xs py-1 px-2 font-black"
                  >
                    Buka Presensi
                  </button>
                </div>
                {sessions[0] && (
                  <div className="bg-white border-3 border-black p-4 shadow-[4px_4px_0_#000]">
                    <div className="flex justify-between items-start mb-2">
                      <span className="brutal-badge bg-[#F472B6] text-black">{sessions[0].category}</span>
                      <span className="font-bold text-xs bg-black text-white px-2 py-0.5">{sessions[0].date}</span>
                    </div>
                    <h3 className="font-black text-lg uppercase tracking-tight">{sessions[0].title}</h3>
                    <div className="mt-2 text-xs font-bold text-gray-800 space-y-1">
                      <p className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" /> {sessions[0].start_time} - {sessions[0].end_time} WIB
                      </p>
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" /> {sessions[0].location}
                      </p>
                      <p className="flex items-center gap-1.5 text-black bg-yellow-100 p-1.5 border border-black mt-2">
                        <Target className="w-4 h-4 flex-shrink-0" /> Target: {sessions[0].target}
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white border-3 border-black p-4 shadow-[4px_4px_0px_#000]">
              <div>
                <h2 className="font-black text-xl uppercase tracking-tight">Data Peserta &amp; Screening BPIP ({participants.length})</h2>
                <p className="text-xs font-bold text-gray-600">Database antropometri, odontogram gigi, riwayat penyakit, dan audit akun media sosial.</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => alert('Fitur Tambah Peserta Baru')}
                  className="brutal-btn bg-[#FFE500] text-black text-xs flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 stroke-[3]" /> Tambah Peserta
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {participants.map(p => (
                <div 
                  key={p.id} 
                  onClick={() => setSelectedParticipant(p)}
                  className={`brutal-card p-4 cursor-pointer hover:-translate-y-1 transition-transform ${
                    p.status === 'RECOMMENDED' ? 'bg-[#ECFDF5]' : 
                    p.status === 'READY' ? 'bg-[#F0FDF4]' : 
                    p.status === 'PEMBINAAN KHUSUS' ? 'bg-[#FEF2F2]' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between border-b-2 border-black pb-2 mb-3">
                    <div>
                      <span className="font-black text-sm uppercase block truncate max-w-[190px]">{p.name}</span>
                      <span className="text-xs font-bold text-gray-600">{p.school} • Kls {p.class}</span>
                    </div>
                    <span className={`brutal-badge ${
                      p.status === 'RECOMMENDED' ? 'bg-[#10B981] text-white' :
                      p.status === 'READY' ? 'bg-[#22C55E] text-black' :
                      p.status === 'NEAR READY' ? 'bg-[#FBBF24] text-black' :
                      p.status === 'PEMBINAAN KHUSUS' ? 'bg-[#EF4444] text-white' : 'bg-gray-200 text-black'
                    }`}>
                      {p.status}
                    </span>
                  </div>

                  {/* Metrik 3 Pilar BPIP */}
                  <div className="grid grid-cols-3 gap-1.5 text-center my-2 bg-black text-white p-2 border-2 border-black">
                    <div>
                      <span className="text-[9px] font-bold text-gray-300 block uppercase">PBB (30%)</span>
                      <span className="text-xs font-black text-[#FFE500]">{p.score_pbb}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-gray-300 block uppercase">SAMAPTA (30%)</span>
                      <span className="text-xs font-black text-[#A3E635]">{p.score_samapta}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-gray-300 block uppercase">WAWANCARA (40%)</span>
                      <span className="text-xs font-black text-[#67E8F9]">{p.score_wawancara}</span>
                    </div>
                  </div>

                  {/* Status Odontogram & Screening Medis BPIP */}
                  <div className="text-xs font-bold text-gray-800 space-y-1 bg-yellow-50 p-2 border border-black my-2">
                    <p className="flex justify-between text-[11px]">
                      <span>TB / BB: <strong>{p.height}cm / {p.weight}kg</strong></span>
                      <span className={p.riwayat_penyakit_ya > 5 ? "text-red-600 font-black" : "text-gray-700"}>
                        Sakit (Ya): {p.riwayat_penyakit_ya}/5
                      </span>
                    </p>
                    <p className="text-[11px] flex justify-between">
                      <span>Caries: <strong>{p.caries_dentis}</strong> (≤3)</span>
                      <span>Tumpatan: <strong>{p.tumpatan_gigi}</strong> (≤5)</span>
                      <span>Impaksi: <strong>{p.impaksi_gigi}</strong> (≤2)</span>
                    </p>
                  </div>

                  <div className="mt-2 pt-2 border-t-2 border-black flex justify-between items-center">
                    <span className="text-[11px] font-bold text-gray-600">Total BPIP: <strong className="text-black text-sm">{p.final_bpip_score}</strong></span>
                    <span className="text-xs font-black uppercase text-black flex items-center hover:underline">
                      Audit Lengkap <ChevronRight className="w-4 h-4 ml-0.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Detail Peserta Terintegrasi Odontogram & Samapta Detail */}
            {selectedParticipant && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                <div className="brutal-card bg-white max-w-2xl w-full p-6 max-h-[92vh] overflow-y-auto">
                  <div className="flex justify-between items-start border-b-3 border-black pb-3 mb-4">
                    <div>
                      <span className="brutal-badge bg-[#FFE500] mb-1">{selectedParticipant.registration_number}</span>
                      <h2 className="font-black text-xl uppercase">{selectedParticipant.name}</h2>
                      <p className="text-xs font-bold text-gray-600">Panggilan: {selectedParticipant.nickname} • Telp: {selectedParticipant.phone}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedParticipant(null)}
                      className="brutal-btn bg-black text-white text-xs px-2.5 py-1"
                    >
                      TUTUP [X]
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Nilai Akhir BPIP (Formula 3 Pilar) */}
                    <div className="border-3 border-black p-3 bg-[#FFE500]">
                      <div className="flex justify-between items-center mb-1">
                        <div>
                          <span className="font-black text-xs uppercase tracking-wider block">Nilai Akhir BPIP (Formula Kota/Provinsi)</span>
                          <span className="text-[10px] font-bold text-gray-800">Rumus: 30% PBB + 30% Samapta + 40% Kepribadian</span>
                        </div>
                        <span className="font-black text-2xl bg-black text-[#FFE500] px-2 py-0.5 border border-black">
                          {selectedParticipant.final_bpip_score}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2 text-center text-xs font-black bg-white p-2 border-2 border-black">
                        <div>PBB: {selectedParticipant.score_pbb} (Bobot 30%)</div>
                        <div>Samapta: {selectedParticipant.score_samapta} (Bobot 30%)</div>
                        <div>Wawancara: {selectedParticipant.score_wawancara} (Bobot 40%)</div>
                      </div>
                    </div>

                    {/* Rincian Samapta Format BPIP Modal */}
                    <div className="border-2 border-black p-3 bg-white">
                      <h3 className="font-black text-xs uppercase mb-2 border-b border-black pb-1 flex items-center gap-1.5">
                        <HeartPulse className="w-4 h-4 text-red-600" /> Hasil Fisik Samapta (Format Database BPIP)
                      </h3>
                      <table className="w-full text-xs font-bold border-collapse border border-black">
                        <thead className="bg-gray-100 text-left">
                          <tr>
                            <th className="p-1.5 border border-black">Item Uji</th>
                            <th className="p-1.5 border border-black text-center">Hitungan Riil (Raw Count)</th>
                            <th className="p-1.5 border border-black text-center">Benchmark BPIP</th>
                            <th className="p-1.5 border border-black text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="p-1.5 border border-black">Push-Up (1 Mnt)</td>
                            <td className="p-1.5 border border-black text-center font-black">{selectedParticipant.push_up_count} kali</td>
                            <td className="p-1.5 border border-black text-center">≥ 42x (Putra)</td>
                            <td className="p-1.5 border border-black text-center">
                              <span className={`brutal-badge text-[10px] ${selectedParticipant.push_up_count >= 40 ? 'bg-[#A3E635] text-black' : 'bg-yellow-200'}`}>
                                {selectedParticipant.push_up_count >= 40 ? 'Sangat Baik' : 'Cukup'}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="p-1.5 border border-black">Sit-Up (1 Mnt)</td>
                            <td className="p-1.5 border border-black text-center font-black">{selectedParticipant.sit_up_count} kali</td>
                            <td className="p-1.5 border border-black text-center">≥ 41x (Putra)</td>
                            <td className="p-1.5 border border-black text-center">
                              <span className={`brutal-badge text-[10px] ${selectedParticipant.sit_up_count >= 40 ? 'bg-[#A3E635] text-black' : 'bg-yellow-200'}`}>
                                {selectedParticipant.sit_up_count >= 40 ? 'Sangat Baik' : 'Cukup'}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="p-1.5 border border-black">Back-Up (1 Mnt)</td>
                            <td className="p-1.5 border border-black text-center font-black">{selectedParticipant.back_up_count} kali</td>
                            <td className="p-1.5 border border-black text-center">≥ 40x</td>
                            <td className="p-1.5 border border-black text-center">
                              <span className="brutal-badge bg-[#A3E635] text-black text-[10px]">Memenuhi</span>
                            </td>
                          </tr>
                          <tr>
                            <td className="p-1.5 border border-black">Shuttle Run</td>
                            <td className="p-1.5 border border-black text-center font-black">{selectedParticipant.shuttle_run_time} detik</td>
                            <td className="p-1.5 border border-black text-center">&lt; 16.0 dtk</td>
                            <td className="p-1.5 border border-black text-center">
                              <span className={`brutal-badge text-[10px] ${selectedParticipant.shuttle_run_time < 16.0 ? 'bg-[#A3E635] text-black' : 'bg-yellow-200'}`}>
                                {selectedParticipant.shuttle_run_time < 16.0 ? 'Lolos Target 100' : 'Cukup'}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="p-1.5 border border-black">Lari 12 Menit</td>
                            <td className="p-1.5 border border-black text-center font-black">
                              {selectedParticipant.lari_12m_distance} m ({selectedParticipant.lari_12m_laps} lap + {selectedParticipant.lari_12m_remaining}m)
                            </td>
                            <td className="p-1.5 border border-black text-center">≥ 3.000m (Putra)</td>
                            <td className="p-1.5 border border-black text-center">
                              <span className={`brutal-badge text-[10px] ${selectedParticipant.lari_12m_distance >= 2800 ? 'bg-[#A3E635] text-black' : 'bg-red-400 text-white'}`}>
                                {selectedParticipant.lari_12m_distance >= 2800 ? 'Zona Aman' : 'Rawan'}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Odontogram & Screening Medis BPIP */}
                    <div className="border-2 border-black p-3 bg-neutral-50">
                      <h3 className="font-black text-xs uppercase mb-2 border-b border-black pb-1">
                        Pemeriksaan Gigi (Odontogram BPIP) &amp; Screening Penyakit
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold mb-2">
                        <div className="bg-white p-2 border border-black">
                          <span className="text-[10px] text-gray-500 block">CARIES DENTIS</span>
                          <span className={selectedParticipant.caries_dentis <= 3 ? "text-green-700 font-black" : "text-red-600 font-black"}>
                            {selectedParticipant.caries_dentis} gigi (Maks ≤3)
                          </span>
                        </div>
                        <div className="bg-white p-2 border border-black">
                          <span className="text-[10px] text-gray-500 block">TUMPATAN GIGI</span>
                          <span className={selectedParticipant.tumpatan_gigi <= 5 ? "text-green-700 font-black" : "text-red-600 font-black"}>
                            {selectedParticipant.tumpatan_gigi} gigi (Maks ≤5)
                          </span>
                        </div>
                        <div className="bg-white p-2 border border-black">
                          <span className="text-[10px] text-gray-500 block">IMPAKSI GIGI</span>
                          <span className={selectedParticipant.impaksi_gigi <= 2 ? "text-green-700 font-black" : "text-red-600 font-black"}>
                            {selectedParticipant.impaksi_gigi} gigi (Maks ≤2)
                          </span>
                        </div>
                        <div className="bg-white p-2 border border-black">
                          <span className="text-[10px] text-gray-500 block">GIGI DEPAN TANGGAL</span>
                          <span className={!selectedParticipant.kehilangan_gigi_depan ? "text-green-700 font-black" : "text-red-600 font-black"}>
                            {selectedParticipant.kehilangan_gigi_depan ? "ADA (GUGUR)" : "TIDAK ADA"}
                          </span>
                        </div>
                      </div>
                      <div className="text-[11px] font-bold p-2 bg-white border border-black flex justify-between">
                        <span>Total Riwayat Penyakit (YA): <strong>{selectedParticipant.riwayat_penyakit_ya}</strong></span>
                        <span className={selectedParticipant.riwayat_penyakit_ya <= 5 ? "text-green-700 font-black" : "text-red-600 font-black"}>
                          {selectedParticipant.riwayat_penyakit_ya <= 5 ? "Status: Lolos Verifikasi Medis" : "TERKUNCI SISTEM (MELEBIHI BATAS 5)"}
                        </span>
                      </div>
                    </div>

                    {/* Audit Akun Media Sosial */}
                    <div className="border-2 border-black p-3 bg-white">
                      <h3 className="font-black text-xs uppercase mb-2 border-b border-black pb-1">
                        Audit Rekam Jejak Digital (3 Akun Portal BPIP)
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-bold">
                        <div className="p-2 border border-black bg-pink-50 flex items-center gap-2">
                          <Share2 className="w-4 h-4 text-pink-600" />
                          <div>
                            <span className="text-[10px] text-gray-500 block">INSTAGRAM</span>
                            <span>{selectedParticipant.instagram || '-'}</span>
                          </div>
                        </div>
                        <div className="p-2 border border-black bg-blue-50 flex items-center gap-2">
                          <Globe className="w-4 h-4 text-blue-600" />
                          <div>
                            <span className="text-[10px] text-gray-500 block">FACEBOOK</span>
                            <span>{selectedParticipant.facebook || '-'}</span>
                          </div>
                        </div>
                        <div className="p-2 border border-black bg-neutral-100 flex items-center gap-2">
                          <Share2 className="w-4 h-4 text-black" />
                          <div>
                            <span className="text-[10px] text-gray-500 block">TWITTER / X</span>
                            <span>{selectedParticipant.twitter || '-'}</span>
                          </div>
                        </div>
                      </div>
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
            <div className="brutal-card bg-[#A3E635] p-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b-3 border-black pb-3 mb-4">
                <div>
                  <h2 className="font-black text-xl uppercase tracking-tight">Presensi Lapangan Cepat (Mobile-First)</h2>
                  <p className="text-xs font-bold text-black">Klik status untuk tiap peserta lalu tekan "Simpan Presensi" untuk sinkronisasi ke Spreadsheet.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <select 
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    className="brutal-input text-xs py-1.5 bg-white font-bold"
                  >
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>{s.date} - {s.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                {participants.map(p => {
                  const currentStatus = attendanceRecords[p.id] || 'Hadir';
                  return (
                    <div key={p.id} className="bg-white border-2 border-black p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shadow-[2px_2px_0px_#000]">
                      <div>
                        <span className="font-black text-sm uppercase">{p.name}</span>
                        <span className="text-xs font-bold text-gray-600 block">Kelas {p.class} • No. {p.registration_number}</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                        {(['Hadir', 'Izin', 'Sakit', 'Alpa', 'Terlambat'] as const).map(st => {
                          const isSelected = currentStatus === st;
                          let btnBg = 'bg-gray-100';
                          if (isSelected) {
                            if (st === 'Hadir') btnBg = 'bg-[#22C55E] text-black';
                            else if (st === 'Izin') btnBg = 'bg-[#38BDF8] text-black';
                            else if (st === 'Sakit') btnBg = 'bg-[#FBBF24] text-black';
                            else if (st === 'Alpa') btnBg = 'bg-[#EF4444] text-white';
                            else if (st === 'Terlambat') btnBg = 'bg-[#FB923C] text-black';
                          }
                          return (
                            <button
                              key={st}
                              type="button"
                              onClick={() => handleAttendanceChange(p.id, st)}
                              className={`text-xs font-black uppercase px-2.5 py-1 border-2 border-black transition-transform cursor-pointer ${btnBg} ${
                                isSelected ? 'shadow-[2px_2px_0px_#000] -translate-y-0.5' : 'hover:bg-gray-200'
                              }`}
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

              <div className="mt-5 pt-3 border-t-3 border-black flex justify-between items-center">
                <span className="text-xs font-bold">{syncStatus}</span>
                <button 
                  onClick={handleSaveAttendance}
                  className="brutal-btn bg-black text-[#FFE500] hover:bg-neutral-800 flex items-center gap-2 text-sm"
                >
                  <Save className="w-4 h-4" /> SIMPAN PRESENSI
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
            <div className="brutal-card bg-white p-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b-3 border-black pb-3 mb-4">
                <div>
                  <h2 className="font-black text-xl uppercase tracking-tight">
                    Ranking Resmi Berdasarkan Rumus Portal BPIP
                  </h2>
                  <p className="text-xs font-bold text-gray-600">
                    Nilai Akhir = <strong>30% PBB + 30% Samapta + 40% Kepribadian &amp; Wawancara</strong> (Tingkat Kota &amp; Provinsi).
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="brutal-badge bg-[#FFE500]">Formula Asli BPIP Code</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border-2 border-black">
                  <thead>
                    <tr className="bg-black text-white text-xs uppercase font-black">
                      <th className="p-3 border-2 border-black">Rank</th>
                      <th className="p-3 border-2 border-black">Nama Peserta</th>
                      <th className="p-3 border-2 border-black">Kelas</th>
                      <th className="p-3 border-2 border-black text-center">PBB (30%)</th>
                      <th className="p-3 border-2 border-black text-center">Samapta (30%)</th>
                      <th className="p-3 border-2 border-black text-center">Wawancara (40%)</th>
                      <th className="p-3 border-2 border-black text-center">Nilai Akhir BPIP</th>
                      <th className="p-3 border-2 border-black text-center">Readiness</th>
                      <th className="p-3 border-2 border-black text-center">Status Rekomendasi</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-bold divide-y divide-black">
                    {participants
                      .slice()
                      .sort((a, b) => b.final_bpip_score - a.final_bpip_score)
                      .map((p, idx) => (
                        <tr key={p.id} className="hover:bg-yellow-50 transition-colors">
                          <td className="p-3 border-2 border-black font-black text-base">
                            <span className="w-6 h-6 bg-[#FFE500] border border-black inline-flex items-center justify-center">
                              {idx + 1}
                            </span>
                          </td>
                          <td className="p-3 border-2 border-black font-black uppercase text-sm">
                            {p.name}
                          </td>
                          <td className="p-3 border-2 border-black">{p.class}</td>
                          <td className="p-3 border-2 border-black text-center">{p.score_pbb}</td>
                          <td className="p-3 border-2 border-black text-center">{p.score_samapta}</td>
                          <td className="p-3 border-2 border-black text-center">{p.score_wawancara}</td>
                          <td className="p-3 border-2 border-black text-center font-black text-base bg-yellow-100">
                            {p.final_bpip_score}
                          </td>
                          <td className="p-3 border-2 border-black text-center font-black text-sm text-green-700">
                            {p.readiness_score}
                          </td>
                          <td className="p-3 border-2 border-black text-center">
                            <span className={`brutal-badge ${
                              p.status === 'RECOMMENDED' ? 'bg-[#10B981] text-white' :
                              p.status === 'READY' ? 'bg-[#22C55E] text-black' :
                              p.status === 'NEAR READY' ? 'bg-[#FBBF24] text-black' :
                              p.status === 'PEMBINAAN KHUSUS' ? 'bg-[#EF4444] text-white' : 'bg-gray-200'
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
            <div className="brutal-card bg-[#FFE500] p-5">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b-3 border-black pb-3 mb-4">
                <div>
                  <span className="brutal-badge bg-black text-[#FFE500] mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1 inline" /> SISTEM TRANSPARANSI PASKIBRAKA BPIP
                  </span>
                  <h2 className="font-black text-2xl uppercase tracking-tight">
                    Rincian Teknis, Ambang Batas &amp; Strategi Nilai 100
                  </h2>
                  <p className="text-xs font-bold text-black mt-0.5">
                    Panduan absolut 8 tahapan seleksi nasional berdasar regulasi BPIP &amp; petunjuk teknis juri lapangan.
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="brutal-badge bg-red-600 text-white font-black">
                    <Lock className="w-3 h-3 mr-1 inline" /> AUTO-DISQUALIFICATION
                  </span>
                </div>
              </div>

              {/* Kalkulator Cepat IMT & Berat Badan Ideal (BBI) Militer */}
              <div className="bg-white border-3 border-black p-4 shadow-[4px_4px_0_#000] mb-6">
                <div className="flex items-center gap-2 border-b-2 border-black pb-2 mb-3">
                  <Calculator className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-black text-sm uppercase tracking-wide">
                    Simulasi Antropometri Parade: Rumus BBI Proporsional (TB - 100) x 90% (±5 kg)
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="text-[11px] font-black uppercase block mb-1">Tinggi Badan (cm)</label>
                    <input 
                      type="number" 
                      value={calcHeight} 
                      onChange={(e) => setCalcHeight(Number(e.target.value))}
                      className="brutal-input text-xs font-black"
                    />
                    <span className="text-[10px] font-bold text-gray-500 mt-0.5 block">Putra: 170-180 | Putri: 165-175</span>
                  </div>
                  <div>
                    <label className="text-[11px] font-black uppercase block mb-1">Berat Badan Aktual (kg)</label>
                    <input 
                      type="number" 
                      value={calcWeight} 
                      onChange={(e) => setCalcWeight(Number(e.target.value))}
                      className="brutal-input text-xs font-black"
                    />
                    <span className="text-[10px] font-bold text-gray-500 mt-0.5 block">Toleransi maks ±5 kg</span>
                  </div>
                  <div className="bg-[#FEF08A] border-2 border-black p-2.5">
                    <span className="text-[10px] font-black uppercase block text-gray-700">Target BBI Murni</span>
                    <span className="text-lg font-black">{bbiResult.bbi} kg</span>
                    <span className="text-[10px] font-bold block text-gray-600">Rentang: {bbiResult.minSafe} - {bbiResult.maxSafe} kg</span>
                  </div>
                  <div>
                    <div className={`p-2.5 border-2 border-black text-center font-black text-xs uppercase ${
                      isWeightSafe ? 'bg-[#A3E635] text-black' : 'bg-[#EF4444] text-white'
                    }`}>
                      {isWeightSafe ? 'STATUS: AMAN (MEMENUHI SYARAT)' : 'STATUS: PERLU CUTTING / BULKING'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stage Filter Buttons */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                <button
                  onClick={() => setSelectedStageId('all')}
                  className={`text-xs font-black uppercase px-2.5 py-1 border-2 border-black transition-transform cursor-pointer ${
                    selectedStageId === 'all' ? 'bg-black text-[#FFE500] shadow-[2px_2px_0_#000]' : 'bg-white hover:bg-gray-100'
                  }`}
                >
                  Semua 8 Tahapan
                </button>
                {TAHAPAN_SELEKSI_BPIP.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStageId(s.id)}
                    className={`text-xs font-black uppercase px-2 py-1 border-2 border-black transition-transform cursor-pointer ${
                      selectedStageId === s.id ? 'bg-black text-[#FFE500] shadow-[2px_2px_0_#000]' : 'bg-white hover:bg-gray-100'
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
                    <div key={stage.id} className="bg-white border-3 border-black p-5 shadow-[4px_4px_0_#000]">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b-2 border-black pb-3 mb-3">
                        <div>
                          <span className={`brutal-badge text-[10px] mr-2 ${
                            stage.sifatKelulusan === 'Gugur Otomatis (Locked)' ? 'bg-red-600 text-white' :
                            stage.sifatKelulusan === 'Objektif Medis' ? 'bg-blue-600 text-white' :
                            stage.sifatKelulusan === 'Pemeringkatan Kuota' ? 'bg-[#A3E635] text-black' : 'bg-purple-600 text-white'
                          }`}>
                            {stage.sifatKelulusan}
                          </span>
                          <h3 className="font-black text-lg uppercase tracking-tight mt-1 inline-block">
                            {stage.namaTahap}
                          </h3>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-gray-500 block">Ambang Batas (Passing Grade):</span>
                          <span className="brutal-badge bg-[#FFE500] text-black text-xs font-black">
                            {stage.passingGrade}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs font-bold text-gray-700 mb-3 bg-gray-100 p-2 border border-black">
                        <strong>Metode Sistem:</strong> {stage.sistemUjian}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border-2 border-black p-3 bg-[#FFF5F5]">
                          <span className="font-black text-xs uppercase text-red-700 flex items-center gap-1 mb-2 border-b border-red-300 pb-1">
                            <AlertTriangle className="w-4 h-4 text-red-600" /> Parameter Penilaian &amp; Titik Gugur
                          </span>
                          <ul className="text-xs font-bold text-gray-800 space-y-1.5 list-disc pl-4">
                            {stage.parameterKritis.map((param, i) => (
                              <li key={i}>{param}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="border-2 border-black p-3 bg-[#F0FDF4]">
                          <span className="font-black text-xs uppercase text-green-800 flex items-center gap-1 mb-2 border-b border-green-300 pb-1">
                            <CheckCircle2 className="w-4 h-4 text-green-600" /> Trik Rahasia Menembus Nilai 100
                          </span>
                          <ul className="text-xs font-bold text-gray-800 space-y-1.5 list-disc pl-4">
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
            <div className="flex justify-between items-center bg-white border-3 border-black p-4 shadow-[4px_4px_0px_#000]">
              <div>
                <h2 className="font-black text-xl uppercase tracking-tight">Agenda Program Latihan ({sessions.length})</h2>
                <p className="text-xs font-bold text-gray-600">Jadwal pembinaan fisik, drill PBB, dan simulasi pos seleksi.</p>
              </div>
              <button 
                onClick={() => alert('Buat Sesi Latihan Baru')}
                className="brutal-btn bg-[#F472B6] text-black text-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 stroke-[3]" /> Tambah Sesi
              </button>
            </div>

            <div className="space-y-4">
              {sessions.map(s => (
                <div key={s.id} className="brutal-card bg-white p-5">
                  <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="brutal-badge bg-black text-[#FFE500]">{s.category}</span>
                      <h3 className="font-black text-lg uppercase tracking-tight">{s.title}</h3>
                    </div>
                    <span className="font-bold text-xs bg-[#FFE500] border-2 border-black px-2 py-0.5 shadow-[1px_1px_0_#000]">
                      {s.date}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold text-gray-800">
                    <div>
                      <p className="flex items-center gap-1.5 mb-1">
                        <Clock className="w-4 h-4" /> {s.start_time} - {s.end_time} WIB
                      </p>
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" /> {s.location}
                      </p>
                      <p className="mt-2 text-black bg-yellow-50 p-2 border border-black">
                        <strong>Target:</strong> {s.target}
                      </p>
                    </div>
                    <div>
                      <p className="mb-2"><strong>Deskripsi:</strong> {s.description}</p>
                      <p className="italic bg-gray-100 p-2 border border-black">
                        <strong>Catatan Pelatih:</strong> "{s.coach_notes}"
                      </p>
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
            <div className="brutal-card bg-white p-6">
              <div className="border-b-3 border-black pb-3 mb-4">
                <h2 className="font-black text-xl uppercase tracking-tight flex items-center gap-2">
                  <Database className="w-6 h-6" /> Integrasi Database Google Sheets &amp; GAS
                </h2>
                <p className="text-xs font-bold text-gray-600">
                  Hubungkan URL Google Apps Script Web App agar seluruh data presensi, nilai, dan peserta otomatis tersimpan ke Spreadsheet Anda.
                </p>
              </div>

              <form onSubmit={handleSaveGasUrl} className="space-y-4">
                <div>
                  <label className="text-xs font-black uppercase block mb-1">
                    Google Apps Script Web App URL:
                  </label>
                  <input 
                    type="url" 
                    value={gasUrl}
                    onChange={(e) => setGasUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="brutal-input text-xs"
                  />
                  <span className="text-[11px] font-bold text-gray-500 mt-1 block">
                    File skrip GAS telah dibuatkan di folder: <code className="bg-yellow-200 px-1 border border-black">gas/Code.gs</code>
                  </span>
                </div>

                <div className="flex gap-2">
                  <button type="submit" className="brutal-btn bg-[#A3E635] text-black text-xs">
                    Simpan URL API
                  </button>
                  <button 
                    type="button" 
                    onClick={() => alert('Skrip GAS di file gas/Code.gs siap dicopy ke Tools > Script Editor di Google Sheets Anda.')}
                    className="brutal-btn bg-black text-white text-xs"
                  >
                    Petunjuk Pemasangan GAS
                  </button>
                </div>
              </form>

              <div className="mt-6 border-t-3 border-black pt-4">
                <h3 className="font-black text-sm uppercase mb-2">Langkah Pemasangan Google Sheets:</h3>
                <ol className="text-xs font-bold space-y-1.5 list-decimal pl-5 text-gray-800">
                  <li>Buka <a href="https://sheets.new" target="_blank" rel="noreferrer" className="underline font-black">Google Sheets</a> baru Anda.</li>
                  <li>Klik menu <strong>Extensions &gt; Apps Script</strong>.</li>
                  <li>Copy seluruh isi file <code className="bg-yellow-100 px-1 border border-black">gas/Code.gs</code> dan paste ke editor Apps Script.</li>
                  <li>Jalankan fungsi <code className="bg-yellow-100 px-1 border border-black">setupDatabase()</code> satu kali (akan otomatis membuat semua sheet &amp; header).</li>
                  <li>Klik <strong>Deploy &gt; New deployment &gt; Select type: Web app</strong>.</li>
                  <li>Set <em>Execute as: Me</em> dan <em>Who has access: Anyone</em>, lalu klik <strong>Deploy</strong>.</li>
                  <li>Copy Web App URL dan tempelkan pada kolom di atas!</li>
                </ol>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;
