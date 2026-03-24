import React, { useState, useEffect } from 'react';
import TimetableImport from './components/TimetableImport';
import TimetableInput from './components/TimetableInput';
import ResultsDashboard from './components/ResultsDashboard';
import AuthPage from './components/AuthPage';
import {
  analyzeAttendance, fetchBatches, fetchBatch,
  fetchLatestTimetable, deleteBatch,
} from './utils/api';
import './App.css';

const STEPS = ['Timetable', 'Settings', 'Results'];

// ── Derive unique subjects from timetable entries ─────
// Only subjects that actually appear in the timetable
function subjectsFromEntries(entries) {
  const seen = new Set();
  const result = [];
  entries.forEach(r => {
    const name = r.subjectName?.trim();
    if (name && !seen.has(name)) {
      seen.add(name);
      result.push({
        name,
        type: r.subjectType || 'lecture',
        attendedClasses: 0,
      });
    }
  });
  return result;
}

// ── Convert DB entries array → timetable state object ─
function entriesToTimetable(entries) {
  const tt = {};
  entries.forEach(r => {
    if (r.day && r.timeSlot && r.subjectName) {
      tt[`${r.day}|${r.timeSlot}`] = {
        subjectName: r.subjectName,
        type: r.subjectType || 'lecture',
      };
    }
  });
  return tt;
}

