import { Mentality } from '../types';

/**
 * PUSAT PENGETAHUAN TAKTIK SEPAKBOLA (GUIDE TO FOOTBALL & FM24)
 * Sumber Acuan: https://guidetofootball.com/tactics/
 * 
 * Mencakup:
 * 1. Team Mentality (Filosofi Risiko, Urgensi & Transisi)
 * 2. Defensive Shape & Blocks (High Press, Mid-Block, Low Block)
 * 3. Final Third & Set-Piece Routines
 * 4. 3 Fase Permainan (In Possession, Out of Possession, Transitions)
 * 5. Prinsip Kompak & Rest Defence (GuideToFootball Core)
 */

export interface MentalityDetail {
  id: Mentality;
  name: string;
  indonesianName: string;
  riskLevel: 'Sangat Rendah' | 'Rendah' | 'Moderat-Rendah' | 'Netral (50/50)' | 'Moderat-Tinggi' | 'Tinggi' | 'Maksimal';
  philosophy: string;
  tacticalEffects: {
    tempo: string;
    passingDirectness: string;
    defensiveLineLoE: string;
    pressingUrgency: string;
    creativeRisk: string;
  };
  recommendedWhen: string;
  guideToFootballNote: string;
  color: string;
  badgeBg: string;
}

export const MENTALITY_KNOWLEDGE: Record<Mentality, MentalityDetail> = {
  very_defensive: {
    id: 'very_defensive',
    name: 'Very Defensive',
    indonesianName: 'Sangat Bertahan',
    riskLevel: 'Sangat Rendah',
    philosophy: 'Prioritas mutlak pada pengamanan gawang sendiri dan pembatasan ruang tembak lawan. Menolak segala bentuk spekulasi serangan.',
    tacticalEffects: {
      tempo: 'Sangat lambat untuk mengulur waktu dan menjaga ketenangan',
      passingDirectness: 'Sangat pendek dan aman, atau buang bola langsung ke depan jika tertekan',
      defensiveLineLoE: 'Low Block sangat dalam, mendekat ke garis 16 meter sendiri',
      pressingUrgency: 'Sangat pasif, fokus menjaga kerapatan garis (compactness)',
      creativeRisk: 'Minimal; pemain dilarang meninggalkan pos atau mencoba dribel berisiko',
    },
    recommendedWhen: 'Mempertahankan keunggulan tipis di 10 menit terakhir, atau saat menghadapi lawan dengan perbedaan kelas yang ekstrem.',
    guideToFootballNote: 'GuideToFootball: Bertahan total tanpa skema transisi hanya akan mengundang gelombang serangan terus-menerus. Butuh minimal 1 pelari cepat untuk mengalihkan tekanan.',
    color: 'text-blue-400',
    badgeBg: 'bg-blue-950 border-blue-800 text-blue-300',
  },
  defensive: {
    id: 'defensive',
    name: 'Defensive',
    indonesianName: 'Bertahan',
    riskLevel: 'Rendah',
    philosophy: 'Menyerap tekanan di area sendiri dengan disiplin tinggi, lalu memanfaatkan ruang di belakang lawan melalui serangan balik terukur.',
    tacticalEffects: {
      tempo: 'Lambat saat build-up, namun langsung cepat saat memicu serangan balik',
      passingDirectness: 'Lebih langsung ke target man atau ruang kosong sayap',
      defensiveLineLoE: 'Low Block / Mid-Block rendah dengan jarak antar lini rapat',
      pressingUrgency: 'Menekan saat bola memasuki sepertiga pertahanan sendiri',
      creativeRisk: 'Rendah; hanya pemain menyerang yang diberi izin mengambil inisiatif',
    },
    recommendedWhen: 'Laga tandang berat, menghadapi tim dominan, atau saat taktik mengandalkan formasi 5 bek / counter-attack murni.',
    guideToFootballNote: 'GuideToFootball: Blok pertahanan rendah efektif karena menyempitkan ruang tembak sentral (danger zones) dan memaksa lawan melepas umpan silang jauh.',
    color: 'text-sky-400',
    badgeBg: 'bg-sky-950 border-sky-800 text-sky-300',
  },
  cautious: {
    id: 'cautious',
    name: 'Cautious',
    indonesianName: 'Hati-Hati (Pragmatis)',
    riskLevel: 'Moderat-Rendah',
    philosophy: 'Pendekatan kalkulatif. Membaca kekuatan dan ritme lawan sebelum mengeksploitasi kelemahan tanpa membuka pertahanan sendiri.',
    tacticalEffects: {
      tempo: 'Sedang-cenderung sabar',
      passingDirectness: 'Kombinasi passing aman dan probing mencari celah',
      defensiveLineLoE: 'Mid-Block disiplin dengan garis pertahanan standar',
      pressingUrgency: 'Selektif; menekan saat lawan membuat sentuhan buruk atau umpan tanggung',
      creativeRisk: 'Terkontrol; pemain support menjaga keseimbangan sebelum overlap',
    },
    recommendedWhen: 'Menghadapi lawan seimbang di fase gugur atau saat tim belum menemukan momentum di awal babak pertama.',
    guideToFootballNote: 'GuideToFootball: Sangat cocok untuk menguji reaksi taktik lawan pada 15-20 menit pertama laga.',
    color: 'text-teal-400',
    badgeBg: 'bg-teal-950 border-teal-800 text-teal-300',
  },
  balanced: {
    id: 'balanced',
    name: 'Balanced',
    indonesianName: 'Seimbang',
    riskLevel: 'Netral (50/50)',
    philosophy: 'Fondasi netral tanpa bias. Keputusan menyerang atau bertahan sepenuhnya dipandu oleh peran, duty, dan situasi nyata di lapangan.',
    tacticalEffects: {
      tempo: 'Standar netral',
      passingDirectness: 'Fleksibel; pendek saat build-up, direct saat transisi',
      defensiveLineLoE: 'Garis pertahanan standar dengan Mid-Block seimbang',
      pressingUrgency: 'Standar sesuai instruksi pemicu press',
      creativeRisk: 'Seimbang antara keselamatan bola dan kreasi peluang',
    },
    recommendedWhen: 'Taktik baku di awal musim, pertandingan kandang standar, atau sistem dengan sinergi peran yang sudah matang.',
    guideToFootballNote: 'GuideToFootball: Fondasi terbaik untuk mengevaluasi apakah tabrakan peran berasal dari instruksi tim atau sifat alami formasi.',
    color: 'text-slate-300',
    badgeBg: 'bg-slate-800 border-slate-700 text-slate-200',
  },
  positive: {
    id: 'positive',
    name: 'Positive',
    indonesianName: 'Positif (Proaktif)',
    riskLevel: 'Moderat-Tinggi',
    philosophy: 'Sepak bola proaktif modern. Mengambil inisiatif serangan, memindahkan bola ke sepertiga akhir lawan, namun tetap mempertahankan 3-4 pemain rest defence.',
    tacticalEffects: {
      tempo: 'Cepat dan dinamis untuk mengacaukan struktur pertahanan lawan',
      passingDirectness: 'Progresif ke depan dengan variasi kombinasi umpan',
      defensiveLineLoE: 'Garis pertahanan naik (Higher Defensive Line) & High Press',
      pressingUrgency: 'Agresif menekan saat lawan menguasai bola di wilayah sendiri',
      creativeRisk: 'Tinggi; pemain didorong mencari ruang antar lini (between the lines)',
    },
    recommendedWhen: 'Menghadapi tim yang bertahan, mendominasi laga di kandang, atau filosofi tim papan atas (default Gegenpress FM24).',
    guideToFootballNote: 'GuideToFootball: Keseimbangan emas sepak bola modern—menguasai wilayah lawan tanpa mengorbankan perlindungan serangan balik.',
    color: 'text-emerald-400',
    badgeBg: 'bg-emerald-950 border-emerald-800 text-emerald-300',
  },
  attacking: {
    id: 'attacking',
    name: 'Attacking',
    indonesianName: 'Menyerang',
    riskLevel: 'Tinggi',
    philosophy: 'Agresivitas tinggi di sepertiga akhir. Berkomitmen mengirim banyak pemain ke kotak penalti dan menerima risiko ruang di belakang garis pertahanan.',
    tacticalEffects: {
      tempo: 'Tinggi dan tanpa kompromi',
      passingDirectness: 'Penetrasi tajam mencari umpan terobosan dan cut-back cepat',
      defensiveLineLoE: 'High Press ekstrem dengan garis pertahanan tinggi mendekati garis tengah',
      pressingUrgency: 'Intensitas pressing tinggi terus-menerus',
      creativeRisk: 'Sangat bebas; bek sayap dan gelandang aktif menyerbu kotak penalti',
    },
    recommendedWhen: 'Bermain melawan tim inferior di kandang, tertinggal 1 gol, atau membutuhkan kemenangan mutlak.',
    guideToFootballNote: 'GuideToFootball: Memerlukan bek tengah yang sangat cepat (Pace/Acceleration tinggi) serta Sweeper Keeper untuk menyapu bola lambung di belakang pertahanan.',
    color: 'text-amber-400',
    badgeBg: 'bg-amber-950 border-amber-800 text-amber-300',
  },
  very_attacking: {
    id: 'very_attacking',
    name: 'Very Attacking',
    indonesianName: 'Sangat Menyerang (Total Attack)',
    riskLevel: 'Maksimal',
    philosophy: 'Gempuran tanpa jeda (all-out assault). Mengabaikan keseimbangan rest defence demi membanjiri kotak penalti lawan dengan sebanyak mungkin pemain.',
    tacticalEffects: {
      tempo: 'Maksimal, setiap detik diarahkan menuju gawang lawan',
      passingDirectness: 'Sangat mendesak, langsung ke kotak penalti',
      defensiveLineLoE: 'Garis pertahanan setinggi mungkin di garis tengah lapangan',
      pressingUrgency: 'Tekanan total di seluruh penjuru lapangan',
      creativeRisk: 'Maksimal; semua pemain maju ke sepertiga akhir lawan',
    },
    recommendedWhen: 'Mengejar defisit gol pada menit-menit kritis (menit 80+) saat hasil seri atau kalah tidak lagi ada bedanya.',
    guideToFootballNote: 'GuideToFootball: Opsi darurat. Jika diterapkan selama 90 menit penuh, stamina pemain akan habis dan tim sangat rentan dibantai counter-attack.',
    color: 'text-rose-400',
    badgeBg: 'bg-rose-950 border-rose-800 text-rose-300',
  },
};

