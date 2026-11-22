import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Inisialisasi Supabase Client jika credentials tersedia
const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✓ Terhubung ke Supabase PostgreSQL:', supabaseUrl);
} else {
  console.log('ℹ Supabase credentials tidak ditemukan di .env. Menggunakan database memori/mock untuk demo lokal.');
}

// Memory fallback store
let memoryMeds = [
  {
    id: 'med-1',
    name: 'Paracetamol',
    dosage: '500 mg',
    notes: 'Sesudah makan untuk meredakan nyeri / demam',
    color: '#1f8a70',
    tags: ['nyeri', 'harian'],
    stock: 18,
    low_stock_at: 5,
    expires_on: '2027-03-01',
    created_at: new Date().toISOString(),
    reminders: [
      { id: 'rem-1', medication_id: 'med-1', time: '08:00', days: [0, 1, 2, 3, 4, 5, 6], amount: 1 },
      { id: 'rem-2', medication_id: 'med-1', time: '21:00', days: [0, 1, 2, 3, 4, 5, 6], amount: 1 }
    ]
  },
  {
    id: 'med-2',
    name: 'Vitamin D',
    dosage: '1000 IU',
    notes: 'Setelah sarapan atau makan siang',
    color: '#c77d12',
    tags: ['vitamin', 'imun'],
    stock: 3,
    low_stock_at: 5,
    expires_on: '2026-12-15',
    created_at: new Date().toISOString(),
    reminders: [
      { id: 'rem-3', medication_id: 'med-2', time: '12:00', days: [0, 1, 2, 3, 4, 5, 6], amount: 1 }
    ]
  },
  {
    id: 'med-3',
    name: 'Amoxicillin',
    dosage: '500 mg',
    notes: 'Habiskan antibiotik sesuai resep dokter',
    color: '#b3382c',
    tags: ['antibiotik'],
    stock: 12,
    low_stock_at: 4,
    expires_on: '2026-11-30',
    created_at: new Date().toISOString(),
    reminders: [
      { id: 'rem-4', medication_id: 'med-3', time: '18:00', days: [0, 1, 2, 3, 4, 5, 6], amount: 1 }
    ]
  }
];

let memoryLogs = [
  {
    id: 'log-1',
    medication_id: 'med-1',
    medication_name: 'Paracetamol',
    scheduled_at: `${new Date().toISOString().slice(0, 10)}T08:00:00.000Z`,
    acted_at: `${new Date().toISOString().slice(0, 10)}T08:07:00.000Z`,
    status: 'taken',
    amount: 1,
    note: 'Diminum tepat waktu'
  }
];

// Root status
app.get('/', (req, res) => {
  res.json({
    service: 'PilMate API Web Service (Modul 1)',
    status: 'healthy',
    supabaseConnected: Boolean(supabase),
    version: '1.0.0'
  });
});