// ── HolidayAdder sub-component ───────────────────────
function HolidayAdder({ onAdd }) {
  const [date,    setDate]    = React.useState('');
  const [label,   setLabel]   = React.useState('');
  const [mode,    setMode]    = React.useState('single'); // 'single' | 'range'
  const [fromDate, setFromDate] = React.useState('');
  const [toDate,   setToDate]   = React.useState('');

  // Generate all dates in a range (inclusive), skipping Sundays
  const getDatesInRange = (from, to) => {
    const dates = [];
    const cur = new Date(from);
    const end = new Date(to);
    while (cur <= end) {
      if (cur.getDay() !== 0) { // skip Sundays
        dates.push(cur.toISOString().split('T')[0]);
      }
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  };

  const addSingle = () => {
    if (!date) return;
    onAdd({ date, label: label.trim() || 'Holiday' });
    setDate(''); setLabel('');
  };

  const addRange = () => {
    if (!fromDate || !toDate) return;
    if (new Date(fromDate) > new Date(toDate)) return;
    const lbl = label.trim() || 'Vacation';
    const dates = getDatesInRange(fromDate, toDate);
    dates.forEach(d => onAdd({ date: d, label: lbl }));
    setFromDate(''); setToDate(''); setLabel('');
  };

  return (
    <div className="holiday-adder-wrap">
      {/* Mode toggle */}
      <div className="holiday-mode-toggle">
        <button
          className={`hmt-btn ${mode === 'single' ? 'active' : ''}`}
          onClick={() => setMode('single')}
        >📅 Single Day</button>
        <button
          className={`hmt-btn ${mode === 'range' ? 'active' : ''}`}
          onClick={() => setMode('range')}
        >🗓️ Long Vacation</button>
      </div>

      {mode === 'single' && (
        <div className="holiday-adder">
          <input type="date" className="holiday-date-input" value={date}
            onChange={e => setDate(e.target.value)} />
          <input type="text" className="holiday-label-input" placeholder="e.g. Diwali"
            value={label} onChange={e => setLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSingle()} />
          <button className="btn-add" onClick={addSingle}>+ Add</button>
        </div>
      )}

      {mode === 'range' && (
        <div className="holiday-adder">
          <div className="range-dates">
            <div className="range-field">
              <label className="range-label">From</label>
              <input type="date" className="holiday-date-input" value={fromDate}
                onChange={e => setFromDate(e.target.value)} />
            </div>
            <span className="range-sep">→</span>
            <div className="range-field">
              <label className="range-label">To</label>
              <input type="date" className="holiday-date-input" value={toDate}
                min={fromDate}
                onChange={e => setToDate(e.target.value)} />
            </div>
          </div>
          <input type="text" className="holiday-label-input" placeholder="e.g. Pongal Holidays"
            value={label} onChange={e => setLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addRange()} />
          <button className="btn-add" onClick={addRange}>
            + Add {fromDate && toDate && new Date(fromDate) <= new Date(toDate)
              ? `(${getDatesInRange(fromDate, toDate).length} days)`
              : ''}
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [step,        setStep]       = useState(0);
  const [subjects,    setSubjects]   = useState([]);
  const [timetable,   setTimetable]  = useState({});
  const [photos,      setPhotos]     = useState([]);
  const [settings,    setSettings]   = useState({
    totalWeeks:  16,
    currentWeek: 8,
    target:      75,  // attendance target % — customizable
    collegeDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'],
    holidays:    [],
  });
  const [results,     setResults]    = useState(null);
  const [loading,     setLoading]    = useState(false);
  const [dbLoading,   setDbLoading]  = useState(true);
  const [error,       setError]      = useState('');
  const [showImport,  setShowImport] = useState(false);
  const [batches,     setBatches]    = useState([]);
  const [activeBatchId, setActiveBatchId] = useState(null);
  const [showPicker,  setShowPicker] = useState(false);

  // ── Load from DB on mount ──────────────────────────────
  useEffect(() => {
    const init = async () => {
      setDbLoading(true);
      try {
        // Load batch list AND latest timetable entries
        const [batchList, latestEntries] = await Promise.all([
          fetchBatches(),
          fetchLatestTimetable(),
        ]);

        const validBatches = (batchList || []).filter(b => b?.batchId);
        setBatches(validBatches);

        if (latestEntries && latestEntries.length > 0) {
          // Build timetable from entries
          setTimetable(entriesToTimetable(latestEntries));
          // Subjects come ONLY from these timetable entries
          setSubjects(subjectsFromEntries(latestEntries));
          setActiveBatchId(latestEntries[0]?.batchId || null);
        }
      } catch (e) {
        console.log('DB load failed:', e.message);
      } finally {
        setDbLoading(false);
      }
    };
    init();
  }, []);

  // ── Switch to a different batch ────────────────────────
  const switchBatch = async (batchId) => {
    if (!batchId) return;
    try {
      const entries = await fetchBatch(batchId);
      if (!entries || entries.length === 0) return;

      // Timetable from this batch's entries
      const tt = entriesToTimetable(entries);
      // Subjects ONLY from this batch — keep attended counts if name matches
      const newSubjects = subjectsFromEntries(entries).map(s => {
        const existing = subjects.find(ex => ex.name === s.name);
        return existing ? { ...s, attendedClasses: existing.attendedClasses } : s;
      });

      setTimetable(tt);
      setSubjects(newSubjects);
      setActiveBatchId(batchId);
      setShowPicker(false);
      setResults(null);
      setStep(0);
    } catch (e) {
      setError('Could not load timetable: ' + e.message);
    }
  };

  // ── Delete a batch ─────────────────────────────────────
  const handleDeleteBatch = async (batchId, e) => {
    e.stopPropagation();
    if (!batchId) return;
    if (!window.confirm('Delete this timetable?')) return;
    try {
      await deleteBatch(batchId);
      const updated = batches.filter(b => b.batchId !== batchId);
      setBatches(updated);
      if (activeBatchId === batchId) {
        if (updated.length > 0) {
          switchBatch(updated[0].batchId);
        } else {
          setTimetable({}); setSubjects([]); setActiveBatchId(null);
        }
      }
    } catch (e) {
      setError('Could not delete: ' + e.message);
    }
  };

  // ── Import done → refresh everything ──────────────────
  const handleImportDone = async () => {
    setShowImport(false);
    setDbLoading(true);
    try {
      const [batchList, latestEntries] = await Promise.all([
        fetchBatches(),
        fetchLatestTimetable(),
      ]);

      const validBatches = (batchList || []).filter(b => b?.batchId);
      setBatches(validBatches);

      if (latestEntries && latestEntries.length > 0) {
        setTimetable(entriesToTimetable(latestEntries));
        // Subjects from the newly imported timetable ONLY
        setSubjects(subjectsFromEntries(latestEntries));
        setActiveBatchId(latestEntries[0]?.batchId || null);
      }
    } catch (_) {}
    finally {
      setDbLoading(false);
      setStep(0);
    }
  };

  // ── Build payload for analysis ─────────────────────────
  const buildPayload = () => {
    // Count how many times each subject appears per week
    const weeklyCount = {};
    subjects.forEach(s => { weeklyCount[s.name] = 0; });
    Object.values(timetable).forEach(c => {
      if (c?.subjectName) weeklyCount[c.subjectName] = (weeklyCount[c.subjectName] || 0) + 1;
    });

    const activeBatch = batches.find(b => b.batchId === activeBatchId);

    return {
      subjects: subjects.map(s => ({
        name:            s.name,
        type:            s.type || 'lecture',
        totalClasses:    calcEffectiveClasses(s.name, weeklyCount[s.name] || 0, false),
        attendedClasses: s.attendedClasses || 0,
      })),
      timetable: Object.entries(timetable)
        .filter(([, c]) => c?.subjectName)
        .map(([key, c]) => {
          const sep = key.indexOf('|');
          return {
            day:         key.substring(0, sep),
            timeSlot:    key.substring(sep + 1),
            subjectName: c.subjectName,
            subjectType: c.type || 'lecture',
          };
        }),
      totalWeeks:     settings.totalWeeks,
      currentWeek:    settings.currentWeek,
      target:         settings.target,
      timetableLabel: activeBatch?.label || '',
    };
  };

  const handleAnalyze = async () => {
    if (subjects.length === 0) { setError('Import your timetable first'); return; }
    setLoading(true); setError('');
    try {
      const data = await analyzeAttendance(buildPayload());
      setResults(data);
      setStep(2);
    } catch (_) {
      setError('Could not reach backend. Make sure Spring Boot is running on port 8080.');
    } finally { setLoading(false); }
  };

  const hasTimetable   = Object.keys(timetable).length > 0;

  // Calculate effective remaining weeks after excluding holidays
  // Each holiday that falls on a college day reduces class count by 1 day
  const calcEffectiveClasses = (subjectName, weekly, isRemaining) => {
    const baseWeeks = isRemaining
      ? Math.max(0, settings.totalWeeks - settings.currentWeek)
      : settings.currentWeek;
    let baseDays = baseWeeks * weekly;

    // Subtract holidays that fall on days this subject has class
    const subjectDays = Object.entries(timetable)
      .filter(([, c]) => c?.subjectName === subjectName)
      .map(([key]) => key.substring(0, key.indexOf('|'))); // e.g. ['Monday','Wednesday']

    const holidayDeductions = (settings.holidays || []).filter(h => {
      const d = new Date(h.date);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
      // Only count holiday if it falls on a day this subject has class
      return subjectDays.includes(dayName) && settings.collegeDays.includes(dayName);
    }).length;

    return Math.max(0, baseDays - holidayDeductions);
  };

  const weeksLeft = Math.max(0, settings.totalWeeks - settings.currentWeek);

  // Total holidays that affect college
  const effectiveHolidays = (settings.holidays || []).filter(h => {
    const d = new Date(h.date);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
    return settings.collegeDays.includes(dayName);
  });
  const activeBatch    = batches.find(b => b.batchId === activeBatchId);

  const stepAccessible = i => {
    if (i === 0) return hasTimetable;
    if (i === 1) return subjects.length > 0;
    if (i === 2) return results !== null;
    return false;
  };

  // ── Loading screen ─────────────────────────────────────
  if (dbLoading) {
    return (
      <div className="app">
        <div className="db-loading">
          <div className="db-spinner" />
          <p>Loading your timetable...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">

      {/* ── Header ─────────────────────────────────────── */}
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">🎓</span>
            <div>
              <h1 className="app-title">BunkMeter</h1>
              <p className="app-tagline">Know exactly how many classes you can skip</p>
            </div>
          </div>
          <div className="header-right">
            <div className="target-badge">Target: {settings.target}% 🎯</div>

            {/* Timetable version picker */}
            {batches.length > 0 && (
              <div className="batch-picker-wrap">
                <button
                  className="btn-batch-pick"
                  onClick={() => { setShowPicker(v => !v); setShowImport(false); }}
                >
                  📋 {activeBatch?.label || 'Select Timetable'} ▾
                </button>
                {showPicker && (
                  <div className="batch-dropdown">
                    <div className="batch-dropdown-title">Saved timetables</div>
                    {batches.map(b => (
                      <div
                        key={b.batchId}
                        className={`batch-item ${b.batchId === activeBatchId ? 'active' : ''}`}
                        onClick={() => switchBatch(b.batchId)}
                      >
                        <div className="batch-item-left">
                          {b.batchId === activeBatchId && <span className="batch-active-dot">●</span>}
                          <div>
                            <div className="batch-item-label">{b.label}</div>
                            <div className="batch-item-meta">
                              {b.entryCount} slots · {new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                          </div>
                        </div>
                        <button className="batch-delete" onClick={e => handleDeleteBatch(b.batchId, e)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              className={`btn-import-toggle ${showImport ? 'active' : ''}`}
              onClick={() => { setShowImport(v => !v); setShowPicker(false); }}
            >
              {showImport ? '✕ Close' : '📥 Import Timetable'}
            </button>
          </div>
        </div>
      </header>

      {/* ── Import panel ───────────────────────────────── */}
      {showImport && (
        <div className="import-panel">
          <TimetableImport
            subjects={subjects}
            setSubjects={setSubjects}
            setTimetable={setTimetable}
            onImportDone={handleImportDone}
            photos={photos}
            setPhotos={setPhotos}
          />
        </div>
      )}

      {/* ── No timetable yet ───────────────────────────── */}
      {!hasTimetable && !showImport && (
        <div className="welcome-card">
          <div className="welcome-icon">📅</div>
          <h2 className="welcome-title">No timetable found</h2>
          <p className="welcome-desc">
            Import your timetable from CampX / AU Pulse screenshots.
            Each import is saved separately — switch between them anytime.
          </p>
          <button className="btn-analyze" onClick={() => setShowImport(true)}>
            📥 Import Timetable
          </button>
        </div>
      )}

      {/* ── Main content ───────────────────────────────── */}
      {hasTimetable && !showImport && (
        <>
          <div className="stepper">
            {STEPS.map((label, i) => {
              const accessible = stepAccessible(i);
              const active = i === step;
              const done   = i < step || (i === 2 && results);
              return (
                <React.Fragment key={label}>
                  <div
                    className={`step ${active ? 'active' : ''} ${done ? 'done' : ''} ${accessible && !active ? 'clickable' : ''}`}
                    onClick={() => accessible && setStep(i)}
                  >
                    <div className="step-circle">{done && !active ? '✓' : i + 1}</div>
                    <span className="step-label">{label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`step-line ${i < step ? 'done' : ''}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <main className="app-main">

            {/* Step 0 — Timetable view */}
            {step === 0 && (
              <TimetableInput
                subjects={subjects}
                timetable={timetable}
                setTimetable={setTimetable}
              />
            )}

            {/* Step 1 — Settings */}
            {step === 1 && (
              <div className="settings-section">
                <h3 className="section-title">⚙️ Semester Settings</h3>
                <p className="section-hint">Configure your semester — holidays and off-days are excluded from calculations.</p>

                {/* Weeks + Target */}
                <div className="settings-grid settings-grid-3">
                  <div className="setting-card">
                    <label className="setting-label">Total Weeks in Semester</label>
                    <input type="number" className="setting-input"
                      value={settings.totalWeeks} min="1" max="52"
                      onChange={e => setSettings(p => ({ ...p, totalWeeks: parseInt(e.target.value) || 16 }))} />
                    <span className="setting-hint">Usually 16–20 weeks</span>
                  </div>
                  <div className="setting-card">
                    <label className="setting-label">Current Week Number</label>
                    <input type="number" className="setting-input"
                      value={settings.currentWeek} min="0" max={settings.totalWeeks}
                      onChange={e => setSettings(p => ({ ...p, currentWeek: parseInt(e.target.value) || 0 }))} />
                    <span className="setting-hint">How many weeks have passed?</span>
                  </div>
                  <div className="setting-card target-card">
                    <label className="setting-label">Attendance Target %</label>
                    <div className="target-input-wrap">
                      <input type="number" className="setting-input"
                        value={settings.target} min="1" max="100"
                        onChange={e => {
                          const v = Math.min(100, Math.max(1, parseInt(e.target.value) || 75));
                          setSettings(p => ({ ...p, target: v }));
                        }} />
                      <span className="target-pct-symbol">%</span>
                    </div>
                    {/* Quick presets */}
                    <div className="target-presets">
                      {[65, 75, 80, 85].map(t => (
                        <button
                          key={t}
                          className={`target-preset ${settings.target === t ? 'active' : ''}`}
                          onClick={() => setSettings(p => ({ ...p, target: t }))}
                        >{t}%</button>
                      ))}
                    </div>
                    <span className="setting-hint">
                      {settings.target < 75
                        ? '⚠️ Below standard 75%'
                        : settings.target === 75
                        ? '✓ Standard requirement'
                        : `↑ Stricter than standard`}
                    </span>
                  </div>
                </div>

                {/* College working days */}
                <div className="setting-block">
                  <div className="setting-block-title">📅 College Working Days</div>
                  <p className="setting-block-hint">Uncheck days your college doesn't have classes (e.g. Saturday)</p>
                  <div className="days-toggle-row">
                    {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(day => {
                      const active = settings.collegeDays.includes(day);
                      return (
                        <button
                          key={day}
                          className={`day-toggle ${active ? 'on' : 'off'}`}
                          onClick={() => setSettings(p => ({
                            ...p,
                            collegeDays: active
                              ? p.collegeDays.filter(d => d !== day)
                              : [...p.collegeDays, day],
                          }))}
                        >
                          {day.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Holidays */}
                <div className="setting-block">
                  <div className="setting-block-title">🏖️ Holidays & Off Days</div>
                  <p className="setting-block-hint">Add holidays so they are excluded from class counts</p>

                  {/* Holiday list — group by label+consecutive for ranges */}
                  {(settings.holidays || []).length > 0 && (() => {
                    // Group consecutive dates with same label into ranges
                    const holidays = settings.holidays || [];
                    const groups = [];
                    let i = 0;
                    while (i < holidays.length) {
                      const lbl = holidays[i].label;
                      let j = i;
                      // Find consecutive days with same label
                      while (
                        j + 1 < holidays.length &&
                        holidays[j + 1].label === lbl &&
                        (new Date(holidays[j + 1].date) - new Date(holidays[j].date)) <= 2 * 86400000
                      ) j++;
                      groups.push({ from: holidays[i].date, to: holidays[j].date, label: lbl, indices: Array.from({length: j - i + 1}, (_, k) => i + k) });
                      i = j + 1;
                    }
                    const affectsCount = holidays.filter(h => {
                      const dayName = new Date(h.date).toLocaleDateString('en-US', { weekday: 'long' });
                      return settings.collegeDays.includes(dayName);
                    }).length;

                    return (
                      <div className="holiday-list">
                        {groups.map((g, gi) => {
                          const isRange = g.from !== g.to;
                          const dFrom = new Date(g.from);
                          const dTo   = new Date(g.to);
                          const affectedDays = g.indices.filter(idx => {
                            const dayName = new Date(holidays[idx].date).toLocaleDateString('en-US', { weekday: 'long' });
                            return settings.collegeDays.includes(dayName);
                          }).length;
                          return (
                            <div key={gi} className={`holiday-item ${affectedDays > 0 ? 'affects' : 'noclass'}`}>
                              <span className="holiday-date">
                                {dFrom.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                {isRange && <> → {dTo.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</>}
                                {!isRange && <span className="holiday-day"> ({dFrom.toLocaleDateString('en-US', { weekday: 'long' })})</span>}
                              </span>
                              <span className="holiday-label">{g.label}</span>
                              {affectedDays > 0
                                ? <span className="holiday-tag affects-tag">-{affectedDays} class day{affectedDays > 1 ? 's' : ''}</span>
                                : <span className="holiday-tag noclass-tag">no impact</span>
                              }
                              <button className="holiday-remove"
                                onClick={() => setSettings(p => ({
                                  ...p,
                                  holidays: p.holidays.filter((_, idx) => !g.indices.includes(idx))
                                }))}>✕</button>
                            </div>
                          );
                        })}
                        {affectsCount > 0 && (
                          <div className="holiday-total-note">
                            Total: <strong>{affectsCount} college day{affectsCount > 1 ? 's' : ''}</strong> excluded from class counts
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Add holiday */}
                  <HolidayAdder onAdd={h => setSettings(p => ({ ...p, holidays: [...(p.holidays || []), h] }))} />
                </div>

                {/* Attended classes */}
                <div className="attended-section">
                  <h4 className="calc-title">📋 Classes attended so far — {activeBatch?.label || 'current timetable'}</h4>
                  <div className="attended-grid">
                    {subjects.map(s => {
                      const weekly = Object.values(timetable).filter(c => c?.subjectName === s.name).length;
                      const held   = calcEffectiveClasses(s.name, weekly, false);
                      const pct    = held > 0 ? Math.round(((s.attendedClasses || 0) / held) * 100) : 0;
                      return (
                        <div key={s.name} className="attended-card">
                          <div className="ac-name">{s.name}</div>
                          <div className="ac-meta">
                            {weekly}/week · {held} held
                            {effectiveHolidays.length > 0 && <span className="ac-holiday-note"> (excl. holidays)</span>}
                          </div>
                          <div className="ac-input-row">
                            <span className="ac-label">Attended:</span>
                            <input type="number" className="ac-input"
                              value={s.attendedClasses || 0} min="0" max={held}
                              onChange={e => setSubjects(prev => prev.map(sub =>
                                sub.name === s.name
                                  ? { ...sub, attendedClasses: Math.min(parseInt(e.target.value) || 0, held) }
                                  : sub
                              ))} />
                            <span className="ac-total">/ {held}</span>
                          </div>
                          <div className="ac-pct-bar">
                            <div className="ac-pct-fill" style={{
                              width: `${Math.min(pct,100)}%`,
                              background: pct >= settings.target ? 'var(--green)' : 'var(--red)',
                            }} />
                          </div>
                          <div className="ac-pct-label" style={{ color: pct >= settings.target ? 'var(--green)' : 'var(--red)' }}>
                            {pct}% so far
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="settings-summary">
                  <div className="sum-item">
                    <span className="sum-label">Weeks remaining</span>
                    <span className="sum-val">{weeksLeft}</span>
                  </div>
                  <div className="sum-item">
                    <span className="sum-label">Holidays excluded</span>
                    <span className="sum-val">{effectiveHolidays.length}</span>
                  </div>
                  <div className="sum-item">
                    <span className="sum-label">Semester progress</span>
                    <span className="sum-val">
                      {settings.totalWeeks > 0 ? Math.round((settings.currentWeek / settings.totalWeeks) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 — Results */}
            {step === 2 && <ResultsDashboard results={results} target={settings.target} />}

            {error && <div className="error-banner">⚠️ {error}</div>}

            <div className="nav-buttons">
              {step > 0 && step < 2 && (
                <button className="btn-back" onClick={() => setStep(s => s - 1)}>← Back</button>
              )}
              {step === 0 && (
                <button className="btn-next" onClick={() => setStep(1)}>Settings →</button>
              )}
              {step === 1 && (
                <button className="btn-analyze" onClick={handleAnalyze} disabled={loading}>
                  {loading ? '⏳ Analyzing...' : '🔍 Analyze Attendance'}
                </button>
              )}
              {step === 2 && (
                <button className="btn-next" onClick={() => setStep(1)}>← Edit Settings</button>
              )}
            </div>
          </main>
        </>
      )}
    </div>
  );
}
