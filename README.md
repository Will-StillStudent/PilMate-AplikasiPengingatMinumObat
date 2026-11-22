# PilMate - Medication Reminder & Consumption History

<p align="center">
  <img src="public/icon-192.png" alt="PilMate Logo" width="100" style="border-radius: 24px;" />
</p>

<p align="center">
  <strong>Version 1.0.0 · Progressive Web App (PWA)</strong>
</p>

---

## 📋 Deskripsi Aplikasi (About PilMate)

**PilMate** adalah aplikasi *Progressive Web App (PWA)* modern yang dirancang untuk mengelola inventaris obat, jadwal pengingat, dan riwayat konsumsi obat harian. Aplikasi ini dapat diinstal langsung ke perangkat Anda (Desktop, Android, iOS) layaknya aplikasi native dan dapat diakses secara penuh meskipun tanpa koneksi internet (*offline-ready*). PilMate membantu pengguna mengorganisasi obat-obatan, melacak kepatuhan dosis secara tepat waktu, dan menjaga pola hidup sehat secara teratur.

### Identitas Proyek:
- **Aplikasi:** PilMate (Pill & Medication Management Companion)
- **Versi:** 1.0.0
- **Pengembang:** Willybrordus Anugrah Gusti
- **Universitas:** Universitas Diponegoro

---

## 📱 Daftar Halaman & Fitur Aplikasi

Aplikasi PilMate terdiri dari 7 halaman utama dengan navigasi intuitif di bagian bawah (*Bottom Navigation Bar*):

### 1. Halaman Overview / Today (`/`)
Halaman beranda utama yang menampilkan timeline jadwal minum obat pada hari yang dipilih.
- **7-Day Horizontal Date Strip:** Navigasi tanggal berbentuk strip kalender horizontal (3 hari sebelumnya s/d 3 hari ke depan) lengkap dengan tombol panah minggu sebelumnya/berikutnya.
- **Segmented Status Filter:** Kotak filter dengan notch label modern untuk menyaring dosis berdasarkan status:
  - 🔘 **All:** Menampilkan seluruh jadwal obat hari ini.
  - 🟢 **Taken (✔):** Hanya menampilkan dosis yang sudah diminum.
  - 🔴 **Skipped (✖):** Hanya menampilkan dosis yang dilewati.
  - 🔔 **Pending:** Menampilkan dosis yang belum tiba waktunya.
  - ⏰ **Due:** Menampilkan dosis yang sudah memasuki jadwal minum obat saat ini.
- **Tag Filter Bar:** Filter cepat berdasarkan 4 kategori obat resmi (**Vitamins**, **Supplements**, **Energy**, **Important**) yang dapat dibuka melalui tombol ikon tag di TopBar.
- **Interactive Timeline List:** Daftar dosis harian dengan garis pelacak status (*timeline track*) dan badge gambar obat sesuai tag.
- **One-Click Status Toggle:** Klik tombol status pada dosis untuk mengubah status secara langsung (Pending ➔ Taken ➔ Skipped).
- **Extended FAB (+ Log Additional Dose):** Tombol aksi mengambang untuk mencatat konsumsi obat tambahan di luar jadwal rutin secara instan.

### 2. Halaman Medicine Inventory (`/medications`)
Halaman manajemen inventaris seluruh obat yang tersimpan.
- **Medication Cards:** Menampilkan nama obat, dosis, sisa stok, peringatan stok menipis (*low stock alert*), masa berlaku obat (*expiry date*), jam pengingat harian, dan badge gambar tag.
- **Tag Category Filter:** Bilah filter tag di bagian atas (**All Tags**, **Vitamins**, **Supplements**, **Energy**, **Important**) untuk memfilter kartu obat.
- **Expiry Status Indicator:** Deteksi otomatis masa kedaluwarsa obat:
  - Hijau: Masa berlaku masih aman.
  - Oranye: Kedaluwarsa dalam waktu kurang dari 30 hari.
  - Merah: Obat telah kedaluwarsa.
- **Add Medicine Shortcut:** Tombol navigasi cepat untuk mendaftarkan obat baru.

### 3. Halaman Medicine Details (`/medications/:id`)
Halaman informasi lengkap satu obat tertentu.
- Menampilkan rincian dosis, tag kategori, catatan khusus, status stok obat, dan badge masa kedaluwarsa.
- **Schedules List:** Daftar seluruh jadwal pengingat untuk obat tersebut beserta hari aktif dalam seminggu (Minggu s/d Sabtu).
- **Action Buttons:** Tombol **Edit Medicine** untuk memperbarui data dan **Delete Medicine** untuk menghapus obat beserta seluruh pengingatnya (dengan dialog konfirmasi).

