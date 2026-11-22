// API Client untuk PilMate PWA
// Terhubung langsung ke Supabase PostgreSQL dengan offline-fallback

import { supabase, isSupabaseConfigured } from './supabase';

const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

// Data Obat Awal Sesuai phoneScreenshots (1.png & 2.png) dengan jadwal tetap sesuai Medicine Details
export const SEED_MEDICATIONS = [
  {
    id: 'med-b12',
    name: 'B12',
    dosage: '500µg',
    notes: 'Vitamins',
    color: '#800000',
    tags: ['Vitamins'],
    stock: 50.5,
    low_stock_at: 10,
    expires_on: '2025-08-27',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    reminders: [
      { id: 'rem-b12-1', medication_id: 'med-b12', time: '07:00', days: [0, 1, 2, 3, 4, 5, 6], amount: 2, default_status: 'skipped' }
    ]
  },
  {
    id: 'med-omega3',
    name: 'Omega 3',
    dosage: 'EPA/DHA 500mg',
    notes: 'Daily when below threshold 12 pills, Expiration date',
    color: '#3b5b82',
    tags: ['Supplements'],
    stock: 10,
    low_stock_at: 12,
    expires_on: '2025-08-04',
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    reminders: [
      { id: 'rem-om3-1', medication_id: 'med-omega3', time: '08:00', days: [0, 1, 2, 3, 4, 5, 6], amount: 10, default_status: 'due' },
      { id: 'rem-om3-2', medication_id: 'med-omega3', time: '09:00', days: [0, 1, 2, 3, 4, 5, 6], amount: 1, default_status: 'due' },
      { id: 'rem-om3-3', medication_id: 'med-omega3', time: '10:00', days: [0, 1, 2, 3, 4, 5, 6], amount: 1, default_status: 'pending' }
    ]
  },
  {
    id: 'med-ginseng',
    name: 'Ginseng',
    dosage: '200mg',
    notes: 'Energy booster',
    color: '#8ef188',
    tags: ['Energy'],
    stock: 25,
    low_stock_at: 5,
    expires_on: '2026-05-10',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    reminders: [
      { id: 'rem-gin-1', medication_id: 'med-ginseng', time: '09:00', days: [0, 1, 2, 3, 4, 5, 6], amount: 1, default_status: 'taken' }
    ]
  },
  {
    id: 'med-selen',
    name: 'Selen',
    dosage: '200 µg',
    notes: 'Continuous interval starting from 8/1/25',
    color: '#3b5b82',
    tags: ['Important'],
    stock: 30,
    low_stock_at: 8,
    expires_on: '2026-09-15',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    reminders: [
      { id: 'rem-sel-1', medication_id: 'med-selen', time: '09:00', days: [0, 1, 2, 3, 4, 5, 6], amount: 2, default_status: 'taken' },
      { id: 'rem-sel-2', medication_id: 'med-selen', time: '15:59', days: [0, 1, 2, 3, 4, 5, 6], amount: 1, default_status: 'pending' }
    ]
  }
];

