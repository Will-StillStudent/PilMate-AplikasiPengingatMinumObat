// Helper fungsi formatting tanggal & waktu untuk PilMate PWA

const DAYS_INDO = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS_INDO = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];
const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

/**
 * Format tanggal panjang Indonesia: "Rabu, 18 November 2026"
 */
export function formatDateIndo(dateInput = new Date()) {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  const dayName = DAYS_INDO[d.getDay()];
  const date = d.getDate();
  const monthName = MONTHS_INDO[d.getMonth()];
  const year = d.getFullYear();
  return `${dayName}, ${date} ${monthName} ${year}`;
}

/**
 * Format tanggal pendek: "18 Nov 2026"
 */
export function formatDateShort(dateInput) {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Format jam menit: "08:00"
 */
export function formatTime(timeInput) {
  if (!timeInput) return '--:--';
  if (typeof timeInput === 'string' && /^\d{2}:\d{2}/.test(timeInput)) {
    return timeInput.substring(0, 5);
  }
  const d = new Date(timeInput);
  if (isNaN(d.getTime())) return '--:--';
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Format tanggal & jam singkat: "18 Nov 08:07"
 */
export function formatDateTime(dateInput) {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  const date = d.getDate();
  const month = MONTHS_SHORT[d.getMonth()];
  const time = formatTime(d);
  return `${date} ${month} ${time}`;
}

/**
 * Format hari-hari aktif pengingat
 * days: [0, 1, 2, 3, 4, 5, 6] -> "Setiap hari"
 * days: [1, 2, 3, 4, 5] -> "Senin - Jumat"
 */
export function formatReminderDays(days = [0, 1, 2, 3, 4, 5, 6]) {
  if (!days || days.length === 0) return 'Tidak aktif';
  if (days.length === 7) return 'Setiap hari';
  if (days.length === 5 && [1, 2, 3, 4, 5].every(d => days.includes(d))) {
    return 'Hari kerja (Sen - Jum)';
  }
  if (days.length === 2 && [0, 6].every(d => days.includes(d))) {
    return 'Akhir pekan (Sab - Min)';
  }
  const sorted = [...days].sort((a, b) => a - b);
  return sorted.map(d => DAYS_SHORT[d]).join(', ');
}

/**
 * Menghitung selisih kedaluwarsa dalam hari
 */
export function getExpiryStatus(expiryDateStr) {
  if (!expiryDateStr) return null;
  const exp = new Date(expiryDateStr);
  if (isNaN(exp.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  exp.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: 'expired', label: 'Expired', days: diffDays };
  }
  if (diffDays <= 30) {
    return { status: 'soon', label: `Expires in ${diffDays} days`, days: diffDays };
  }
  return { status: 'valid', label: `Expires ${formatDateShort(expiryDateStr)}`, days: diffDays };
}

