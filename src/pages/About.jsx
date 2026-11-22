import { useState, useEffect } from 'react';

export default function About({ isOnline = true }) {
  const [notifPermission, setNotifPermission] = useState('default');
  const [notifSupported, setNotifSupported] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(
    typeof window !== 'undefined' ? window.deferredInstallPrompt : null
  );
  const [isInstalled, setIsInstalled] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(display-mode: standalone)').matches : false
  );

  useEffect(() => {
    if ('Notification' in window) {
      setNotifSupported(true);
      setNotifPermission(Notification.permission);
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      window.deferredInstallPrompt = e;
      setInstallPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      window.deferredInstallPrompt = null;
      setInstallPrompt(null);
    };

    const handleInstallable = () => {
      if (window.deferredInstallPrompt) {
        setInstallPrompt(window.deferredInstallPrompt);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('pwa-installed', handleAppInstalled);
    window.addEventListener('pwa-installable', handleInstallable);

    if (window.deferredInstallPrompt) {
      setInstallPrompt(window.deferredInstallPrompt);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('pwa-installed', handleAppInstalled);
      window.removeEventListener('pwa-installable', handleInstallable);
    };
  }, []);

  // Langsung jalankan fungsi instalasi native PWA browser
  const handleInstallClick = async () => {
    const promptEvent = window.deferredInstallPrompt || installPrompt;
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
        }
        window.deferredInstallPrompt = null;
        setInstallPrompt(null);
        return;
      } catch (err) {
        console.error(err);
      }
    }

    if (window.matchMedia('(display-mode: standalone)').matches || isInstalled) {
      alert('PilMate is already installed and ready for offline use on this device.');
      return;
    }

    alert('To install PilMate to your device:\n\n• On Chrome / Edge (Desktop): Click the "Install" icon (🖥⬇) in the browser address bar, or click Menu (⋮) > Install PilMate.\n• On Android (Chrome): Tap Menu (⋮) > Install app or Add to Home screen.\n• On iPhone / iPad (Safari): Tap Share (⎋) > Add to Home Screen.');
  };

  const handleRequestNotif = async () => {
    if (!('Notification' in window)) {
      alert('Your browser does not support the Web Notification API.');
      return;
    }

    if (Notification.permission === 'denied') {
      alert('Notification permission is currently blocked by your browser.\n\nTo enable:\n1. Click the lock/settings icon next to the browser URL.\n2. Change "Notifications" to "Allow".\n3. Reload the page.');
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);

      if (perm === 'granted') {
        const notifTitle = 'PilMate';
        const notifOptions = {
          body: 'Medication reminders ready! We will notify you when it is time to take your dose.',
          icon: '/icon-192.png',
          badge: '/icon-192.png'
        };

        let notificationSent = false;

        try {
          const n = new Notification(notifTitle, notifOptions);
          n.onclick = () => { window.focus(); };
          notificationSent = true;
        } catch { }

        if (!notificationSent && 'serviceWorker' in navigator) {
          try {
            const reg = await Promise.race([
              navigator.serviceWorker.ready,
              new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
            ]);
            if (reg && reg.showNotification) {
              await reg.showNotification(notifTitle, notifOptions);
              notificationSent = true;
            }
          } catch { }
        }

        alert('🔔 Test reminder notification sent successfully!\n\nIf the banner does not appear:\n• Check whether Windows Focus Assist / Do Not Disturb is enabled.\n• Open Windows Notification Center at the bottom-right taskbar.');
      } else if (perm === 'denied') {
        alert('Notification permission was denied. You can allow it from the browser address bar settings.');
      }
    } catch (err) {
      console.error(err);
      alert(`An error occurred: ${err.message}`);
    }
  };

  return (
    <div>
      <div className="section-header" style={{ marginTop: '4px' }}>
        <h2 className="section-title">About Application</h2>
      </div>

      {/* Project Identity */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
          <img
            src="/icon-192.png"
            alt="PilMate Logo"
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              objectFit: 'cover',
              boxShadow: 'var(--shadow-sm)',
              flexShrink: 0
            }}
          />
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0, color: 'var(--ink)' }}>PilMate</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: 0 }}>Version 1.0.0 · Progressive Web App</p>
          </div>
        </div>

        <p style={{ fontSize: '0.92rem', color: 'var(--ink)', lineHeight: '1.6', marginBottom: '16px' }}>
          PilMate is a Progressive Web App designed to manage medications, reminder schedules, and consumption history. It can be installed directly onto your device like a native application and remains accessible while offline. PilMate helps you organize your medicines, keep track of doses, and maintain healthy compliance seamlessly.
        </p>

        <div style={{ fontSize: '0.92rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--line)' }}>
            <span style={{ color: 'var(--muted)' }}>Developer</span>
            <strong>Willybrordus Anugrah Gusti</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--line)' }}>
            <span style={{ color: 'var(--muted)' }}>Group</span>
            <span>Kelompok 24 Praktikum PPB</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--line)' }}>
            <span style={{ color: 'var(--muted)' }}>University</span>
            <span>Universitas Diponegoro</span>
          </div>
        </div>
      </div>

      {/* Reminder Notification */}
      <div className="card">
        <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '8px' }}>
          Reminder Notifications
        </h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--muted)', marginBottom: '14px', lineHeight: '1.4' }}>
          PilMate can provide dosage reminder notifications directly through your browser when it is time to take your medication.
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.82rem', color: 'var(--muted)', display: 'block' }}>Notification Status:</span>
            <strong style={{ fontSize: '0.92rem', textTransform: 'capitalize' }}>
              {notifPermission === 'granted' ? '✔ Enabled (Allowed)' : notifPermission === 'denied' ? '✖ Blocked' : 'Not Configured'}
            </strong>
          </div>

          {notifSupported && (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={handleRequestNotif}
            >
              {notifPermission === 'granted' ? 'Test Notification' : 'Allow Notifications'}
            </button>
          )}
        </div>
      </div>

      {/* Card: Download For Offline Use */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
        <div>
          <span style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--ink)' }}>
            Download For Offline Use
          </span>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={handleInstallClick}
        >
          {isInstalled ? '✔ Installed' : 'Install'}
        </button>
      </div>
    </div>
  );
}