// 1. GET /api/medications (mendukung ?tag=)
app.get('/api/medications', async (req, res) => {
  try {
    const { tag } = req.query;
    if (supabase) {
      let query = supabase.from('medications').select('*, reminders(*)').order('created_at', { ascending: false });
      if (tag && tag !== 'all') {
        query = query.contains('tags', [tag]);
      }
      const { data, error } = await query;
      if (error) throw error;
      return res.json(data);
    }

    // Memory
    let results = memoryMeds;
    if (tag && tag !== 'all') {
      results = results.filter(m => Array.isArray(m.tags) && m.tags.includes(tag));
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. GET /api/medications/:id
app.get('/api/medications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (supabase) {
      const { data, error } = await supabase
        .from('medications')
        .select('*, reminders(*)')
        .eq('id', id)
        .single();
      if (error) return res.status(404).json({ error: 'Obat tidak ditemukan' });
      return res.json(data);
    }

    const med = memoryMeds.find(m => m.id === id);
    if (!med) return res.status(404).json({ error: 'Obat tidak ditemukan' });
    res.json(med);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. POST /api/medications
app.post('/api/medications', async (req, res) => {
  try {
    const { name, dosage, notes, color, tags, stock, low_stock_at, expires_on, reminders } = req.body;
    if (!name) return res.status(400).json({ error: 'Nama obat wajib diisi' });

    if (supabase) {
      const { data: med, error: medError } = await supabase
        .from('medications')
        .insert([{
          name,
          dosage,
          notes,
          color: color || '#1f8a70',
          tags: Array.isArray(tags) ? tags : [],
          stock: Number(stock) || 0,
          low_stock_at: Number(low_stock_at) || 0,
          expires_on: expires_on || null
        }])
        .select()
        .single();

      if (medError) throw medError;

      // Masukkan pengingat jika ada
      let insertedReminders = [];
      if (Array.isArray(reminders) && reminders.length > 0) {
        const remRows = reminders.map(r => ({
          medication_id: med.id,
          time: r.time,
          days: r.days || [0, 1, 2, 3, 4, 5, 6],
          amount: Number(r.amount) || 1
        }));
        const { data: rems, error: remError } = await supabase.from('reminders').insert(remRows).select();
        if (!remError) insertedReminders = rems;
      }

      med.reminders = insertedReminders;
      return res.status(201).json(med);
    }

    // Memory
    const newMed = {
      id: `med-${Date.now()}`,
      name,
      dosage: dosage || '',
      notes: notes || '',
      color: color || '#1f8a70',
      tags: Array.isArray(tags) ? tags : [],
      stock: Number(stock) || 0,
      low_stock_at: Number(low_stock_at) || 0,
      expires_on: expires_on || null,
      created_at: new Date().toISOString(),
      reminders: Array.isArray(reminders) ? reminders.map((r, i) => ({
        id: `rem-${Date.now()}-${i}`,
        medication_id: `med-${Date.now()}`,
        time: r.time || '08:00',
        days: r.days || [0, 1, 2, 3, 4, 5, 6],
        amount: Number(r.amount) || 1
      })) : []
    };
    memoryMeds.unshift(newMed);
    res.status(201).json(newMed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. PUT /api/medications/:id
app.put('/api/medications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, dosage, notes, color, tags, stock, low_stock_at, expires_on, reminders } = req.body;

    if (supabase) {
      const { data: updated, error: updError } = await supabase
        .from('medications')
        .update({
          ...(name !== undefined && { name }),
          ...(dosage !== undefined && { dosage }),
          ...(notes !== undefined && { notes }),
          ...(color !== undefined && { color }),
          ...(tags !== undefined && { tags }),
          ...(stock !== undefined && { stock: Number(stock) }),
          ...(low_stock_at !== undefined && { low_stock_at: Number(low_stock_at) }),
          ...(expires_on !== undefined && { expires_on: expires_on || null })
        })
        .eq('id', id)
        .select()
        .single();

      if (updError) throw updError;

      // Update reminders jika disediakan
      if (Array.isArray(reminders)) {
        await supabase.from('reminders').delete().eq('medication_id', id);
        if (reminders.length > 0) {
          const remRows = reminders.map(r => ({
            medication_id: id,
            time: r.time,
            days: r.days || [0, 1, 2, 3, 4, 5, 6],
            amount: Number(r.amount) || 1
          }));
          const { data: rems } = await supabase.from('reminders').insert(remRows).select();
          updated.reminders = rems || [];
        } else {
          updated.reminders = [];
        }
      }

      return res.json(updated);
    }

    // Memory
    const idx = memoryMeds.findIndex(m => m.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Obat tidak ditemukan' });

    memoryMeds[idx] = {
      ...memoryMeds[idx],
      ...(name !== undefined && { name }),
      ...(dosage !== undefined && { dosage }),
      ...(notes !== undefined && { notes }),
      ...(color !== undefined && { color }),
      ...(tags !== undefined && { tags }),
      ...(stock !== undefined && { stock: Number(stock) }),
      ...(low_stock_at !== undefined && { low_stock_at: Number(low_stock_at) }),
      ...(expires_on !== undefined && { expires_on }),
      ...(reminders !== undefined && { reminders })
    };

    res.json(memoryMeds[idx]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. DELETE /api/medications/:id
app.delete('/api/medications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (supabase) {
      const { error } = await supabase.from('medications').delete().eq('id', id);
      if (error) throw error;
      return res.json({ success: true, message: 'Obat berhasil dihapus' });
    }

    memoryMeds = memoryMeds.filter(m => m.id !== id);
    memoryLogs = memoryLogs.filter(l => l.medication_id !== id);
    res.json({ success: true, message: 'Obat berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. GET /api/today (Jadwal hari ini)
app.get('/api/today', async (req, res) => {
  try {
    const now = new Date();
    const currentDay = now.getDay();
    const todayStr = now.toISOString().slice(0, 10);

    let meds = [];
    let logs = [];

    if (supabase) {
      const { data: medData } = await supabase.from('medications').select('*, reminders(*)');
      meds = medData || [];
      const { data: logData } = await supabase
        .from('dose_logs')
        .select('*')
        .gte('acted_at', `${todayStr}T00:00:00Z`);
      logs = logData || [];
    } else {
      meds = memoryMeds;
      logs = memoryLogs;
    }

    const todayDoses = [];
    meds.forEach(med => {
      if (med.reminders && med.reminders.length > 0) {
        med.reminders.forEach(rem => {
          if (rem.days && rem.days.includes(currentDay)) {
            const logEntry = logs.find(l => {
              const matchMed = l.medication_id === med.id;
              const matchSched = l.scheduled_at && l.scheduled_at.startsWith(todayStr) && l.scheduled_at.includes(rem.time);
              return matchMed && (matchSched || (l.acted_at && l.acted_at.startsWith(todayStr)));
            });

            todayDoses.push({
              reminder_id: rem.id,
              medication_id: med.id,
              medication_name: med.name,
              dosage: med.dosage,
              color: med.color,
              time: rem.time,
              amount: rem.amount || 1,
              stock: med.stock,
              low_stock_at: med.low_stock_at,
              status: logEntry ? logEntry.status : 'pending',
              log_id: logEntry ? logEntry.id : null,
              acted_at: logEntry ? logEntry.acted_at : null
            });
          }
        });
      }
    });

    todayDoses.sort((a, b) => a.time.localeCompare(b.time));
    res.json(todayDoses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. GET /api/logs
app.get('/api/logs', async (req, res) => {
  try {
    const { medication_id, from, to } = req.query;

    if (supabase) {
      let query = supabase.from('dose_logs').select('*, medications(name, dosage)').order('acted_at', { ascending: false });
      if (medication_id) query = query.eq('medication_id', medication_id);
      if (from) query = query.gte('acted_at', from);
      if (to) query = query.lte('acted_at', to);

      const { data, error } = await query;
      if (error) throw error;

      const formatted = (data || []).map(l => ({
        ...l,
        medication_name: l.medications?.name || 'Obat',
        dosage: l.medications?.dosage || ''
      }));
      return res.json(formatted);
    }

    let results = [...memoryLogs];
    if (medication_id) results = results.filter(l => l.medication_id === medication_id);
    if (from) results = results.filter(l => new Date(l.acted_at) >= new Date(from));
    if (to) results = results.filter(l => new Date(l.acted_at) <= new Date(to));
    results.sort((a, b) => new Date(b.acted_at) - new Date(a.acted_at));
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. GET /api/logs/:id
app.get('/api/logs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (supabase) {
      const { data, error } = await supabase
        .from('dose_logs')
        .select('*, medications(name, dosage)')
        .eq('id', id)
        .single();
      if (error) return res.status(404).json({ error: 'Log tidak ditemukan' });
      return res.json({
        ...data,
        medication_name: data.medications?.name || 'Obat',
        dosage: data.medications?.dosage || ''
      });
    }

    const log = memoryLogs.find(l => l.id === id);
    if (!log) return res.status(404).json({ error: 'Log tidak ditemukan' });
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. POST /api/logs (Catat dosis & kurangi stok jika taken/extra)
app.post('/api/logs', async (req, res) => {
  try {
    const { medication_id, scheduled_at, status = 'taken', amount = 1, note } = req.body;
    if (!medication_id) return res.status(400).json({ error: 'medication_id wajib diisi' });

    if (supabase) {
      // 1. Ambil obat
      const { data: med, error: medErr } = await supabase
        .from('medications')
        .select('*')
        .eq('id', medication_id)
        .single();
      if (medErr || !med) return res.status(404).json({ error: 'Obat tidak ditemukan' });

      // 2. Simpan log dosis
      const { data: newLog, error: logErr } = await supabase
        .from('dose_logs')
        .insert([{
          medication_id,
          scheduled_at: scheduled_at || new Date().toISOString(),
          acted_at: new Date().toISOString(),
          status,
          amount: Number(amount) || 1,
          note: note || ''
        }])
        .select()
        .single();

      if (logErr) throw logErr;

      // 3. Kurangi stok obat jika status taken atau extra
      if (status === 'taken' || status === 'extra') {
        const newStock = Math.max(0, (med.stock || 0) - (Number(amount) || 1));
        await supabase
          .from('medications')
          .update({ stock: newStock })
          .eq('id', medication_id);
      }

      return res.status(201).json({
        ...newLog,
        medication_name: med.name,
        dosage: med.dosage
      });
    }

    // Memory
    const med = memoryMeds.find(m => m.id === medication_id);
    const newLog = {
      id: `log-${Date.now()}`,
      medication_id,
      medication_name: med ? med.name : 'Obat',
      dosage: med ? med.dosage : '',
      scheduled_at: scheduled_at || new Date().toISOString(),
      acted_at: new Date().toISOString(),
      status,
      amount: Number(amount) || 1,
      note: note || ''
    };

    memoryLogs.unshift(newLog);

    if (med && (status === 'taken' || status === 'extra')) {
      med.stock = Math.max(0, (med.stock || 0) - (Number(amount) || 1));
    }

    res.status(201).json(newLog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. PUT /api/logs/:id
app.put('/api/logs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note, amount } = req.body;

    if (supabase) {
      const { data, error } = await supabase
        .from('dose_logs')
        .update({
          ...(status !== undefined && { status }),
          ...(note !== undefined && { note }),
          ...(amount !== undefined && { amount: Number(amount) })
        })
        .eq('id', id)
        .select('*, medications(name, dosage)')
        .single();

      if (error) throw error;
      return res.json({
        ...data,
        medication_name: data.medications?.name || 'Obat',
        dosage: data.medications?.dosage || ''
      });
    }

    const idx = memoryLogs.findIndex(l => l.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Log tidak ditemukan' });

    memoryLogs[idx] = {
      ...memoryLogs[idx],
      ...(status !== undefined && { status }),
      ...(note !== undefined && { note }),
      ...(amount !== undefined && { amount: Number(amount) })
    };

    res.json(memoryLogs[idx]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11. DELETE /api/logs/:id
app.delete('/api/logs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (supabase) {
      const { error } = await supabase.from('dose_logs').delete().eq('id', id);
      if (error) throw error;
      return res.json({ success: true, message: 'Log berhasil dihapus' });
    }

    memoryLogs = memoryLogs.filter(l => l.id !== id);
    res.json({ success: true, message: 'Log berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 PilMate API Web Service berjalan pada http://localhost:${PORT}`);
});