// Helper LocalStorage
function getLocalData(key, fallback) {
  try {
    const raw = localStorage.getItem(`pilmate_${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setLocalData(key, val) {
  try {
    localStorage.setItem(`pilmate_${key}`, JSON.stringify(val));
  } catch (err) {
    console.warn('LocalStorage error:', err);
  }
}

export const ALLOWED_TAGS = ['Vitamins', 'Supplements', 'Energy', 'Important'];

const SEED_VERSION_RESTORE = 'v25_english_logs';

// Helper pembersih & normalisasi tag (Hanya 4 pilihan resmi: Vitamins, Supplements, Energy, Important)
function normalizeMedTags(tags) {
  if (!Array.isArray(tags)) return [];
  const result = [];
  tags.forEach(t => {
    if (!t) return;
    const clean = String(t).trim().toLowerCase();
    const matched = ALLOWED_TAGS.find(a => a.toLowerCase() === clean);
    if (matched && !result.includes(matched)) {
      result.push(matched);
    }
  });
  return result;
}

// Inisialisasi Data Obat (Jadwal tetap dan stabil sesuai Medicine Details)
function initSeedData() {
  const currentVer = typeof window !== 'undefined' ? localStorage.getItem('pilmate_seed_restore_ver') : null;

  if (currentVer !== SEED_VERSION_RESTORE) {
    // Kembalikan obat bawaan ke jadwal aslinya yang stabil (07:00, 08:00, 09:00, 10:00, 15:59)
    let existingMeds = getLocalData('medications', []);
    if (!Array.isArray(existingMeds)) existingMeds = [];
    const seedIds = ['med-b12', 'med-omega3', 'med-ginseng', 'med-selen'];
    const userCustomMeds = existingMeds
      .filter(m => !seedIds.includes(m.id) && !['b12', 'omega 3', 'ginseng', 'selen'].includes((m.name || '').toLowerCase()))
      .map(m => ({ ...m, tags: normalizeMedTags(m.tags) }));

    setLocalData('medications', [...SEED_MEDICATIONS, ...userCustomMeds]);

    // Kembalikan log bawaan ke jadwal tetap yang stabil
    const todayStr = new Date().toISOString().slice(0, 10);
    const initialLogs = [
      {
        id: 'log-b12',
        medication_id: 'med-b12',
        reminder_id: 'rem-b12-1',
        medication_name: 'B12',
        dosage: '500µg',
        scheduled_at: `${todayStr}T07:00:00.000Z`,
        acted_at: `${todayStr}T07:05:00.000Z`,
        status: 'skipped',
        amount: 2,
        note: 'Dose skipped'
      },
      {
        id: 'log-om3-1',
        medication_id: 'med-omega3',
        reminder_id: 'rem-om3-1',
        medication_name: 'Omega 3',
        dosage: 'EPA/DHA 500mg',
        scheduled_at: `${todayStr}T08:00:00.000Z`,
        status: 'due',
        amount: 10,
        note: 'Dose due'
      },
      {
        id: 'log-om3-2',
        medication_id: 'med-omega3',
        reminder_id: 'rem-om3-2',
        medication_name: 'Omega 3',
        dosage: 'EPA/DHA 500mg',
        scheduled_at: `${todayStr}T09:00:00.000Z`,
        status: 'due',
        amount: 1,
        note: 'Dose due'
      },
      {
        id: 'log-gin',
        medication_id: 'med-ginseng',
        reminder_id: 'rem-gin-1',
        medication_name: 'Ginseng',
        dosage: '200mg',
        scheduled_at: `${todayStr}T09:00:00.000Z`,
        acted_at: `${todayStr}T09:02:00.000Z`,
        status: 'taken',
        amount: 1,
        note: 'Taken'
      },
      {
        id: 'log-sel-1',
        medication_id: 'med-selen',
        reminder_id: 'rem-sel-1',
        medication_name: 'Selen',
        dosage: '200 µg',
        scheduled_at: `${todayStr}T09:00:00.000Z`,
        acted_at: `${todayStr}T09:01:00.000Z`,
        status: 'taken',
        amount: 2,
        note: 'Taken'
      }
    ];

    let existingLogs = getLocalData('dose_logs', []);
    if (!Array.isArray(existingLogs)) existingLogs = [];
    const seedLogIds = ['log-b12', 'log-om3-1', 'log-om3-2', 'log-gin', 'log-sel-1'];
    const userCustomLogs = existingLogs
      .filter(l => !seedLogIds.includes(l.id))
      .map(l => {
        let note = l.note;
        if (note) {
          if (note.includes('dilewati') || note.includes('skipped')) note = 'Dose skipped';
          else if (note.includes('waktunya') || note.includes('due') || note.includes('alarm')) note = 'Dose due';
          else if (note.includes('diminum') || note.includes('taken')) note = 'Taken';
        }
        return { ...l, note };
      });

    setLocalData('dose_logs', [...initialLogs, ...userCustomLogs]);
    try {
      localStorage.setItem('pilmate_seed_restore_ver', SEED_VERSION_RESTORE);
      localStorage.removeItem('pilmate_auto_sync_hour');
      localStorage.removeItem('pilmate_device_sync_ver');
    } catch {}
  } else {
    // Pastikan obat-obat dasar selalu ada tanpa menghapus obat tambahan user
    let existingMeds = getLocalData('medications', []);
    if (!Array.isArray(existingMeds)) existingMeds = [];

    let changed = false;
    SEED_MEDICATIONS.forEach(seed => {
      if (!existingMeds.some(m => m.id === seed.id || (m.name && m.name.toLowerCase() === seed.name.toLowerCase()))) {
        existingMeds.push(seed);
        changed = true;
      }
    });

    if (changed || !localStorage.getItem('pilmate_medications')) {
      setLocalData('medications', existingMeds);
    }
  }
}

if (typeof window !== 'undefined') {
  initSeedData();
}

// Fallback Mock Request jika Supabase / API tidak dapat dijangkau
function handleMockRequest(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const baseOrigin = typeof window !== 'undefined' && window.location ? window.location.origin : 'http://127.0.0.1';
  const url = new URL(endpoint, baseOrigin);
  const pathname = url.pathname;
  const body = options.body ? JSON.parse(options.body) : null;

  let meds = getLocalData('medications', SEED_MEDICATIONS);
  let logs = getLocalData('dose_logs', []);

  if (pathname === '/api/medications' && method === 'GET') {
    const tag = url.searchParams.get('tag');
    // Bersihkan tag pada obat agar sesuai dengan 4 tag resmi
    meds = meds.map(m => ({
      ...m,
      tags: normalizeMedTags(m.tags)
    }));
    if (tag && tag !== 'all') {
      return meds.filter(m => Array.isArray(m.tags) && m.tags.some(t => t.toLowerCase() === tag.toLowerCase()));
    }
    return meds;
  }

  const medIdMatch = pathname.match(/^\/api\/medications\/([^/]+)$/);
  if (medIdMatch && method === 'GET') {
    const id = medIdMatch[1];
    const med = meds.find(m => m.id === id);
    if (!med) throw new Error('Obat tidak ditemukan');
    return med;
  }

  if (pathname === '/api/medications' && method === 'POST') {
    const medId = `med-${Date.now()}`;
    const defaultTime = '08:00';
    const newReminders = Array.isArray(body.reminders) && body.reminders.length > 0
      ? body.reminders.map((r, i) => ({
          id: r.id || `rem-${Date.now()}-${i}`,
          medication_id: medId,
          time: r.time || defaultTime,
          days: Array.isArray(r.days) && r.days.length > 0 ? r.days : [0, 1, 2, 3, 4, 5, 6],
          amount: Number(r.amount) || 1,
          default_status: 'pending'
        }))
      : [
          {
            id: `rem-${medId}-0`,
            medication_id: medId,
            time: defaultTime,
            days: [0, 1, 2, 3, 4, 5, 6],
            amount: 1,
            default_status: 'pending'
          }
        ];

    const newMed = {
      id: medId,
      name: body.name || 'Obat Baru',
      dosage: body.dosage || '',
      notes: body.notes || '',
      color: body.color || '#3b5b82',
      tags: normalizeMedTags(body.tags),
      stock: Number(body.stock) || 0,
      low_stock_at: Number(body.low_stock_at) || 0,
      expires_on: body.expires_on || null,
      created_at: new Date().toISOString(),
      reminders: newReminders
    };

    meds.push(newMed);
    setLocalData('medications', meds);
    return newMed;
  }

  if (medIdMatch && method === 'PUT') {
    const id = medIdMatch[1];
    const index = meds.findIndex(m => m.id === id);
    if (index === -1) throw new Error('Obat tidak ditemukan');
    meds[index] = {
      ...meds[index],
      ...body,
      tags: body.tags !== undefined ? normalizeMedTags(body.tags) : normalizeMedTags(meds[index].tags),
      stock: Number(body.stock !== undefined ? body.stock : meds[index].stock),
      low_stock_at: Number(body.low_stock_at !== undefined ? body.low_stock_at : meds[index].low_stock_at),
      reminders: body.reminders || meds[index].reminders || []
    };
    setLocalData('medications', meds);
    return meds[index];
  }

  if (medIdMatch && method === 'DELETE') {
    const id = medIdMatch[1];
    meds = meds.filter(m => m.id !== id);
    setLocalData('medications', meds);
    logs = logs.filter(l => l.medication_id !== id);
    setLocalData('dose_logs', logs);
    return { success: true };
  }

  if (pathname === '/api/today' && method === 'GET') {
    meds = getLocalData('medications', SEED_MEDICATIONS);
    logs = getLocalData('dose_logs', []);

    const now = new Date();
    const currentDay = now.getDay();
    const todayDoses = [];

    meds.forEach(med => {
      // Pastikan obat selalu memiliki minimal 1 pengingat agar muncul di Overview
      const reminders = Array.isArray(med.reminders) && med.reminders.length > 0
        ? med.reminders
        : [{
            id: `rem-${med.id}-default`,
            medication_id: med.id,
            time: '08:00',
            days: [0, 1, 2, 3, 4, 5, 6],
            amount: 1,
            default_status: 'pending'
          }];

      reminders.forEach(rem => {
        const days = Array.isArray(rem.days) && rem.days.length > 0 ? rem.days : [0, 1, 2, 3, 4, 5, 6];
        if (days.includes(currentDay)) {
          const remTimeShort = (rem.time || '08:00').substring(0, 5);

          // Cari log khusus untuk reminder_id ini
          const logEntry = logs.find(l => {
            if (l.reminder_id && rem.id) {
              return l.reminder_id === rem.id;
            }
            if (l.medication_id === med.id) {
              const schedStr = l.scheduled_at || '';
              return schedStr.includes(`T${remTimeShort}`) || schedStr.includes(remTimeShort);
            }
            return false;
          });

          // Tentukan status: prioritaskan log khusus, lalu default_status dari reminder
          const currentStatus = logEntry ? logEntry.status : (rem.default_status || 'pending');

          todayDoses.push({
            reminder_id: rem.id,
            medication_id: med.id,
            medication_name: med.name,
            dosage: med.dosage,
            color: med.color,
            tags: med.tags || [],
            time: remTimeShort,
            amount: rem.amount || 1,
            stock: med.stock,
            low_stock_at: med.low_stock_at,
            status: currentStatus,
            log_id: logEntry ? logEntry.id : null,
            acted_at: logEntry ? logEntry.acted_at : null
          });
        }
      });
    });

    // Sertakan juga log dosis tambahan (extra / manual) hari ini agar muncul di Overview
    const todayDateStr = now.toISOString().slice(0, 10);
    logs.forEach(l => {
      const logDate = (l.acted_at || l.scheduled_at || '').slice(0, 10);
      if (logDate === todayDateStr && (!l.reminder_id || (l.note && l.note.toLowerCase().includes('tambahan')) || l.status === 'extra')) {
        if (!todayDoses.some(d => d.log_id === l.id)) {
          const med = meds.find(m => m.id === l.medication_id);
          let timeStr = '00:00';
          try {
            const d = new Date(l.acted_at || l.scheduled_at);
            timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          } catch {}

          todayDoses.push({
            reminder_id: l.reminder_id || `extra-${l.id}`,
            medication_id: l.medication_id,
            medication_name: l.medication_name || (med ? med.name : 'Medication'),
            dosage: l.dosage || (med ? med.dosage : ''),
            color: med ? med.color : '#3b5b82',
            tags: med ? (med.tags || []) : [],
            time: timeStr,
            amount: l.amount || 1,
            stock: med ? med.stock : 0,
            low_stock_at: med ? med.low_stock_at : 0,
            status: l.status === 'skipped' ? 'skipped' : 'taken',
            log_id: l.id,
            acted_at: l.acted_at,
            is_extra: true
          });
        }
      }
    });

    todayDoses.sort((a, b) => a.time.localeCompare(b.time));
    return todayDoses;
  }

  if (pathname === '/api/logs' && method === 'GET') {
    const medId = url.searchParams.get('medication_id');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    let filtered = [...logs];
    if (medId) filtered = filtered.filter(l => l.medication_id === medId);
    if (from) filtered = filtered.filter(l => new Date(l.acted_at || l.scheduled_at) >= new Date(from));
    if (to) filtered = filtered.filter(l => new Date(l.acted_at || l.scheduled_at) <= new Date(to));
    filtered.sort((a, b) => new Date(b.acted_at || b.scheduled_at) - new Date(a.acted_at || a.scheduled_at));
    return filtered;
  }

  const logMatch = pathname.match(/^\/api\/logs\/([^/]+)$/);
  if (logMatch && method === 'GET') {
    const id = logMatch[1];
    const log = logs.find(l => l.id === id);
    if (!log) throw new Error('Log riwayat tidak ditemukan');
    return log;
  }

  if (pathname === '/api/logs' && method === 'POST') {
    const med = meds.find(m => m.id === body.medication_id);
    const amount = Number(body.amount) || 1;

    // Cari apakah log untuk reminder_id ini sudah ada
    const existingIndex = logs.findIndex(l => {
      if (body.reminder_id && l.reminder_id) {
        return l.reminder_id === body.reminder_id;
      }
      return false;
    });

    let targetLog;
    if (existingIndex !== -1 && body.status !== 'extra') {
      logs[existingIndex] = {
        ...logs[existingIndex],
        status: body.status || 'taken',
        acted_at: new Date().toISOString(),
        note: body.note || logs[existingIndex].note
      };
      targetLog = logs[existingIndex];
    } else {
      targetLog = {
        id: `log-${Date.now()}`,
        medication_id: body.medication_id,
        reminder_id: body.reminder_id || null,
        medication_name: med ? med.name : body.medication_name || 'Obat',
        dosage: med ? med.dosage : '',
        scheduled_at: body.scheduled_at || new Date().toISOString(),
        acted_at: new Date().toISOString(),
        status: body.status || 'taken',
        amount: amount,
        note: body.note || ''
      };
      logs.unshift(targetLog);
    }

    setLocalData('dose_logs', logs);

    if (med && (body.status === 'taken' || body.status === 'extra')) {
      med.stock = Math.max(0, (med.stock || 0) - amount);
      setLocalData('medications', meds);
    }

    return targetLog;
  }

  if (logMatch && method === 'PUT') {
    const id = logMatch[1];
    const index = logs.findIndex(l => l.id === id);
    if (index === -1) throw new Error('Log tidak ditemukan');
    logs[index] = { ...logs[index], ...body };
    setLocalData('dose_logs', logs);
    return logs[index];
  }

  if (logMatch && method === 'DELETE') {
    const id = logMatch[1];
    logs = logs.filter(l => l.id !== id);
    setLocalData('dose_logs', logs);
    return { success: true };
  }

  throw new Error(`Endpoint mock tidak dikenali: ${method} ${pathname}`);
}

// API Service Interface Utama (Online Supabase Direct dengan Offline Fallback)
export const api = {
  // 1. Get Medications List
  getMedications: async (tag) => {
    if (isSupabaseConfigured && typeof navigator !== 'undefined' && navigator.onLine !== false) {
      try {
        let query = supabase.from('medications').select('*, reminders(*)').order('created_at', { ascending: false });
        if (tag && tag !== 'all') {
          query = query.contains('tags', [tag]);
        }
        const { data, error } = await query;
        if (!error && Array.isArray(data) && data.length > 0) {
          const normalized = data.map(m => ({
            ...m,
            tags: normalizeMedTags(m.tags),
            reminders: (m.reminders || []).map(r => ({
              ...r,
              time: (r.time || '08:00').substring(0, 5)
            }))
          }));
          setLocalData('medications', normalized);
          return normalized;
        }
      } catch (err) {
        console.warn('Supabase fetch medications fallback to local:', err);
      }
    }
    return handleMockRequest(tag ? `/api/medications?tag=${tag}` : '/api/medications');
  },

  // 2. Get Single Medication Detail
  getMedication: async (id) => {
    if (isSupabaseConfigured && typeof navigator !== 'undefined' && navigator.onLine !== false) {
      try {
        const { data, error } = await supabase
          .from('medications')
          .select('*, reminders(*)')
          .eq('id', id)
          .single();
        if (!error && data) {
          data.tags = normalizeMedTags(data.tags);
          data.reminders = (data.reminders || []).map(r => ({
            ...r,
            time: (r.time || '08:00').substring(0, 5)
          }));
          return data;
        }
      } catch (err) {
        console.warn('Supabase getMedication fallback to local:', err);
      }
    }
    return handleMockRequest(`/api/medications/${id}`);
  },

  // 3. Create Medication
  createMedication: async (data) => {
    if (isSupabaseConfigured && typeof navigator !== 'undefined' && navigator.onLine !== false) {
      try {
        const { reminders, ...cleanData } = data;
        cleanData.tags = normalizeMedTags(cleanData.tags);
        cleanData.stock = Number(cleanData.stock) || 0;
        cleanData.low_stock_at = Number(cleanData.low_stock_at) || 0;
        if (!cleanData.expires_on) cleanData.expires_on = null;

        const { data: newMed, error: mErr } = await supabase
          .from('medications')
          .insert([cleanData])
          .select()
          .single();
        if (mErr) throw mErr;

        let savedReminders = [];
        if (Array.isArray(reminders) && reminders.length > 0) {
          const rems = reminders.map(r => ({
            medication_id: newMed.id,
            time: r.time && r.time.length === 5 ? `${r.time}:00` : (r.time || '08:00:00'),
            days: r.days || [0, 1, 2, 3, 4, 5, 6],
            amount: Number(r.amount) || 1
          }));
          const { data: createdRems, error: rErr } = await supabase
            .from('reminders')
            .insert(rems)
            .select();
          if (!rErr && createdRems) savedReminders = createdRems;
        }
        newMed.reminders = savedReminders;

        // Sync local cache
        const localMeds = getLocalData('medications', []);
        setLocalData('medications', [newMed, ...localMeds]);
        return newMed;
      } catch (err) {
        console.warn('Supabase createMedication error, saving to local:', err);
      }
    }
    return handleMockRequest('/api/medications', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // 4. Update Medication
  updateMedication: async (id, data) => {
    if (isSupabaseConfigured && typeof navigator !== 'undefined' && navigator.onLine !== false) {
      try {
        const { reminders, ...cleanData } = data;
        cleanData.tags = normalizeMedTags(cleanData.tags);
        cleanData.stock = Number(cleanData.stock) || 0;
        cleanData.low_stock_at = Number(cleanData.low_stock_at) || 0;
        if (!cleanData.expires_on) cleanData.expires_on = null;

        const { data: updatedMed, error: mErr } = await supabase
          .from('medications')
          .update(cleanData)
          .eq('id', id)
          .select()
          .single();
        if (mErr) throw mErr;

        if (Array.isArray(reminders)) {
          await supabase.from('reminders').delete().eq('medication_id', id);
          if (reminders.length > 0) {
            const rems = reminders.map(r => ({
              medication_id: id,
              time: r.time && r.time.length === 5 ? `${r.time}:00` : (r.time || '08:00:00'),
              days: r.days || [0, 1, 2, 3, 4, 5, 6],
              amount: Number(r.amount) || 1
            }));
            await supabase.from('reminders').insert(rems);
          }
        }

        // Update local cache
        let localMeds = getLocalData('medications', []);
        localMeds = localMeds.map(m => m.id === id ? { ...m, ...cleanData, reminders } : m);
        setLocalData('medications', localMeds);
        return updatedMed;
      } catch (err) {
        console.warn('Supabase updateMedication error, updating locally:', err);
      }
    }
    return handleMockRequest(`/api/medications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // 5. Delete Medication
  deleteMedication: async (id) => {
    if (isSupabaseConfigured && typeof navigator !== 'undefined' && navigator.onLine !== false) {
      try {
        const { error } = await supabase.from('medications').delete().eq('id', id);
        if (error) throw error;
        let localMeds = getLocalData('medications', []);
        setLocalData('medications', localMeds.filter(m => m.id !== id));
        return { success: true };
      } catch (err) {
        console.warn('Supabase deleteMedication fallback:', err);
      }
    }
    return handleMockRequest(`/api/medications/${id}`, { method: 'DELETE' });
  },

  // 6. Get Today Schedule
  getToday: async () => {
    if (isSupabaseConfigured && typeof navigator !== 'undefined' && navigator.onLine !== false) {
      try {
        const [medsRes, logsRes] = await Promise.all([
          supabase.from('medications').select('*, reminders(*)'),
          supabase.from('dose_logs').select('*')
        ]);

        if (!medsRes.error && Array.isArray(medsRes.data) && medsRes.data.length > 0) {
          const meds = medsRes.data;
          const logs = logsRes.data || [];
          const now = new Date();
          const currentDay = now.getDay();
          const todayDateStr = now.toISOString().slice(0, 10);
          const todayDoses = [];

          meds.forEach(med => {
            const reminders = Array.isArray(med.reminders) && med.reminders.length > 0
              ? med.reminders
              : [{
                  id: `rem-${med.id}-default`,
                  medication_id: med.id,
                  time: '08:00',
                  days: [0, 1, 2, 3, 4, 5, 6],
                  amount: 1
                }];

            reminders.forEach(rem => {
              const days = Array.isArray(rem.days) && rem.days.length > 0 ? rem.days : [0, 1, 2, 3, 4, 5, 6];
              if (days.includes(currentDay)) {
                const remTimeShort = (rem.time || '08:00').substring(0, 5);
                const logEntry = logs.find(l => {
                  if (l.medication_id === med.id) {
                    const s = l.scheduled_at || l.acted_at || '';
                    return s.includes(todayDateStr) && s.includes(remTimeShort);
                  }
                  return false;
                });

                let currentStatus = logEntry ? logEntry.status : 'pending';
                if (!logEntry) {
                  const [h, m] = remTimeShort.split(':').map(Number);
                  const schedDate = new Date();
                  schedDate.setHours(h, m, 0, 0);
                  if (now >= schedDate) currentStatus = 'due';
                }

                todayDoses.push({
                  reminder_id: rem.id,
                  medication_id: med.id,
                  medication_name: med.name,
                  dosage: med.dosage,
                  color: med.color,
                  tags: normalizeMedTags(med.tags),
                  time: remTimeShort,
                  amount: rem.amount || 1,
                  stock: med.stock,
                  low_stock_at: med.low_stock_at,
                  status: currentStatus,
                  log_id: logEntry ? logEntry.id : null,
                  acted_at: logEntry ? logEntry.acted_at : null
                });
              }
            });
          });

          // Dosis tambahan (extra) hari ini
          logs.forEach(l => {
            const logDate = (l.acted_at || l.scheduled_at || '').slice(0, 10);
            if (logDate === todayDateStr && l.status === 'extra') {
              const med = meds.find(m => m.id === l.medication_id);
              let timeStr = '00:00';
              try {
                const d = new Date(l.acted_at || l.scheduled_at);
                timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
              } catch {}

              todayDoses.push({
                reminder_id: `extra-${l.id}`,
                medication_id: l.medication_id,
                medication_name: med ? med.name : 'Medication',
                dosage: med ? med.dosage : '',
                color: med ? med.color : '#3b5b82',
                tags: med ? normalizeMedTags(med.tags) : [],
                time: timeStr,
                amount: l.amount || 1,
                stock: med ? med.stock : 0,
                low_stock_at: med ? med.low_stock_at : 0,
                status: 'taken',
                log_id: l.id,
                acted_at: l.acted_at,
                is_extra: true
              });
            }
          });

          todayDoses.sort((a, b) => a.time.localeCompare(b.time));
          return todayDoses;
        }
      } catch (err) {
        console.warn('Supabase getToday fallback to local:', err);
      }
    }
    return handleMockRequest('/api/today');
  },

  // 7. Get Dose Logs
  getLogs: async (params = {}) => {
    if (isSupabaseConfigured && typeof navigator !== 'undefined' && navigator.onLine !== false) {
      try {
        const { data, error } = await supabase
          .from('dose_logs')
          .select('*, medications(name, dosage)')
          .order('acted_at', { ascending: false });
        if (!error && Array.isArray(data)) {
          const mapped = data.map(l => ({
            ...l,
            medication_name: l.medications ? l.medications.name : (l.medication_name || 'Medication'),
            dosage: l.medications ? l.medications.dosage : (l.dosage || '')
          }));
          setLocalData('dose_logs', mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('Supabase getLogs fallback to local:', err);
      }
    }
    return handleMockRequest('/api/logs');
  },

  // 8. Get Single Log
  getLog: async (id) => {
    if (isSupabaseConfigured && typeof navigator !== 'undefined' && navigator.onLine !== false) {
      try {
        const { data, error } = await supabase
          .from('dose_logs')
          .select('*, medications(name, dosage)')
          .eq('id', id)
          .single();
        if (!error && data) {
          return {
            ...data,
            medication_name: data.medications ? data.medications.name : (data.medication_name || 'Medication'),
            dosage: data.medications ? data.medications.dosage : (data.dosage || '')
          };
        }
      } catch (err) {
        console.warn('Supabase getLog fallback to local:', err);
      }
    }
    return handleMockRequest(`/api/logs/${id}`);
  },

  // 9. Create Dose Log
  createLog: async (data) => {
    if (isSupabaseConfigured && typeof navigator !== 'undefined' && navigator.onLine !== false) {
      try {
        const insertPayload = {
          medication_id: data.medication_id,
          scheduled_at: data.scheduled_at || null,
          acted_at: data.acted_at || new Date().toISOString(),
          status: data.status,
          amount: Number(data.amount) || 1,
          note: data.note || null
        };
        const { data: newLog, error } = await supabase
          .from('dose_logs')
          .insert([insertPayload])
          .select()
          .single();
        if (error) throw error;

        // Update medication stock jika diminum
        if (data.status === 'taken' || data.status === 'extra') {
          const { data: med } = await supabase.from('medications').select('stock').eq('id', data.medication_id).single();
          if (med && med.stock > 0) {
            const newStock = Math.max(0, med.stock - (Number(data.amount) || 1));
            await supabase.from('medications').update({ stock: newStock }).eq('id', data.medication_id);
          }
        }

        // Cache update
        handleMockRequest('/api/logs', { method: 'POST', body: JSON.stringify(data) });
        return newLog;
      } catch (err) {
        console.warn('Supabase createLog fallback to local:', err);
      }
    }
    return handleMockRequest('/api/logs', { method: 'POST', body: JSON.stringify(data) });
  },

  // 10. Update Dose Log
  updateLog: async (id, data) => {
    if (isSupabaseConfigured && typeof navigator !== 'undefined' && navigator.onLine !== false) {
      try {
        const { data: updated, error } = await supabase
          .from('dose_logs')
          .update({
            status: data.status,
            amount: Number(data.amount) || 1,
            note: data.note || null
          })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return updated;
      } catch (err) {
        console.warn('Supabase updateLog fallback to local:', err);
      }
    }
    return handleMockRequest(`/api/logs/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  // 11. Delete Dose Log
  deleteLog: async (id) => {
    if (isSupabaseConfigured && typeof navigator !== 'undefined' && navigator.onLine !== false) {
      try {
        const { error } = await supabase.from('dose_logs').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
      } catch (err) {
        console.warn('Supabase deleteLog fallback to local:', err);
      }
    }
    return handleMockRequest(`/api/logs/${id}`, { method: 'DELETE' });
  },

  // 12. Export Dose Logs as CSV
  exportLogsCSV: async () => {
    const logs = await api.getLogs();
    if (!logs || logs.length === 0) return '';

    const headers = ['ID', 'Medication Name', 'Dosage', 'Schedule', 'Acted Time', 'Status', 'Amount', 'Note'];
    const rows = logs.map(l => [
      l.id,
      `"${(l.medication_name || '').replace(/"/g, '""')}"`,
      `"${(l.dosage || '').replace(/"/g, '""')}"`,
      l.scheduled_at || '',
      l.acted_at || '',
      l.status || '',
      l.amount || 1,
      `"${(l.note || '').replace(/"/g, '""')}"`
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
};