### 4. Halaman Add & Edit Medicine (`/medications/new` & `/medications/:id/edit`)
Formulir input dan pembaruan data obat yang responsif.
- Input data utama: Nama obat, dosis (e.g. `500mg`, `2 tablets`), jumlah stok, ambang batas peringatan stok menipis, tanggal kedaluwarsa, dan catatan.
- **Interactive 4-Tag Selector:** Pemilihan tag resmi dengan tampilan kartu visual dan gambar asli dari kategori (**Vitamins**, **Supplements**, **Energy**, **Important**).
- **Multi-Reminder Scheduler:** Fleksibilitas menambahkan banyak jam pengingat sekaligus, mengatur jumlah butir obat per sesi, serta memilih hari aktif minum obat.

### 5. Halaman Analysis & Adherence Report (`/history`)
Pusat analitik dan laporan kepatuhan konsumsi obat yang komprehensif.
- **Period Filter:** Pilihan rentang waktu analisis fleksibel (7 hari, 14 hari, 30 hari, 90 hari, 6 bulan, hingga 1 tahun).
- **4 Tampilan Analisis (Tab):**
  1. 📊 **Bar Chart View:** Grafik balok bertumpuk (*stacked vertical bars*) harian yang menunjukkan proporsi konsumsi per jenis obat, dilengkapi 2 grafik *SVG Pie Chart* (Persentase periode terpilih vs Persentase total keseluruhan).
  2. 📋 **Table View:** Tabel detail riwayat konsumsi obat yang dapat dicari/difilter (*Search Filter Box*), memuat kolom: Waktu Minum (*Taken*), Nama Obat (*Name*), Dosis (*Dosage*), dan Status (*Status*).
  3. 📅 **Calendar View:** Kalender matriks bulanan interaktif. Mengklik tanggal tertentu akan menampilkan daftar riwayat konsumsi obat pada tanggal tersebut.
  4. 📈 **Trend View:** Visualisasi garis tren konsumsi obat harian sepanjang periode.
- **Export CSV Report:** Tombol untuk mengunduh seluruh data riwayat konsumsi obat ke dalam file spreadsheet format `.csv`.

### 6. Halaman Log Detail (`/history/:id`)
Halaman inspeksi satu catatan riwayat minum obat tertentu.
- Menampilkan waktu terjadwal, waktu eksekusi aktual, jumlah dosis yang diminum, status kepatuhan, serta catatan.
- **Edit Log Mode:** Memperbarui status dosis (*Taken*, *Skipped*, *Extra Dose*), mengganti jumlah obat, dan menambahkan catatan kejadian.
- **Delete Record:** Menghapus catatan log dari riwayat database.

### 7. Halaman About & PWA Settings (`/about`)
Halaman informasi identitas aplikasi dan fitur native perangkat.
- Identitas developer, kelompok praktikum, dan universitas.
- **Reminder Notifications:** Pengaturan izin Web Notification API browser dengan tombol **Test Notification** untuk menguji alarm browser langsung ke layar perangkat.
- **Download For Offline Use:** Tombol instalasi PWA native ke perangkat pengguna.

---

## 🏗 Arsitektur Aplikasi

PilMate dibangun menggunakan arsitektur **Offline-First Progressive Web App** yang terhubung langsung dengan backend cloud database **Supabase**.

```
+---------------------------------------------------------------+
|                      PilMate PWA Client                       |
|               (React 19 + Vite 6 + React Router v7)          |
+-------------------------------+-------------------------------+
                                |
             +------------------+------------------+
             |                                     |
             v                                     v
+------------------------+           +---------------------------+
|   Supabase Cloud DB    |           |   Browser LocalStorage    |
| (PostgreSQL + RLS Auth)|           |     (Offline Cache)       |
|  - medications         |           |  - pilmate_medications    |
|  - reminders           |           |  - pilmate_dose_logs      |
|  - dose_logs           |           |  - offline fallback       |
+------------------------+           +---------------------------+
             ^                                     ^
             |                                     |
             +----------- Service Worker ----------+
                     (VitePWA + Workbox 7)
                  - Precached Static Assets
                  - Offline Manifest Webmanifest
                  - Push & Notification Handlers
```

