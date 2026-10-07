/**
 * Standard Kesamaptaan Jasmani BPIP / TNI-POLRI
 * Samapta A: Lari 12 Menit
 * Samapta B: Push Up (1 min), Sit Up (1 min), Shuttle Run (6 x 10 meter)
 */

export interface SamaptaInput {
  gender: 'L' | 'P';
  lari12mDistance: number; // in meters
  pushUpCount: number;
  sitUpCount: number;
  shuttleRunTime: number; // in seconds
}

export interface SamaptaResult {
  scoreLari: number;
  scorePushUp: number;
  scoreSitUp: number;
  scoreShuttleRun: number;
  scoreSamaptaB: number;
  scoreTotalSamapta: number;
  grade: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Kurang' | 'Kurang Sekali';
  categoryColor: string;
  recommendations: string[];
}

export function calculateScoreLari(gender: 'L' | 'P', distance: number): number {
  if (gender === 'L') {
    if (distance >= 3500) return 100;
    if (distance <= 1600) return Math.max(0, Math.round((distance / 1600) * 20));
    const score = 20 + ((distance - 1600) / (3500 - 1600)) * 80;
    return Math.min(100, Math.max(0, Math.round(score)));
  } else {
    if (distance >= 3000) return 100;
    if (distance <= 1200) return Math.max(0, Math.round((distance / 1200) * 20));
    const score = 20 + ((distance - 1200) / (3000 - 1200)) * 80;
    return Math.min(100, Math.max(0, Math.round(score)));
  }
}

export function calculateScorePushUp(gender: 'L' | 'P', count: number): number {
  if (gender === 'L') {
    if (count >= 43) return 100;
    if (count <= 0) return 0;
    return Math.min(100, Math.round((count / 43) * 100));
  } else {
    if (count >= 30) return 100;
    if (count <= 0) return 0;
    return Math.min(100, Math.round((count / 30) * 100));
  }
}

export function calculateScoreSitUp(gender: 'L' | 'P', count: number): number {
  if (gender === 'L') {
    if (count >= 42) return 100;
    if (count <= 0) return 0;
    return Math.min(100, Math.round((count / 42) * 100));
  } else {
    if (count >= 32) return 100;
    if (count <= 0) return 0;
    return Math.min(100, Math.round((count / 32) * 100));
  }
}

export function calculateScoreShuttleRun(gender: 'L' | 'P', time: number): number {
  if (time <= 0) return 0;
  if (gender === 'L') {
    if (time <= 16.0) return 100;
    if (time >= 24.0) return Math.max(0, Math.round(20 - (time - 24) * 5));
    const score = 100 - ((time - 16.0) / (24.0 - 16.0)) * 80;
    return Math.min(100, Math.max(0, Math.round(score)));
  } else {
    if (time <= 17.5) return 100;
    if (time >= 26.0) return Math.max(0, Math.round(20 - (time - 26) * 5));
    const score = 100 - ((time - 17.5) / (26.0 - 17.5)) * 80;
    return Math.min(100, Math.max(0, Math.round(score)));
  }
}

export function evaluateSamapta(input: SamaptaInput): SamaptaResult {
  const scoreLari = calculateScoreLari(input.gender, input.lari12mDistance);
  const scorePushUp = calculateScorePushUp(input.gender, input.pushUpCount);
  const scoreSitUp = calculateScoreSitUp(input.gender, input.sitUpCount);
  const scoreShuttleRun = calculateScoreShuttleRun(input.gender, input.shuttleRunTime);

  const scoreSamaptaB = Math.round((scorePushUp + scoreSitUp + scoreShuttleRun) / 3);
  const scoreTotalSamapta = Math.round((scoreLari + scoreSamaptaB) / 2);

  let grade: SamaptaResult['grade'] = 'Kurang Sekali';
  let categoryColor = 'text-red-600 bg-red-50 border-red-200';

  if (scoreTotalSamapta >= 85) {
    grade = 'Sangat Baik';
    categoryColor = 'text-emerald-700 bg-emerald-50 border-emerald-300';
  } else if (scoreTotalSamapta >= 70) {
    grade = 'Baik';
    categoryColor = 'text-blue-700 bg-blue-50 border-blue-300';
  } else if (scoreTotalSamapta >= 55) {
    grade = 'Cukup';
    categoryColor = 'text-amber-700 bg-amber-50 border-amber-300';
  } else if (scoreTotalSamapta >= 41) {
    grade = 'Kurang';
    categoryColor = 'text-orange-700 bg-orange-50 border-orange-300';
  }

  const recommendations: string[] = [];
  if (scoreLari < 70) {
    recommendations.push(
      `Porsi Lari 12 Menit perlu ditingkatkan: Jarak saat ini ${input.lari12mDistance}m (target ${input.gender === 'L' ? '3000m+' : '2600m+'}). Latih fartlek & tempo run.`
    );
  }
  if (scorePushUp < 70) {
    recommendations.push(
      `Kekuatan otot dada & lengan kurang (skor ${scorePushUp}). Rutinkan push-up variasi (diamond, decline) pagi dan sore bertahap 3 set x 15-20 repetisi.`
    );
  }
  if (scoreSitUp < 70) {
    recommendations.push(
      `Kekuatan otot perut (core) perlu diperkuat (skor ${scoreSitUp}). Latih plank 3x60 detik dan leg raise harian.`
    );
  }
  if (scoreShuttleRun < 70) {
    recommendations.push(
      `Kelincahan shuttle run (${input.shuttleRunTime}s) perlu diasah. Latih teknik titik balik cepat dan tumpuan kaki kuat.`
    );
  }
  if (recommendations.length === 0) {
    recommendations.push('Performa fisik prima! Pertahankan endurance, hidrasi cukup, dan jaga dari cedera otot.');
  }

  return {
    scoreLari,
    scorePushUp,
    scoreSitUp,
    scoreShuttleRun,
    scoreSamaptaB,
    scoreTotalSamapta,
    grade,
    categoryColor,
    recommendations
  };
}
