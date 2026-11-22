import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { formatTime } from '../lib/format';
import LoadingState from '../components/LoadingState';

const PERIOD_OPTIONS = [
  { value: '7d', label: '7 days', title: 'Last 7 days', days: 7 },
  { value: '14d', label: '14 days', title: 'Last 14 days', days: 14 },
  { value: '30d', label: '30 days', title: 'Last 30 days', days: 30 },
  { value: '90d', label: '90 days', title: 'Last 90 days', days: 90 },
  { value: '6m', label: '6 months', title: 'Last 6 months', days: 180 },
  { value: '1y', label: '1 year', title: 'Last 1 year', days: 365 },
  { value: 'all', label: 'All time', title: 'All time', days: 3650 }
];

export default function History({ isOnline = true }) {
  const [logs, setLogs] = useState([]);
  const [meds, setMeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter rentang waktu: 7 days s/d 1 year
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const currentPeriodConfig = PERIOD_OPTIONS.find(p => p.value === selectedPeriod) || PERIOD_OPTIONS[0];

  // Active view: 'chart' | 'table' | 'calendar' | 'line'
  const [activeTab, setActiveTab] = useState('chart');

  // Search filter for table view
  const [searchQuery, setSearchQuery] = useState('');

  // Selected date for calendar view (default today)
  const [calendarDate, setCalendarDate] = useState(() => new Date());

  const [exporting, setExporting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [logsData, medsData] = await Promise.all([
        api.getLogs(),
        api.getMedications()
      ]);
      setLogs(logsData || []);
      setMeds(medsData || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load analysis data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const csvContent = await api.exportLogsCSV();
      if (!csvContent) {
        alert('No history records to export.');
        return;
      }
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `pilmate_history_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Failed to export CSV: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  // --- STATS CALCULATIONS (6.png) DINAMIS SESUAI PERIODE PILIHAN ---
  const stats = useMemo(() => {
    // Total keseluruhan
    const totalTaken = logs.filter(l => l.status === 'taken' || l.status === 'extra').length;
    const totalSkipped = logs.filter(l => l.status === 'skipped').length;
    const totalDoses = totalTaken + totalSkipped;

    // Filter berdasarkan rentang waktu yang dipilih (7 hari s/d 1 tahun)
    const now = new Date();
    const periodStartDate = new Date(now.getTime() - currentPeriodConfig.days * 86400000);

    const periodLogs = logs.filter(l => {
      if (selectedPeriod === 'all') return true;
      const d = new Date(l.acted_at || l.scheduled_at);
      return d >= periodStartDate;
    });

    const periodTaken = periodLogs.filter(l => l.status === 'taken' || l.status === 'extra').length;
    const periodSkipped = periodLogs.filter(l => l.status === 'skipped').length;
    const periodTotal = periodTaken + periodSkipped;

    // Persentase akurat rentang waktu terpilih
    const periodTakenPct = periodTotal > 0 ? Math.round((periodTaken / periodTotal) * 100) : 0;
    const periodSkippedPct = periodTotal > 0 ? 100 - periodTakenPct : 0;

    // Persentase akurat total keseluruhan
    const totalTakenPct = totalDoses > 0 ? Math.round((totalTaken / totalDoses) * 100) : 0;
    const totalSkippedPct = totalDoses > 0 ? 100 - totalTakenPct : 0;

    return {
      totalTaken,
      totalSkipped,
      periodTaken,
      periodSkipped,
      periodTakenPct,
      periodSkippedPct,
      totalTakenPct,
      totalSkippedPct
    };
  }, [logs, currentPeriodConfig, selectedPeriod]);

  // Data bar chart dinamis sesuai rentang waktu terpilih (6.png)
  const chartData = useMemo(() => {
    const days = [];
    const now = new Date();
    const medColors = {};
    meds.forEach(m => {
      medColors[m.name] = m.color || '#3b5b82';
    });

    const uniqueMedsTaken = new Set();
    const numBuckets = 7;
    const bucketDurationMs = (currentPeriodConfig.days * 86400000) / numBuckets;

    for (let i = numBuckets - 1; i >= 0; i--) {
      const bucketEnd = new Date(now.getTime() - i * bucketDurationMs);
      const bucketStart = new Date(now.getTime() - (i + 1) * bucketDurationMs);

      let label = '';
      if (currentPeriodConfig.days <= 14) {
        label = `${bucketEnd.getMonth() + 1}/${bucketEnd.getDate()}`;
      } else if (currentPeriodConfig.days <= 90) {
        label = `${bucketEnd.getMonth() + 1}/${bucketEnd.getDate()}`;
      } else {
        // Rentang 6 bulan atau 1 tahun tampilkan nama bulan (e.g. Jan, Feb, Mar)
        label = bucketEnd.toLocaleDateString('en-US', { month: 'short' });
      }

      const bucketLogs = logs.filter(l => {
        const d = new Date(l.acted_at || l.scheduled_at);
        return d >= bucketStart && d <= bucketEnd && (l.status === 'taken' || l.status === 'extra');
      });

      const medsCount = {};
      bucketLogs.forEach(l => {
        const name = l.medication_name || 'Medication';
        medsCount[name] = (medsCount[name] || 0) + (Number(l.amount) || 1);
        uniqueMedsTaken.add(name);
      });

      const totalDayCount = Object.values(medsCount).reduce((a, b) => a + b, 0);

      days.push({
        label,
        totalDayCount,
        medsCount
      });
    }

    const maxDayCount = Math.max(2, ...days.map(d => d.totalDayCount));

    return {
      days,
      maxDayCount,
      medColors,
      uniqueMedsList: Array.from(uniqueMedsTaken)
    };
  }, [logs, meds, currentPeriodConfig]);

  // --- TABLE FILTERED LOGS (7.png) ---
  const filteredTableLogs = useMemo(() => {
    return logs.filter(log => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const matchName = log.medication_name && log.medication_name.toLowerCase().includes(q);
      const matchStatus = log.status && log.status.toLowerCase().includes(q);
      return matchName || matchStatus;
    });
  }, [logs, searchQuery]);

  // --- CALENDAR DATA (8.png) ---
  const calendarData = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days = [];
    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, isCurrentMonth: false });
    }
    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const dObj = new Date(year, month, d);
      // Use local date string (year/month/day from local date object, not UTC)
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const hasDoses = logs.some(l => {
        const raw = l.acted_at || l.scheduled_at || '';
        if (!raw) return false;
        const ld = new Date(raw);
        const logLocal = `${ld.getFullYear()}-${String(ld.getMonth() + 1).padStart(2, '0')}-${String(ld.getDate()).padStart(2, '0')}`;
        return logLocal === dateStr;
      });
      const isSelected = calendarDate.toDateString() === dObj.toDateString();
      days.push({
        day: d,
        dateObj: dObj,
        isCurrentMonth: true,
        hasDoses,
        isSelected
      });
    }
    // Next month padding to fill grid
    const remaining = 35 - days.length;
    for (let i = 1; i <= (remaining > 0 ? remaining : 0); i++) {
      days.push({ day: i, isCurrentMonth: false });
    }
    return days;
  }, [calendarDate, logs]);

  const selectedDayLogs = useMemo(() => {
    // Use local date string for calendar date to avoid UTC offset mismatch
    const cd = calendarDate;
    const dateStr = `${cd.getFullYear()}-${String(cd.getMonth() + 1).padStart(2, '0')}-${String(cd.getDate()).padStart(2, '0')}`;
    return logs.filter(l => {
      const raw = l.acted_at || l.scheduled_at || '';
      if (!raw) return false;
      const d = new Date(raw);
      const logLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return logLocal === dateStr;
    });
  }, [calendarDate, logs]);

  return (
    <div style={{ paddingBottom: '32px' }}>
      {/* 4-Way View Buttons + Period Dropdown (6.png, 7.png, 8.png) */}
      <div className="analysis-top-row">
        <div className="analysis-view-group">
          {/* 1. Bar Chart */}
          <button
            type="button"
            className={`analysis-toggle-btn ${activeTab === 'chart' ? 'active' : ''}`}
            onClick={() => setActiveTab('chart')}
            title="Chart"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </button>

          {/* 2. Table */}
          <button
            type="button"
            className={`analysis-toggle-btn ${activeTab === 'table' ? 'active' : ''}`}
            onClick={() => setActiveTab('table')}
            title="Table"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
          </button>

          {/* 3. Calendar */}
          <button
            type="button"
            className={`analysis-toggle-btn ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
            title="Calendar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>

          {/* 4. Line Chart */}
          <button
            type="button"
            className={`analysis-toggle-btn ${activeTab === 'line' ? 'active' : ''}`}
            onClick={() => setActiveTab('line')}
            title="Trend"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </button>
        </div>

        {/* Dropdown Pill Periode (7 days s/d 1 year) */}
        <div className="analysis-period-pill" style={{ position: 'relative' }}>
          <span>{currentPeriodConfig.label}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 10l5 5 5-5z" />
          </svg>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
              appearance: 'none'
            }}
            title="Select analysis period (7 days to 1 year)"
          >
            {PERIOD_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Loading analysis..." />
      ) : error ? (
        <div className="alert-box alert-danger">{error}</div>
      ) : (
        <>
          {/* TAB 1 & 4: CHART VIEW (6.png) */}
          {(activeTab === 'chart' || activeTab === 'line') && (
            <div>
              {/* Main Stacked Bar Chart Card (6.png) */}
              <div className="analysis-card">
                <div style={{ position: 'relative', height: '240px', padding: '10px 10px 30px 30px' }}>
                  {/* Y Axis Labels */}
                  <div style={{ position: 'absolute', left: 4, top: 10, fontSize: '0.8rem', color: '#74777f' }}>{chartData.maxDayCount}</div>
                  <div style={{ position: 'absolute', left: 4, top: 90, fontSize: '0.8rem', color: '#74777f' }}>{Math.max(1, Math.round(chartData.maxDayCount / 2))}</div>
                  <div style={{ position: 'absolute', left: 4, bottom: 30, fontSize: '0.8rem', color: '#74777f' }}>0</div>

                  {/* Chart Axes Line */}
                  <div style={{ position: 'absolute', left: 24, top: 10, bottom: 30, width: '1px', backgroundColor: '#74777f' }} />
                  <div style={{ position: 'absolute', left: 24, right: 10, bottom: 30, height: '1px', backgroundColor: '#74777f' }} />

                  {/* Stacked Vertical Bars Dinamis per Hari (6.png) */}
                  {chartData.days.map((day, idx) => {
                    const leftPercent = 14 + idx * 12;
                    return (
                      <div
                        key={day.dateStr}
                        style={{
                          position: 'absolute',
                          left: `${leftPercent}%`,
                          bottom: 31,
                          width: '24px',
                          display: 'flex',
                          flexDirection: 'column-reverse',
                          alignItems: 'center'
                        }}
                      >
                        {Object.entries(day.medsCount).map(([medName, count]) => {
                          const segHeight = Math.max(8, Math.round((count / chartData.maxDayCount) * 150));
                          const color = chartData.medColors[medName] || '#3b5b82';
                          return (
                            <div
                              key={medName}
                              style={{
                                width: '100%',
                                height: `${segHeight}px`,
                                backgroundColor: color,
                                borderRadius: '2px 2px 0 0',
                                marginBottom: '1px'
                              }}
                              title={`${medName}: ${count} dosis (${day.label})`}
                            />
                          );
                        })}
                      </div>
                    );
                  })}

                  {/* X Axis Dates Real (6.png) */}
                  <div style={{ position: 'absolute', left: 24, right: 10, bottom: 8, display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#44474e' }}>
                    {chartData.days.map((day, idx) => (
                      <span key={idx}>{day.label}</span>
                    ))}
                  </div>
                </div>

                {/* Chart Legend (6.png) */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', padding: '8px 16px', fontSize: '0.84rem' }}>
                  {chartData.uniqueMedsList.length > 0 ? (
                    chartData.uniqueMedsList.map(name => (
                      <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: chartData.medColors[name] || '#3b5b82' }} />
                        <span style={{ fontWeight: '600' }}>{name}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#003355' }} />
                        <span style={{ fontWeight: '600' }}>Selen</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#8ef188' }} />
                        <span style={{ fontWeight: '600' }}>Ginseng</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Bottom Two Pie Charts (6.png) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '14px' }}>
                {/* Rentang Waktu Terpilih (7 days s/d 1 year) */}
                <div className="analysis-card" style={{ padding: '16px', textAlign: 'center' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--md-sys-color-on-surface)', marginBottom: '14px' }}>
                    {currentPeriodConfig.title}
                  </h4>
                  {/* SVG Pie Chart Dinamis */}
                  <div style={{ position: 'relative', width: '130px', height: '130px', margin: '0 auto' }}>
                    <svg viewBox="0 0 32 32" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)', borderRadius: '50%' }}>
                      {/* Taken Slice (Dark Blue) */}
                      <circle r="16" cx="16" cy="16" fill="#4c6491" strokeDasharray={`${stats.periodTakenPct} 100`} strokeDashoffset="0" />
                      {/* Skipped Slice (Light Blue) */}
                      <circle r="16" cx="16" cy="16" fill="#a8c4f9" strokeDasharray={`${stats.periodSkippedPct} 100`} strokeDashoffset={`-${stats.periodTakenPct}`} />
                    </svg>
                    {/* Percentage Labels Inside Pie */}
                    {stats.periodSkippedPct > 0 && (
                      <div style={{ position: 'absolute', top: '35%', left: '20%', fontSize: '0.78rem', fontWeight: '600', color: '#101c2b' }}>
                        {stats.periodSkippedPct}%
                      </div>
                    )}
                    {stats.periodTakenPct > 0 && (
                      <div style={{ position: 'absolute', bottom: '30%', right: '25%', fontSize: '0.78rem', fontWeight: '600', color: '#ffffff' }}>
                        {stats.periodTakenPct}%
                      </div>
                    )}
                    {stats.periodTakenPct === 0 && stats.periodSkippedPct === 0 && (
                      <div style={{ position: 'absolute', top: '40%', left: '38%', fontSize: '0.78rem', color: '#74777f' }}>
                        0%
                      </div>
                    )}
                  </div>
                  {/* Legend below */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '14px', fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#4c6491' }} />
                      <span>Taken ({stats.periodTaken})</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#a8c4f9' }} />
                      <span>Skipped ({stats.periodSkipped})</span>
                    </div>
                  </div>
                </div>

                {/* Total */}
                <div className="analysis-card" style={{ padding: '16px', textAlign: 'center' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--md-sys-color-on-surface)', marginBottom: '14px' }}>
                    Total
                  </h4>
                  {/* SVG Pie Chart Dinamis */}
                  <div style={{ position: 'relative', width: '130px', height: '130px', margin: '0 auto' }}>
                    <svg viewBox="0 0 32 32" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)', borderRadius: '50%' }}>
                      <circle r="16" cx="16" cy="16" fill="#4c6491" strokeDasharray={`${stats.totalTakenPct} 100`} strokeDashoffset="0" />
                      <circle r="16" cx="16" cy="16" fill="#a8c4f9" strokeDasharray={`${stats.totalSkippedPct} 100`} strokeDashoffset={`-${stats.totalTakenPct}`} />
                    </svg>
                    {stats.totalSkippedPct > 0 && (
                      <div style={{ position: 'absolute', top: '35%', left: '20%', fontSize: '0.78rem', fontWeight: '600', color: '#101c2b' }}>
                        {stats.totalSkippedPct}%
                      </div>
                    )}
                    {stats.totalTakenPct > 0 && (
                      <div style={{ position: 'absolute', bottom: '30%', right: '25%', fontSize: '0.78rem', fontWeight: '600', color: '#ffffff' }}>
                        {stats.totalTakenPct}%
                      </div>
                    )}
                    {stats.totalTakenPct === 0 && stats.totalSkippedPct === 0 && (
                      <div style={{ position: 'absolute', top: '40%', left: '38%', fontSize: '0.78rem', color: '#74777f' }}>
                        0%
                      </div>
                    )}
                  </div>
                  {/* Legend below */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '14px', fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#4c6491' }} />
                      <span>Taken ({stats.totalTaken})</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#a8c4f9' }} />
                      <span>Skipped ({stats.totalSkipped})</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TABLE VIEW (7.png) */}
          {activeTab === 'table' && (
            <div className="analysis-card" style={{ padding: '16px' }}>
              {/* Filter Box with Notch Label (7.png) */}
              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <input
                  type="text"
                  placeholder="Filter"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    backgroundColor: '#f0f3fa',
                    border: '1px solid #74777f',
                    borderRadius: '6px',
                    fontSize: '0.95rem',
                    color: 'var(--md-sys-color-on-surface)'
                  }}
                />
              </div>

              {/* Table Dinamis (7.png) */}
              <table className="m3-table-7">
                <thead>
                  <tr>
                    <th style={{ width: '38%' }}>Taken / Date</th>
                    <th style={{ width: '30%' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 16V4m0 0L3 8m4-4l4 4m6 4v12m0 0l4-4m-4 4l-4-4"/></svg>
                        Name
                      </span>
                    </th>
                    <th style={{ width: '16%' }}>Dosage</th>
                    <th style={{ width: '16%' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTableLogs.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: '#74777f' }}>
                        No records
                      </td>
                    </tr>
                  ) : (
                    filteredTableLogs.map(log => {
                      const d = new Date(log.acted_at || log.scheduled_at || Date.now());
                      const isTaken = log.status === 'taken' || log.status === 'extra';
                      const timeFormatted = `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)} ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
                      
                      const getStatusText = (item) => {
                        if (item.status === 'taken' || item.status === 'extra') return 'Taken';
                        if (item.status === 'skipped') return 'Skipped';
                        if (item.status === 'due') return 'Due';
                        if (item.status === 'pending') return 'Pending';
                        if (item.note) {
                          const n = String(item.note).toLowerCase();
                          if (n.includes('diminum') || n.includes('taken')) return 'Taken';
                          if (n.includes('dilewati') || n.includes('skipped')) return 'Skipped';
                          if (n.includes('waktu') || n.includes('alarm') || n.includes('due')) return 'Due';
                          if (n.includes('belum') || n.includes('pending')) return 'Pending';
                          return item.note;
                        }
                        return 'Pending';
                      };

                      return (
                        <tr key={log.id}>
                          <td>{isTaken ? timeFormatted : '-'}</td>
                          <td>
                            <Link to={`/history/${log.id}`} style={{ color: '#0b57d0', textDecoration: 'underline', fontWeight: '500' }}>
                              {log.medication_name}
                            </Link>
                          </td>
                          <td>{log.dosage || `${log.amount || 1} pills`}</td>
                          <td>{getStatusText(log)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: CALENDAR VIEW (8.png) */}
          {activeTab === 'calendar' && (
            <div>
              {/* Calendar Grid Card (8.png) */}
              <div className="analysis-card" style={{ padding: '16px', marginBottom: '14px' }}>
                {/* Header: < August 2025 ▼ > */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => {
                      const d = new Date(calendarDate);
                      d.setMonth(d.getMonth() - 1);
                      setCalendarDate(d);
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', fontSize: '1.05rem', color: '#191c20' }}>
                    <span>{calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z" /></svg>
                  </div>

                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => {
                      const d = new Date(calendarDate);
                      d.setMonth(d.getMonth() + 1);
                      setCalendarDate(d);
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                  </button>
                </div>

                {/* Day Labels (Sun - Sat in 8.png) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: '0.8rem', fontWeight: '500', color: '#44474e', marginBottom: '8px' }}>
                  <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
                </div>

                {/* Calendar Days (8.png) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center' }}>
                  {calendarData.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => item.dateObj && setCalendarDate(item.dateObj)}
                      style={{
                        height: '40px',
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: item.isSelected
                          ? '#3e5473'
                          : item.hasDoses
                            ? '#dce6fb'
                            : 'transparent',
                        color: item.isSelected
                          ? '#ffffff'
                          : item.isCurrentMonth
                            ? '#191c20'
                            : '#9aa5b5',
                        fontWeight: item.isSelected ? '700' : '500',
                        fontSize: '0.92rem',
                        cursor: item.isCurrentMonth ? 'pointer' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {item.day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Doses on Selected Date (8.png) */}
              <div className="analysis-card" style={{ padding: '16px' }}>
                <h4 style={{ fontSize: '0.98rem', fontWeight: '700', color: '#191c20', margin: '0 0 10px 0', paddingBottom: '8px', borderBottom: '1px solid #c4c6d0' }}>
                  {calendarDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </h4>

                {/* List items (8.png) tanpa emoji */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedDayLogs.length === 0 ? (
                    <p style={{ color: '#74777f', fontSize: '0.88rem', margin: '4px 0' }}>
                      No dose records for this date.
                    </p>
                  ) : (
                    selectedDayLogs.map(log => {
                      const d = new Date(log.acted_at || log.scheduled_at);
                      const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                      const statusText = log.status === 'taken' || log.status === 'extra' ? 'Taken' : log.status === 'skipped' ? 'Skipped' : 'Pending';
                      return (
                        <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.86rem' }}>
                          <div>
                            <strong style={{ color: '#191c20' }}>{timeStr} {log.medication_name}</strong>
                            {log.dosage && <span style={{ color: '#44474e' }}> ({log.dosage})</span>}
                            <span style={{ marginLeft: '6px', fontSize: '0.78rem', color: log.status === 'skipped' ? '#ba1a1a' : '#003355' }}>
                              [{statusText}]
                            </span>
                          </div>
                          <span style={{ color: '#44474e', fontSize: '0.82rem' }}>
                            ({log.amount || 1} {log.amount && log.amount > 1 ? 'pills' : 'pill'})
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Export CSV Button at Bottom */}
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportCSV}
              disabled={exporting || logs.length === 0}
              style={{ width: '100%' }}
            >
              {exporting ? 'Exporting...' : 'Export CSV Report'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
