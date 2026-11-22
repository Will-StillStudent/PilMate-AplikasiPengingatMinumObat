# DESIGN.md — MedTimer PWA

> Adaptasi web dari [Futsch1/medTimer](https://github.com/Futsch1/medTimer) (aplikasi Android pengingat obat, lisensi MIT) menjadi **Progressive Web App**. Stack mengikuti Modul 4 PWA (React + Vite + vite-plugin-pwa + Service Worker + Vercel), dengan **Supabase** sebagai database dan **API (Web Service) buatan sendiri** sesuai Modul 1.

---

## 1. Ringkasan Proyek

| Item | Isi |
|---|---|
| Nama aplikasi | MedTimer PWA |
| Referensi tema dan fitur | medTimer (Android) oleh Futsch1 |
| Tagline | *Med reminders and history* |
| Tujuan | Mengelola obat, jadwal pengingat, dan riwayat konsumsi, bisa di-install di HP dan tetap dapat dibuka saat offline |
| Database | **Supabase** (PostgreSQL) untuk operasi CRUD |
| Backend | API / Web Service buatan sendiri (Modul 1) |
| Frontend | React + Vite (PWA) |
| Hosting | Vercel (frontend) |
| Nama folder proyek | `medtimer-modul4-kelxx` |

### Tema dan contoh aplikasi yang diikuti dari repo
Tema dan contoh data mengikuti medTimer: aplikasi **pengingat obat dan pil**, dengan daftar obat, jadwal dosis harian, konfirmasi *Taken / Skipped*, riwayat dosis, stok obat, tanggal kedaluwarsa, tag, dan ekspor CSV.

> **Catatan jujur:** tema visual (warna, bentuk kartu) disusun berdasarkan README dan daftar fitur repo. Screenshot asli belum bisa saya lihat. Token warna di bagian 8.6 adalah acuan awal yang bisa disesuaikan setelah dibandingkan dengan screenshot.

### Perbedaan penting dari aplikasi asli
Aplikasi asli menyimpan data **hanya di perangkat** tanpa server. Versi ini menyimpan data di **Supabase** agar memenuhi kebutuhan CRUD dan syarat tugas, sehingga prinsip "privasi 100% offline" **tidak lagi berlaku penuh**. Bagian 12 menjelaskan konsekuensinya.

---

## 2. Ketentuan Tugas dan Pemenuhannya

| # | Ketentuan | Cara dipenuhi |
|---|---|---|
| 1 | Menggunakan API (Web Service) buatan sendiri sesuai Modul 1 | Frontend hanya berkomunikasi dengan API sendiri (`VITE_API_URL`). API inilah yang terhubung ke Supabase. Detail endpoint di bagian 6 |
| 2 | Memiliki **Bottom Navigation Bar** | Komponen `BottomNav.jsx` tetap di bawah layar dengan 4 menu: Today, Medications, History, About |
| 3 | Minimal **5 halaman** | Ada **7 halaman** (bagian 8.2) |
| 4 | Minimal **2 halaman list**, tiap item bisa diklik ke detail | **Medications → Medication Detail** dan **History → Log Detail** |
| 5 | **1 halaman Profile/About** | Halaman `About` (info aplikasi, pembuat, versi, atribusi, status koneksi dan offline) |
| 6 | Database Supabase dengan CRUD | Create, Read, Update, Delete untuk obat, pengingat, dan log dosis (bagian 5 dan 6) |

---

## 3. Stack dan Teknologi

| Lapisan | Teknologi | Peran |
|---|---|---|
| Bahasa | JavaScript (ES Modules) + JSX | Logika dan struktur UI |
| UI library | **React** (functional component, `useState`, `useEffect`, props) | UI berbasis komponen |
| Build tool | **Vite** (`--template react`) | Dev server dan bundling |
| Routing | **react-router-dom** | Navigasi antarhalaman dan halaman detail (tujuan praktikum ke-4) |
| PWA | **vite-plugin-pwa** (`registerType: 'autoUpdate'`) | Manifest dan service worker |
| Service Worker | Workbox (precache + runtime caching) | App shell offline dan cache respons API |
| Styling | CSS biasa dengan CSS variables | Tema, tanpa framework CSS |
| Web Service | API buatan sendiri (Modul 1) | Perantara frontend dan database |
| Database | **Supabase (PostgreSQL)** | Penyimpanan data dan CRUD |
| Hosting | **Vercel** (preset Vite) | Deploy HTTPS |
| Tools | VS Code, Chrome DevTools, npm, Git/GitHub | Pengembangan dan pengujian |

---

## 4. Arsitektur

```
┌───────────────────────────────────────────┐
│           Browser / PWA (React)           │
│  Pages ─ Components ─ BottomNav           │
│        │                                  │
│  ┌─────▼────────┐    ┌─────────────────┐  │
│  │ api client   │    │ Service Worker  │  │
│  │ (fetch)      │◀──▶│ precache shell  │  │
│  └─────┬────────┘    │ + cache GET API │  │
│        │             └─────────────────┘  │
└────────┼──────────────────────────────────┘
         │ HTTPS (JSON)
   ┌─────▼───────────────┐
   │  API / Web Service  │  ← buatan sendiri (Modul 1)
   │  (validasi + logika)│
   └─────┬───────────────┘
         │ Supabase client (kunci disimpan di server)
   ┌─────▼───────────────┐
   │  Supabase           │
   │  PostgreSQL         │
   └─────────────────────┘
```

**Aturan penting:**
- Frontend **tidak** langsung memegang kunci Supabase yang berhak penuh (`service_role`). Kunci tersebut hanya ada di sisi API sebagai environment variable.
- Frontend hanya mengenal `VITE_API_URL`.

---

## 5. Database Supabase

### 5.1 Skema SQL
```sql
create table medications (
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

create table reminders (
  id             uuid primary key default gen_random_uuid(),
  medication_id  uuid not null references medications(id) on delete cascade,
  time           time not null,
  days           integer[] not null default '{0,1,2,3,4,5,6}', -- 0 = Minggu
  amount         numeric not null default 1
);

create table dose_logs (
  id             uuid primary key default gen_random_uuid(),
  medication_id  uuid not null references medications(id) on delete cascade,
  scheduled_at   timestamptz,
  acted_at       timestamptz not null default now(),
  status         text not null check (status in ('taken','skipped','extra')),
  amount         numeric not null default 1,
  note           text
);

create index on reminders(medication_id);
create index on dose_logs(medication_id, acted_at desc);
```

### 5.2 Pemetaan CRUD

| Tabel | Create | Read | Update | Delete |
|---|---|---|---|---|
| `medications` | Form tambah obat | List dan detail obat | Form ubah obat | Tombol hapus di detail |
| `reminders` | Tambah jam di form obat | Jadwal di detail obat dan halaman Today | Ubah jam/hari | Hapus jam |
| `dose_logs` | Tombol *Taken / Skip* dan dosis tambahan | List dan detail log di History | Koreksi status atau catatan | Hapus log |

### 5.3 Keamanan data
- Aktifkan **Row Level Security (RLS)** pada ketiga tabel.
- Jika tanpa login, akses hanya boleh lewat API (kunci server). Jika memakai **Supabase Auth**, tambahkan kolom `user_id uuid references auth.users` dan kebijakan RLS `user_id = auth.uid()`.
- Jangan commit file `.env` ke GitHub.

---

## 6. API (Web Service) — Modul 1

> Struktur di bawah adalah rancangan REST standar. **Sesuaikan nama endpoint, format respons, dan framework dengan API yang sudah kamu buat di Modul 1.**

Base URL: `VITE_API_URL` (contoh `https://api-kamu.vercel.app`)

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/medications` | List semua obat (mendukung `?tag=`) |
| GET | `/api/medications/:id` | Detail obat beserta pengingatnya |
| POST | `/api/medications` | Tambah obat |
| PUT | `/api/medications/:id` | Ubah obat |
| DELETE | `/api/medications/:id` | Hapus obat |
| POST | `/api/medications/:id/reminders` | Tambah pengingat |
| PUT | `/api/reminders/:id` | Ubah pengingat |
| DELETE | `/api/reminders/:id` | Hapus pengingat |
| GET | `/api/today` | Daftar dosis terjadwal hari ini |
| GET | `/api/logs` | List riwayat (`?medication_id=&from=&to=`) |
| GET | `/api/logs/:id` | Detail satu log |
| POST | `/api/logs` | Catat dosis (*taken / skipped / extra*) |
| PUT | `/api/logs/:id` | Ubah log |
| DELETE | `/api/logs/:id` | Hapus log |

**Contoh respons `GET /api/medications/:id`:**
```json
{
  "id": "5f0c...",
  "name": "Paracetamol",
  "dosage": "500 mg",
  "stock": 18,
  "low_stock_at": 5,
  "expires_on": "2027-03-01",
  "tags": ["nyeri"],
  "reminders": [
    { "id": "a1...", "time": "08:00", "days": [0,1,2,3,4,5,6], "amount": 1 }
  ]
}
```

**Logika di sisi API:** saat log berstatus `taken` dibuat, stok obat berkurang sebesar `amount`. Lakukan dalam satu transaksi agar stok dan log konsisten.

---

## 7. Struktur Folder

```
medtimer-modul4-kelxx/
├── public/
│   ├── icon-192.png
│   └── icon-512.png
├── src/
│   ├── components/
│   │   ├── BottomNav.jsx        # Bottom Navigation Bar
│   │   ├── TopBar.jsx           # judul halaman + tombol kembali
│   │   ├── MedCard.jsx          # item list obat
│   │   ├── DoseItem.jsx         # satu dosis di halaman Today
│   │   ├── LogRow.jsx           # item list riwayat
│   │   ├── MedForm.jsx          # form tambah/ubah obat
│   │   ├── EmptyState.jsx
│   │   └── LoadingState.jsx
│   ├── lib/
│   │   ├── api.js               # wrapper fetch ke API sendiri
│   │   └── format.js            # format tanggal/jam
│   ├── pages/
│   │   ├── Today.jsx
│   │   ├── Medications.jsx      # LIST 1
│   │   ├── MedicationDetail.jsx # detail dari LIST 1
│   │   ├── MedicationForm.jsx   # tambah / ubah
│   │   ├── History.jsx          # LIST 2
│   │   ├── LogDetail.jsx        # detail dari LIST 2
│   │   └── About.jsx            # Profile / About
│   ├── App.jsx                  # layout + routes
│   ├── App.css
│   ├── index.css
│   └── main.jsx
├── .env                         # VITE_API_URL (jangan di-commit)
├── vercel.json
├── index.html
├── vite.config.js
└── package.json
```

---

## 8. Desain UI

### 8.1 Bottom Navigation Bar

Selalu tampil di bagian bawah pada halaman utama.

```
┌───────────────────────────────┐
│  🏠 Today │ 💊 Obat │ 🕘 Riwayat │ ℹ About │
└───────────────────────────────┘
```

| Menu | Rute | Ikon |
|---|---|---|
| Today | `/` | beranda/jam |
| Medications | `/medications` | pil |
| History | `/history` | riwayat |
| About | `/about` | info |

Perilaku: menu aktif diberi warna aksen dan label tebal. Pada halaman detail dan form, bottom nav tetap tampil, sedangkan navigasi kembali memakai tombol *back* di `TopBar`. Beri `padding-bottom` pada konten dan `env(safe-area-inset-bottom)` pada bar agar tidak tertutup di HP.

### 8.2 Daftar 7 halaman dan rute

| # | Halaman | Rute | Jenis | Isi |
|---|---|---|---|---|
| 1 | **Today** | `/` | Utama | Dosis hari ini, tombol *Taken / Skip* |
| 2 | **Medications** | `/medications` | **Utama (list)** | List semua obat, filter tag, tombol tambah |
| 3 | **Medication Detail** | `/medications/:id` | **Detail** | Info obat, stok, kedaluwarsa, jadwal, tombol ubah/hapus |
| 4 | **Medication Form** | `/medications/new`, `/medications/:id/edit` | Form | Create dan Update obat + pengingat |
| 5 | **History** | `/history` | **Utama (list)** | List riwayat dosis, filter, ekspor CSV |
| 6 | **Log Detail** | `/history/:id` | **Detail** | Detail satu log, ubah status/catatan, hapus |
| 7 | **About** | `/about` | Profile/About | Info aplikasi dan pembuat |

### 8.3 Wireframe teks

**Today**
```
┌──────────────────────────────┐
│ Hari ini                     │
│ Rabu, 18 November 2026       │
│ 2 dari 4 dosis selesai       │
├──────────────────────────────┤
│ 08:00  Paracetamol 500 mg    │
│        ✔ Taken 08:07         │
│ 12:00  Vitamin D             │
│        ✔ Taken 12:02         │
│ 18:00  Amoxicillin 500 mg    │
│        [Taken] [Skip]        │
│ 21:00  Paracetamol 500 mg    │
│        Menunggu              │
│ ⚠ Vitamin D: stok tinggal 3  │
├──────────────────────────────┤
│  Today │ Obat │ Riwayat │ About│
└──────────────────────────────┘
```

**Medications (list) → klik item → Medication Detail**
```
┌──────────────────────────────┐   ┌──────────────────────────────┐
│ Obat saya (3)        [＋]    │   │ ←  Paracetamol               │
│ Filter: [Semua ▾]            │   │ 500 mg · Sesudah makan       │
├──────────────────────────────┤   │ Stok: 18  (batas 5)          │
│ ● Paracetamol 500 mg      ›  │ → │ Kedaluwarsa: 01 Mar 2027     │
│   08:00, 21:00 · Stok 18     │   │ Tag: nyeri                   │
│ ● Vitamin D               ›  │   │ Jadwal:                      │
│   12:00 · Stok 3 ⚠           │   │  08:00 · setiap hari         │
│ ● Amoxicillin 500 mg      ›  │   │  21:00 · setiap hari         │
└──────────────────────────────┘   │ [Ubah]        [Hapus]        │
                                   └──────────────────────────────┘
```

**History (list) → klik item → Log Detail**
```
┌──────────────────────────────┐   ┌──────────────────────────────┐
│ Riwayat        [Ekspor CSV]  │   │ ←  Detail Dosis              │
│ Filter: [Semua obat ▾]       │   │ Paracetamol 500 mg           │
├──────────────────────────────┤   │ Dijadwalkan: 18 Nov 08:00    │
│ 18 Nov 08:07  Paracetamol ›  │ → │ Dikonfirmasi: 18 Nov 08:07   │
│   ✔ Taken · 1 tablet         │   │ Status: ✔ Taken              │
│ 17 Nov 21:00  Paracetamol ›  │   │ Jumlah: 1                    │
│   ✖ Skipped                  │   │ Catatan: -                   │
└──────────────────────────────┘   │ [Ubah status]    [Hapus]     │
                                   └──────────────────────────────┘
```

**About**
```
┌──────────────────────────────┐
│ Tentang aplikasi             │
│ MedTimer PWA  v1.0.0         │
│ Dibuat oleh: [Nama] · [NIM]  │
│ Kelompok: XX                 │
│ Berbasis medTimer (MIT) oleh │
│ Futsch1                      │
│ Status: ● Online / Offline   │
│ Teknologi: React, Vite, PWA, │
│ Supabase                     │
│ ⚠ Bukan alat medis           │
└──────────────────────────────┘
```

### 8.4 Routing (`App.jsx`)
```jsx
<BrowserRouter>
  <div className="shell">
    <main className="main">
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/medications" element={<Medications />} />
        <Route path="/medications/new" element={<MedicationForm />} />
        <Route path="/medications/:id" element={<MedicationDetail />} />
        <Route path="/medications/:id/edit" element={<MedicationForm />} />
        <Route path="/history" element={<History />} />
        <Route path="/history/:id" element={<LogDetail />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </main>
    <BottomNav />
  </div>
</BrowserRouter>
```
Item list memakai `<Link to={`/medications/${med.id}`}>` dan `<Link to={`/history/${log.id}`}>`.

### 8.5 Komponen dan props

| Komponen | Props |
|---|---|
| `BottomNav` | — (memakai `NavLink` untuk status aktif) |
| `TopBar` | `title`, `back` |
| `MedCard` | `med` |
| `DoseItem` | `dose`, `onTaken`, `onSkip` |
| `LogRow` | `log`, `medName` |
| `MedForm` | `initial`, `onSubmit`, `onCancel` |

Setiap halaman yang memuat data menangani tiga status: **loading**, **error**, dan **kosong**.

### 8.6 Design tokens (`index.css`)

Gaya mengikuti pola aplikasi pengingat Android: kartu bersudut membulat, aksen satu warna, ikon sederhana. Nilai warna di bawah adalah acuan awal.

```css
:root {
  --paper: #f4f8f7;
  --ink: #17242b;
  --muted: #5c6b73;
  --accent: #1f8a70;
  --warn: #c77d12;
  --danger: #b3382c;
  --line: #d6e0de;
  --panel: #ffffff;
  --nav-h: 64px;
  color-scheme: light;
  font: 17px/1.5 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  color: var(--ink);
  background: var(--paper);
}

* { box-sizing: border-box; }
body { margin: 0; }
.main { padding: 16px 16px calc(var(--nav-h) + 24px); }

.bottom-nav {
  position: fixed; left: 0; right: 0; bottom: 0;
  height: calc(var(--nav-h) + env(safe-area-inset-bottom, 0px));
  padding-bottom: env(safe-area-inset-bottom, 0px);
  display: flex; background: var(--panel);
  border-top: 1px solid var(--line);
}
.bottom-nav a { flex: 1; display: grid; place-items: center; color: var(--muted); text-decoration: none; }
.bottom-nav a.active { color: var(--accent); font-weight: 700; }

:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

### 8.7 Prinsip UX
- Mobile-first, target sentuh minimal 44 px.
- Status tidak hanya warna: selalu disertai ikon atau teks (✔, ✖, ⚠).
- Konfirmasi sebelum menghapus data.
- Bahasa antarmuka: Indonesia.

---

## 9. Konfigurasi PWA

### 9.1 `vite.config.js`
```js
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      manifest: {
        name: 'MedTimer',
        short_name: 'MedTimer',
        description: 'Pengingat obat dan riwayat konsumsi.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f4f8f7',
        theme_color: '#1f8a70',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // cache respons GET dari API sendiri
            urlPattern: ({ url, request }) =>
              request.method === 'GET' && url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
    }),
  ],
})
```
> Jika API berada di domain berbeda dari frontend, ganti `url.pathname.startsWith('/api/')` dengan pengecekan `url.origin` terhadap domain API, dan aktifkan CORS di API.

### 9.2 Strategi caching
| Aset | Strategi | Alasan |
|---|---|---|
| App shell (HTML, JS, CSS, ikon) | **Precache** | Aplikasi tetap terbuka saat offline |
| `GET /api/*` | **NetworkFirst** | Data terbaru saat online, data terakhir tersimpan saat offline |
| `POST/PUT/DELETE` | Tidak di-cache | Perubahan butuh koneksi |

### 9.3 Perilaku offline
- **Bisa:** membuka aplikasi dan membaca data yang sudah pernah dimuat.
- **Belum bisa:** menambah, mengubah, atau menghapus saat offline. Tampilkan pesan "Anda sedang offline, perubahan belum bisa disimpan" dan nonaktifkan tombol aksi.
- **Opsional (Fase 3):** antrean tulis offline dengan `workbox-background-sync`.

### 9.4 Service worker manual (tujuan praktikum ke-5)
Bila diminta menulis service worker sendiri, ubah plugin ke `strategies: 'injectManifest'` dengan `src/sw.js`:
```js
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

registerRoute(
  ({ url, request }) => request.method === 'GET' && url.pathname.startsWith('/api/'),
  new NetworkFirst({ cacheName: 'api-cache', networkTimeoutSeconds: 5 })
)

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
```

---

## 10. Pemetaan Fitur Android → PWA

| Fitur MedTimer asli | Status | Keterangan |
|---|---|---|
| Kelola banyak obat | ✅ Fase 1 | CRUD obat via API + Supabase |
| Pengingat harian per obat | ✅ Fase 1 | Tabel `reminders` |
| Konfirmasi / lewati dosis | ✅ Fase 1 | Tombol *Taken / Skip* → `dose_logs` |
| Riwayat dosis | ✅ Fase 1 | Halaman History + Log Detail |
| Hari tertentu / jeda | ✅ Fase 2 | Kolom `days` |
| Dosis tambahan | ✅ Fase 2 | Status `extra` |
| Stok dan pengingat stok habis | ✅ Fase 2 | Stok berkurang otomatis |
| Tanggal kedaluwarsa | ✅ Fase 2 | Peringatan di UI |
| Ekspor CSV | ✅ Fase 2 | Dibuat dari data log |
| Backup / restore JSON | ✅ Fase 3 | Ekspor dan impor via API |
| Tag dan filter | ✅ Fase 3 | Kolom `tags` |
| Kalender dan grafik riwayat | ⚠️ Fase 3 | Opsional |
| Notifikasi saat app tertutup | ⚠️ Terbatas | Lihat bagian 11 |
| Alarm menembus mode silent | ❌ | Tidak tersedia di web |
| Snooze berbasis lokasi | ❌ | Di luar cakupan |

---

## 11. Pengingat dan Notifikasi

| Skenario | Pendekatan | Keandalan |
|---|---|---|
| App terbuka | `setInterval` memeriksa jadwal dari `/api/today`, lalu banner + `Notification` API | Tinggi |
| App di background | `registration.showNotification` lewat service worker | Sedang |
| App tertutup total | Perlu Web Push dari server, dukungan bergantung peramban | Rendah |

Keputusan: minta izin notifikasi lewat tombol eksplisit; saat app dibuka, tampilkan dosis yang terlewat sebagai "Perlu dikonfirmasi"; tulis di halaman About bahwa pengingat paling andal saat app terbuka. Web Push tidak masuk Fase 1.

---

## 12. Privasi dan Keamanan

- Data kesehatan kini tersimpan di **cloud (Supabase)**, tidak lagi hanya di perangkat. Cantumkan hal ini jujur di halaman About.
- Aktifkan RLS di Supabase; simpan `service_role` hanya di environment variable API.
- Gunakan HTTPS (Vercel) dan batasi CORS ke domain frontend.
- Tanpa login, siapa pun yang tahu URL API bisa mengakses data. Untuk aplikasi nyata, tambahkan **Supabase Auth** (opsional, Fase 3).
- Validasi input di API (nama wajib, stok tidak negatif, status hanya `taken|skipped|extra`).
- Tampilkan disclaimer bahwa aplikasi ini bukan alat medis.

---

## 13. Rencana Pengembangan

### Fase 1 — MVP (memenuhi semua syarat tugas)
- [ ] Inisialisasi Vite + React, instal `vite-plugin-pwa` dan `react-router-dom`
- [ ] Buat proyek Supabase, jalankan skema SQL (bagian 5.1)
- [ ] Hubungkan API Modul 1 ke Supabase dan buat endpoint CRUD (bagian 6)
- [ ] `index.css`, `App.css`, `BottomNav`, `TopBar`
- [ ] 7 halaman + routing (bagian 8.2 dan 8.4)
- [ ] List → detail untuk Medications dan History
- [ ] Form tambah/ubah/hapus obat
- [ ] Catat dosis *Taken / Skip*
- [ ] Manifest, ikon, service worker, uji offline
- [ ] Deploy Vercel + `vercel.json`

### Fase 2 — Fitur inti MedTimer
- [ ] Hari aktif, dosis tambahan, stok, kedaluwarsa
- [ ] Notifikasi saat app terbuka
- [ ] Ekspor CSV

### Fase 3 — Penyempurnaan
- [ ] Tag dan filter, backup/restore JSON
- [ ] Antrean tulis offline
- [ ] Supabase Auth
- [ ] Service worker manual (`injectManifest`)

---

## 14. Pengujian dan Deployment

```bash
npm run dev                      # pengembangan
npm run build                    # build produksi
npm run preview -- --host        # uji di HP (satu jaringan Wi-Fi)
```

### Checklist uji
| Uji | Hasil diharapkan |
|---|---|
| Bottom nav tampil dan berpindah halaman | 4 menu berfungsi, menu aktif tersorot |
| Jumlah halaman | Minimal 5 (target 7) bisa diakses |
| List → detail (Medications) | Klik item membuka `/medications/:id` |
| List → detail (History) | Klik item membuka `/history/:id` |
| Create / Read / Update / Delete | Perubahan muncul di Supabase |
| Halaman About | Ada info aplikasi dan pembuat |
| Service worker | Status *activated and running* |
| Manifest | Nama, ikon, warna terbaca |
| Offline | App terbuka, data cache terbaca, tombol aksi dinonaktifkan |
| Install | Muncul ikon di home screen dan berjalan *standalone* |

### Deploy ke Vercel
1. Push ke GitHub.
2. Vercel → **Add New → Project → Import Git Repository**, preset **Vite**.
3. Isi *Environment Variables* → `VITE_API_URL`.
4. Tambahkan `vercel.json` agar rute React Router tidak 404 saat di-refresh:
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```
5. Deploy, lalu uji di HP.

> API (Web Service) di-deploy terpisah sesuai Modul 1. Simpan `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` hanya di environment variable API.

---

## 15. Atribusi dan Lisensi
- Konsep, tema, dan fitur mengacu pada **MedTimer** oleh Futsch1 (lisensi **MIT**). Proyek ini adalah adaptasi, bukan fork kode, karena aplikasi asli ditulis dengan Kotlin/Java untuk Android.
- Cantumkan atribusi dan lisensi MIT di README dan halaman About.
- Ikon: gunakan aset sendiri atau berlisensi bebas.

---

## 16. Pertanyaan Terbuka
1. Detail API Modul 1 (framework, nama endpoint, format respons) perlu dicocokkan dengan bagian 6.
2. Apakah perlu login (Supabase Auth), atau cukup tanpa akun untuk tugas ini?
3. Apakah service worker harus ditulis manual, atau cukup `generateSW`?
4. Token warna dan bentuk komponen perlu dibandingkan dengan screenshot asli medTimer.
