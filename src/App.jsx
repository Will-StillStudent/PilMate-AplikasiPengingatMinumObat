import { useState, useEffect, useRef } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import TopBar from './components/TopBar';
import BottomNav from './components/BottomNav';

import Today from './pages/Today';
import Medications from './pages/Medications';
import MedicationDetail from './pages/MedicationDetail';
import MedicationForm from './pages/MedicationForm';
import History from './pages/History';
import LogDetail from './pages/LogDetail';
import About from './pages/About';

import { api } from './lib/api';
import './App.css';

export default function App() {
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor status online / offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [alertDose, setAlertDose] = useState(null);
  const notifiedSetRef = useRef(new Set());
  const alarmAudioRef = useRef(null);
  const alarmTimerRef = useRef(null);

  const stopAlarm = () => {
    if (alarmTimerRef.current) {
      clearTimeout(alarmTimerRef.current);
      alarmTimerRef.current = null;
    }
    if (alarmAudioRef.current) {
      try {
        alarmAudioRef.current.pause();
        alarmAudioRef.current.currentTime = 0;
      } catch {}
      alarmAudioRef.current = null;
    }
  };

  // Suara alarm pengingat (/alarm.mp3 berbunyi selama 15 detik)
  const playChime = () => {
    stopAlarm();
    try {
      const audio = new Audio('/alarm.mp3');
      audio.volume = 0.95;
      audio.loop = true; // looping agar berbunyi penuh selama 15 detik
      alarmAudioRef.current = audio;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          fallbackChime();
        });
      }

      // Berhenti otomatis setelah 15 detik
      alarmTimerRef.current = setTimeout(() => {
        stopAlarm();
      }, 15000);
    } catch {
      fallbackChime();
    }
  };

  const fallbackChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch {
      // audio context blocked by browser until user interacts
    }
  };

  // Notifikasi sistem (banner desktop / bar HP)
  const triggerSystemNotification = async (dose, timeStr) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const title = `⏰ Waktunya Minum: ${dose.medication_name}`;
    const options = {
      body: `Jadwal ${timeStr} · Dosis: ${dose.dosage || ''} (${dose.amount || 1} unit). Buka PilMate untuk konfirmasi.`,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `dose-${dose.reminder_id || dose.medication_id}-${timeStr}`,
      requireInteraction: true
    };

    if ('vibrate' in navigator) {
      try { navigator.vibrate([300, 150, 300]); } catch { }
    }

    let sent = false;
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification(title, options);
          sent = true;
        }
      } catch { }
    }

    if (!sent) {
      try {
        const n = new Notification(title, options);
        n.onclick = () => { window.focus(); };
      } catch { }
    }
  };

  // Timer pemeriksaan jadwal pengingat tersinkronisasi waktu device
  useEffect(() => {
    const checkSchedule = async () => {
      try {
        const doses = await api.getToday();
        const now = new Date();
        const currentHours = String(now.getHours()).padStart(2, '0');
        const currentMins = String(now.getMinutes()).padStart(2, '0');
        const currentTime = `${currentHours}:${currentMins}`;

        doses.forEach(dose => {
          const doseTime = (dose.time || '').substring(0, 5);
          
          // Trigger alarm saat jam device tepat mencapai jam jadwal obat (currentTime === doseTime)
          // dan status obat belum diambil/dilewati ('pending' atau 'due')
          const isTimeMatch = doseTime === currentTime;
          const isActionable = dose.status === 'pending' || dose.status === 'due';

          if (isActionable && isTimeMatch) {
            const reminderKey = `${dose.reminder_id || dose.medication_id}_${doseTime}_${now.toDateString()}`;
            if (!notifiedSetRef.current.has(reminderKey)) {
              notifiedSetRef.current.add(reminderKey);

              // 1. Bunyikan suara pengingat alarm.mp3 (berbunyi hingga 15 detik)
              playChime();

              // 2. Munculkan pop-up modal di dalam layar aplikasi
              setAlertDose(dose);

              // 3. Tembakkan notifikasi banner sistem native browser & getar
              triggerSystemNotification(dose, doseTime);
            }
          }
        });
      } catch (err) {
        console.warn('Pemeriksaan jadwal error:', err);
      }
    };

    // Jalankan seketika saat dimuat
    checkSchedule();

    // Periksa rutin setiap 5 detik agar responsif saat pergantian menit pada jam device
    const interval = setInterval(checkSchedule, 5000);
    return () => clearInterval(interval);
  }, []);

  // Tentukan judul dan navigasi TopBar berdasarkan path
  const getTopBarConfig = () => {
    const path = location.pathname;

    if (path === '/') {
      const monthYear = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return {
        title: `Overview - ${monthYear}`
      };
    }
    if (path === '/medications') {
      return {
        title: 'Medicine'
      };
    }
    if (path === '/medications/new') {
      return {
        title: 'Add Medicine',
        back: '/medications'
      };
    }
    if (path.startsWith('/medications/') && path.endsWith('/edit')) {
      return {
        title: 'Edit Medicine',
        back: true
      };
    }
    if (path.startsWith('/medications/')) {
      return {
        title: 'Medicine Details',
        back: '/medications'
      };
    }
    if (path === '/history') {
      return {
        title: 'Analysis'
      };
    }
    if (path.startsWith('/history/')) {
      return {
        title: 'Log Details',
        back: '/history'
      };
    }
    if (path === '/about') {
      return {
        title: 'About'
      };
    }
    return { title: 'PilMate' };
  };

  const topBarConfig = getTopBarConfig();

  return (
    <div className="shell">
      {/* Banner status offline */}
      {!isOnline && (
        <div className="offline-banner" role="alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0119 12.55" />
            <path d="M5 12.55a10.94 10.94 0 015.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0122.58 9" />
            <path d="M1.42 9a15.91 15.91 0 014.7-2.88" />
            <path d="M8.53 16.11a6 6 0 016.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
          <span>Offline Mode — You can still access cached data</span>
        </div>
      )}

      {/* Top Bar */}
      <TopBar
        title={topBarConfig.title}
        subtitle={topBarConfig.subtitle}
        back={topBarConfig.back}
      />

      {/* Page Content */}
      <main className="main">
        <Routes>
          <Route path="/" element={<Today isOnline={isOnline} />} />
          <Route path="/medications" element={<Medications isOnline={isOnline} />} />
          <Route path="/medications/new" element={<MedicationForm isOnline={isOnline} />} />
          <Route path="/medications/:id" element={<MedicationDetail isOnline={isOnline} />} />
          <Route path="/medications/:id/edit" element={<MedicationForm isOnline={isOnline} />} />
          <Route path="/history" element={<History isOnline={isOnline} />} />
          <Route path="/history/:id" element={<LogDetail isOnline={isOnline} />} />
          <Route path="/about" element={<About isOnline={isOnline} />} />
        </Routes>
      </main>

      {/* Pop-up Reminder Modal */}
      {alertDose && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ textAlign: 'center', borderTop: '6px solid var(--accent)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>⏰</div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--ink)' }}>
              Time to Take Your Medication!
            </h3>
            <p style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--accent)', marginTop: '6px' }}>
              {alertDose.medication_name} {alertDose.dosage ? `(${alertDose.dosage})` : ''}
            </p>
            <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginTop: '4px' }}>
              Schedule: {alertDose.time} · Amount: {alertDose.amount || 1} dose(s)
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={async () => {
                  try {
                    const now = new Date();
                    const [h, m] = (alertDose.time || '00:00').split(':');
                    // Buat scheduled_at pakai local time agar matching di getToday() benar
                    const schedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(h), Number(m), 0);
                    await api.createLog({
                      medication_id: alertDose.medication_id,
                      medication_name: alertDose.medication_name,
                      scheduled_at: schedDate.toISOString(),
                      acted_at: now.toISOString(),
                      status: 'taken',
                      amount: alertDose.amount || 1,
                      note: `Confirmed from reminder at ${alertDose.time}`
                    });
                  } catch (e) {
                    console.error(e);
                  }
                  stopAlarm();
                  setAlertDose(null);
                  window.location.reload();
                }}
              >
                ✔ Taken
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  stopAlarm();
                  setAlertDose(null);
                }}
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