### Komponen Arsitektur:
1. **Frontend Framework:** React 19 dengan React Router v7 untuk *client-side single-page routing (SPA)*.
2. **Build Tool & Dev Server:** Vite 6 dengan kustom middleware plugin untuk melayani aset gambar lokal secara instan.
3. **Desain & UI Tokens:** Mengadopsi sistem token desain **Material Design 3 (Material You)** dengan palet warna teal (`#1f8a70`) dan navy (`#295383`).
4. **Service Worker & PWA:** Dikelola menggunakan `vite-plugin-pwa` dan Workbox untuk precaching seluruh aset statis, font, dan gambar, sehingga aplikasi dapat berjalan 100% tanpa internet.
5. **Backend Database:** Cloud PostgreSQL berbasis **Supabase** dengan autentikasi API Anon Key / Service Role dan *Row Level Security (RLS)*.
6. **Sinkronisasi Offline-First:**
   - **Kondisi Online:** Aplikasi melakukan kueri langsung ke Supabase melalui `@supabase/supabase-js`, lalu otomatis memperbarui cache di `localStorage`.
   - **Kondisi Offline:** Aplikasi secara transparan beralih membaca dan menulis ke `localStorage`, mencegah aplikasi macet atau *crash* saat koneksi hilang.

---

## 🚀 Panduan Menjalankan Aplikasi

### 1. Prasyarat Sistem
- **Node.js:** Versi 18.0.0 atau lebih baru (Disarankan versi LTS).
- **NPM:** Bawaan dari instalasi Node.js.
- Browser modern yang mendukung PWA (Google Chrome, Microsoft Edge, Mozilla Firefox, atau Safari).

---

### 2. Konfigurasi Environment (`.env`)
Pastikan file `.env` di dalam folder root `TA_PPB` sudah memuat konfigurasi Supabase Anda:

```env
PORT=3001
SUPABASE_URL=https://cfikyfvytjcccrhhbndm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_publishable_JbhUqaS5sY3XJXKdGbkfhQ_mxyLEw-A
VITE_SUPABASE_URL=https://cfikyfvytjcccrhhbndm.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_JbhUqaS5sY3XJXKdGbkfhQ_mxyLEw-A
```

---

### 3. Instalasi Dependensi
Buka terminal di dalam folder `TA_PPB`, lalu jalankan:

```bash
npm install
```

---

### 4. Menjalankan Aplikasi di Mode Pengembangan (Development)
Untuk menjalankan Vite dev server lokal:

```bash
npm run dev
```

Buka URL yang ditampilkan di terminal pada browser Anda:
```
http://localhost:5173
```

---

### 5. Membangun Aplikasi untuk Produksi (Production Build)
Untuk mengompilasi dan mengoptimasi aplikasi menjadi bundel produksi PWA:

```bash
npm run build
```

Hasil build akan disimpan di folder `dist/` lengkap dengan `sw.js` (Service Worker) dan `manifest.webmanifest`.

Untuk menguji hasil build produksi secara lokal:
```bash
npm run preview
```

---

## 💾 Skema Database Supabase

Jika Anda ingin mereplikasi database di proyek Supabase baru, jalankan kueri SQL berikut pada menu **SQL Editor** di Supabase Dashboard (tersedia juga di file `supabase_schema.sql`):

```sql
create table if not exists medications (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  dosage        text,
  notes         text,
  color         text default '#1f8a70',
  tags          text[] default '{}',
  stock         integer not null default 0,
  low_stock_at  integer not null default 0,
  expires_on    date,
  created_at    timestamptz not null default now()
);

create table if not exists reminders (
  id             uuid primary key default gen_random_uuid(),
  medication_id  uuid not null references medications(id) on delete cascade,
  time           time not null,
  days           integer[] not null default '{0,1,2,3,4,5,6}',
  amount         numeric not null default 1
);

create table if not exists dose_logs (
  id             uuid primary key default gen_random_uuid(),
  medication_id  uuid not null references medications(id) on delete cascade,
  scheduled_at   timestamptz,
  acted_at       timestamptz not null default now(),
  status         text not null check (status in ('taken','skipped','extra')),
  amount         numeric not null default 1,
  note           text
);
```

---

## 📲 Cara Instalasi PWA (Standalone App)

Aplikasi ini dapat diinstal langsung ke perangkat tanpa melalui Google Play Store atau Apple App Store:

- **Desktop (Google Chrome / Microsoft Edge):**
  Klik ikon **Install** (🖥⬇) di sisi kanan bilah alamat URL (address bar), atau buka halaman **About** lalu klik tombol **Install**.
- **Android (Chrome):**
  Tekan tombol Menu titik tiga (⋮) di pojok kanan atas browser > Pilih **Install app** atau **Add to Home screen**.
- **iPhone / iPad (Safari):**
  Tekan tombol **Share** (⎋) di bilah bawah browser > Pilih **Add to Home Screen**.