/**
 * STRUKTUR BLOK PERTAHANAN & LINE OF ENGAGEMENT
 * Berdasarkan GuideToFootball "Defensive Shape":
 * Hanya ada 3 garis keterlibatan utama: High Press, Mid-Block, dan Low Block.
 */
export interface DefensiveBlockKnowledge {
  id: 'high_press' | 'mid_block' | 'low_block';
  name: string;
  indonesianName: string;
  pitchZone: string;
  triggerPoint: string;
  strengths: string[];
  vulnerabilities: string[];
  playerDemands: string[];
  guideToFootballQuote: string;
}

export const DEFENSIVE_BLOCK_KNOWLEDGE: Record<'high_press' | 'mid_block' | 'low_block', DefensiveBlockKnowledge> = {
  high_press: {
    id: 'high_press',
    name: 'High Press / High Block',
    indonesianName: 'Pressing Tinggi (High Block)',
    pitchZone: 'Sepertiga akhir lawan & kotak penalti lawan',
    triggerPoint: 'Saat kiper atau bek tengah lawan memulai build-up bola',
    strengths: [
      'Mempersempit ruang gerak lawan dan memutus alur sirkulasi bola sejak dini',
      'Merebut bola dekat dengan gawang lawan, menghasilkan peluang emas instan',
      'Memaksa lawan membuang bola secara tergesa-gesa (turnover tinggi)',
    ],
    vulnerabilities: [
      'Meninggalkan ruang terbuka luas di belakang garis pertahanan tim',
      'Rentan terhadap umpan lambung langsung (direct ball) ke pelari cepat lawan',
      'Menuntut energi dan stamina fisik yang sangat tinggi',
    ],
    playerDemands: [
      'Sweeper Keeper aktif yang berani keluar menyapu bola di luar kotak penalti',
      'Bek tengah dengan kecepatan (Pace/Acceleration >= 13)',
      'Penyerang dan sayap dengan Work Rate dan Aggression tinggi',
    ],
    guideToFootballQuote: 'In a high block, the forward line starts close to the opposition defenders, the midfield pushes up behind them, and the back line holds a high position near the halfway line.',
  },
  mid_block: {
    id: 'mid_block',
    name: 'Mid-Block',
    indonesianName: 'Blok Tengah (Mid-Block)',
    pitchZone: 'Garis tengah lapangan (Halfway line)',
    triggerPoint: 'Saat bola melewati garis tengah atau dioper ke gelandang lawan',
    strengths: [
      'Keseimbangan taktis optimal antara proteksi belakang dan ancaman depan',
      'Menjaga kerapatan tim (compactness) tanpa terlalu terekspos ruang di belakang',
      'Menghemat stamina pemain dibanding pressing tinggi sepanjang laga',
      'Memancing lawan keluar dari sarangnya sebelum menyergap di zona tengah',
    ],
    vulnerabilities: [
      'Memberi kebebasan bek tengah lawan menguasai bola di wilayah mereka',
      'Memerlukan kedisiplinan posisi tinggi agar tidak ada celah antar lini',
    ],
    playerDemands: [
      'Gelandang tengah dengan Positioning, Anticipation, dan Tackling solid',
      'Kerapatan jarak vertikal antar lini (maksimal 25-30 meter)',
    ],
    guideToFootballQuote: 'In a mid-block, the team defends around the halfway line. The forwards stay around halfway, the midfielders sit just behind them, and the back line steps up to keep the team compact.',
  },
  low_block: {
    id: 'low_block',
    name: 'Low Block',
    indonesianName: 'Blok Rendah (Low Block)',
    pitchZone: 'Sepertiga pertahanan sendiri (depan kotak 16 meter)',
    triggerPoint: 'Hanya menekan ketika lawan masuk ke area sepertiga pertahanan tim',
    strengths: [
      'Menutup total koridor sentral dan zona paling berbahaya (danger zones)',
      'Sangat sulit ditembus oleh umpan terobosan datar',
      'Membuka ruang serangan balik seluas-luasnya di pertahanan lawan yang maju',
    ],
    vulnerabilities: [
      'Membiarkan lawan mengurung dan melepas banyak tembakan jarak jauh / crossing',
      'Jarak ke gawang lawan sangat jauh saat transisi menyerang',
      'Jika kebobolan lebih dulu, sangat sulit mengubah tempo mendadak',
    ],
    playerDemands: [
      'Bek tengah bertubuh kokoh dengan Heading, Jumping Reach, dan Bravery tinggi',
      'Penyerang pelari cepat (pace tinggi) atau Target Forward pemantul bola',
    ],
    guideToFootballQuote: 'In a low block, the back line sits just outside the penalty area and the midfielders drop in front of them. The team defends close to its own goal, allowing the opposition possession in less dangerous areas.',
  },
};

