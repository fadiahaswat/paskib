import React, { useState } from 'react';
import { X, Save, UserPlus } from 'lucide-react';
import { type Participant } from '../initialData';

interface ParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (participant: Participant) => void;
  initialData?: Participant | null;
}

export function ParticipantModal({ isOpen, onClose, onSave, initialData }: ParticipantModalProps) {
  if (!isOpen) return null;

  const [formData, setFormData] = useState<Partial<Participant>>(() => {
    if (initialData) return { ...initialData };
    return {
      id: `PAS-${Math.floor(100 + Math.random() * 900)}`,
      registration_number: `2026/${Math.floor(10 + Math.random() * 90)}`,
      name: '',
      nickname: '',
      gender: 'L',
      school: 'SMA / SMK / MA',
      class: 'X',
      birth_date: '2009-01-01',
      phone: '08123456789',
      height: 172,
      weight: 63,
      status: 'DEVELOPING',
      photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      visus: '6/6 (Normal)',
      leg_shape: 'Normal',
      notes: '',
      riwayat_penyakit_ya: 0,
      caries_dentis: 0,
      tumpatan_gigi: 0,
      impaksi_gigi: 0,
      kehilangan_gigi_depan: false,
      push_up_count: 35,
      sit_up_count: 35,
      back_up_count: 35,
      shuttle_run_time: 16.5,
      lari_12m_distance: 2800,
      lari_12m_laps: 7,
      lari_12m_remaining: 0,
      score_pbb: 80,
      score_samapta: 80,
      score_wawancara: 80,
      final_bpip_score: 80,
      attendance_pct: 100,
      latest_score: 80,
      readiness_score: 80,
      trend: 'STABLE',
      score_change: 0,
      alerts: []
    };
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    // Recalculate final score
    const pbb = formData.score_pbb || 80;
    const samapta = formData.score_samapta || 80;
    const wawancara = formData.score_wawancara || 80;
    const finalScore = Number(((pbb * 0.3) + (samapta * 0.3) + (wawancara * 0.4)).toFixed(1));

    const participant: Participant = {
      ...(formData as Participant),
      final_bpip_score: finalScore,
      latest_score: finalScore,
      updated_at: new Date().toISOString()
    };

    onSave(participant);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8">
        <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-500/10 text-red-500 rounded-xl">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {initialData ? 'Edit Data Calon Paskibraka' : 'Pendaftaran Calon Baru'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lengkapi berkas identitas dan indikator antropometri standar BPIP.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                Nomor Registrasi Seleksi
              </label>
              <input
                type="text"
                value={formData.registration_number || ''}
                onChange={e => setFormData({ ...formData, registration_number: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                Jenis Kelamin
              </label>
              <select
                value={formData.gender || 'L'}
                onChange={e => setFormData({ ...formData, gender: e.target.value as 'L' | 'P' })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white"
              >
                <option value="L">Putra (Laki-laki)</option>
                <option value="P">Putri (Perempuan)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                Nama Lengkap Calon
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: MUHAMMAD NUR RAFI"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                Asal Sekolah
              </label>
              <input
                type="text"
                value={formData.school || ''}
                onChange={e => setFormData({ ...formData, school: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                Kelas
              </label>
              <input
                type="text"
                value={formData.class || ''}
                onChange={e => setFormData({ ...formData, class: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                Tinggi Badan (cm)
              </label>
              <input
                type="number"
                value={formData.height || ''}
                onChange={e => setFormData({ ...formData, height: Number(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                Berat Badan (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.weight || ''}
                onChange={e => setFormData({ ...formData, weight: Number(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                Bentuk Kaki (O / X / Normal)
              </label>
              <input
                type="text"
                value={formData.leg_shape || ''}
                onChange={e => setFormData({ ...formData, leg_shape: e.target.value })}
                placeholder="Contoh: Normal atau X (2cm)"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                Status Kesiapan
              </label>
              <select
                value={formData.status || 'DEVELOPING'}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white"
              >
                <option value="RECOMMENDED">RECOMMENDED (Unggulan)</option>
                <option value="READY">READY (Siap Seleksi)</option>
                <option value="NEAR READY">NEAR READY</option>
                <option value="PROGRESSING">PROGRESSING</option>
                <option value="DEVELOPING">DEVELOPING</option>
                <option value="PEMBINAAN KHUSUS">PEMBINAAN KHUSUS</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-900/30 transition flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Simpan Data
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