/**
 * KNOWLEDGE: PLAY FOR SET PIECES (BOLA MATI)
 * Panduan dari GuideToFootball "Set Piece Routines"
 */
export const SET_PIECE_KNOWLEDGE = {
  instructionName: 'Play for Set Pieces',
  indonesianName: 'Cari Peluang Bola Mati',
  concept: 'Menginstruksikan pemain untuk tidak memaksakan penetrasi buntu di sepertiga akhir, melainkan memancing pelanggaran lawan, membelokkan bola ke sepak pojok (corner), atau lemparan ke dalam.',
  tacticalSynergy: [
    'Sangat mematikan ketika menghadapi lawan yang bertahan rapat (Low Block)',
    'Cocok dipadukan dengan tempo lebih lambat dan pemain berpostur tinggi',
    'Efektif jika memiliki spesialis pengambil bola mati (Corner, Free Kick, Long Throw)',
  ],
  playerProfilesRequired: [
    'Bek/Penyerang dengan Jumping Reach (>= 14) dan Heading (>= 13)',
    'Eksekutor dengan Corners / Free Kick Taking / Technique tinggi',
    'Pemain berani berduel fisik (Strength, Bravery)',
  ],
  guideToFootballQuote: 'Set pieces are the moments when the game pauses and both teams have time to organise. They produce many important goals and are among the most rehearsed parts of football.',
};
