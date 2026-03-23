import React, { useState, useRef } from 'react';
import { createWorker } from 'tesseract.js';
import { parseCampXText, matchToKnownSubjects, detectType } from '../utils/ocrParser.js';

// Defined locally to avoid Windows file casing issues
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TYPE_COLORS = {
  lecture:  '#6c63ff',
  lab:      '#06b6d4',
  training: '#f59e0b',
};

export default function TimetableImport({ subjects, setSubjects, setTimetable, onImportDone, photos, setPhotos }) {
  // If user is coming back and already uploaded photos, restore state
  const [mode, setMode]           = useState(photos.length > 0 ? 'photo' : null);
  const restoredEntries = photos.flatMap(p => p.entries || []);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed]   = useState(restoredEntries);
  const [error, setError]         = useState('');
  const [textInput, setTextInput] = useState('');
  const fileRef = useRef();

  // ── Add photos ────────────────────────────────────────
  const handlePhotosAdd = (files) => {
    const newPhotos = Array.from(files).map(file => ({
      day: '', file, preview: URL.createObjectURL(file),
      status: 'pending', progress: 0, entries: [], rawText: '',
    }));
    setPhotos(prev => [...prev, ...newPhotos]);
    setError('');
  };

  const removePhoto   = (preview) => setPhotos(prev => prev.filter(p => p.preview !== preview));
  const setPhotoDay   = (preview, day) => setPhotos(prev => prev.map(p => p.preview === preview ? { ...p, day } : p));

  // ── Run Tesseract OCR ─────────────────────────────────
  const analyzeAllPhotos = async () => {
    if (photos.length === 0) { setError('Upload at least one screenshot'); return; }
    if (photos.some(p => !p.day)) { setError('Assign a day to every photo first'); return; }

    setAnalyzing(true); setError('');
    const allEntries = [];

    for (const photo of photos) {
      setPhotos(prev => prev.map(p =>
        p.preview === photo.preview ? { ...p, status: 'reading', progress: 0 } : p
      ));
      try {
        const worker = await createWorker('eng', 1, {
          logger: m => {
            if (m.status === 'recognizing text') {
              setPhotos(prev => prev.map(p =>
                p.preview === photo.preview ? { ...p, progress: Math.round(m.progress * 100) } : p
              ));
            }
          },
        });
        const { data: { text } } = await worker.recognize(photo.file);
        await worker.terminate();

        let entries = parseCampXText(text, photo.day);
        entries = matchToKnownSubjects(entries, subjects);

        allEntries.push(...entries);
        setPhotos(prev => prev.map(p =>
          p.preview === photo.preview
            ? { ...p, status: 'done', progress: 100, entries, rawText: text }
            : p
        ));
      } catch (e) {
        setPhotos(prev => prev.map(p =>
          p.preview === photo.preview ? { ...p, status: 'error' } : p
        ));
        setError(prev => (prev ? prev + '\n' : '') + `${photo.day}: ${e.message}`);
      }
    }

    setAnalyzed(allEntries);
    setAnalyzing(false);
  };

  // ── Text parser ───────────────────────────────────────
  const parseTextInput = () => {
    const lines   = textInput.trim().split('\n').filter(l => l.trim());
    const entries = []; const errors = [];
    lines.forEach((line, i) => {
      const parts = line.trim().split(/\t|  +/);
      if (parts.length < 3) { errors.push(`Line ${i+1}: need Day  Time  Subject`); return; }
      const [day, timeSlot, subjectName, type] = parts;
      if (!DAYS.includes(day)) { errors.push(`Line ${i+1}: invalid day "${day}"`); return; }
      entries.push({ day, timeSlot: timeSlot.replace('-',' - '), subjectName, type: type || detectType(subjectName), attended: false });
    });
    if (errors.length) { setError(errors.join('\n')); return; }
    setAnalyzed(matchToKnownSubjects(entries, subjects));
    setError('');
  };

  // ── Apply — use exactly what user edited/confirmed ────
  const applyToTimetable = () => {
    if (!analyzed.length) return;

    // Use the EDITED names from analyzed state (user may have fixed them)
    // Deduplicate: if two entries have same name after trim, they are same subject
    const canonicalMap = new Map(); // lowercase → canonical (user-edited) name
    analyzed.forEach(entry => {
      const name = entry.subjectName.trim();
      if (!name) return;
      const lower = name.toLowerCase();
      if (!canonicalMap.has(lower)) {
        canonicalMap.set(lower, { name, type: entry.type || 'lecture' });
      }
    });

    // Build timetable from edited entries
    const newTimetable = {};
    analyzed.forEach(entry => {
      const name = entry.subjectName.trim();
      const slot = entry.timeSlot.trim();
      if (!name || !slot) return;
      const canonical = canonicalMap.get(name.toLowerCase())?.name || name;
      newTimetable[`${entry.day}|${slot}`] = {
        subjectName: canonical,
        type: entry.type || 'lecture',
      };
    });

    // Build subjects list from canonical names only
    const newSubjects = [...canonicalMap.values()].map(s => ({
      name:            s.name,
      type:            s.type,
      attendedClasses: 0,
    }));

    setSubjects(newSubjects);      // Replace entirely with deduplicated list
    setTimetable(newTimetable);    // Replace entirely
    onImportDone(analyzed);
  };

  const updateEntry = (i, field, value) =>
    setAnalyzed(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e));
  const removeEntry = (i) =>
    setAnalyzed(prev => prev.filter((_, idx) => idx !== i));
  const addEntry = () =>
    setAnalyzed(prev => [...prev, { day: 'Monday', timeSlot: '', subjectName: '', type: 'lecture', attended: false }]);

  const statusIcon = { pending: '⏳', reading: '🔍', done: '✅', error: '❌' };

  // ── Render ────────────────────────────────────────────
  return (
    <div className="import-container">
      <h3 className="section-title">📥 Import Timetable</h3>
      <p className="section-hint">
        All options are <strong style={{color:'var(--green)'}}>100% free</strong> — no API key needed
      </p>

      {/* ── MODE PICKER ── */}
      {!mode && (
        <div className="import-options">
          <button className="import-card" onClick={() => setMode('photo')}>
            <div className="import-icon">📸</div>
            <div className="import-card-title">CampX Screenshots</div>
            <div className="import-card-desc">
              Screenshot each day from <strong>CampX / AU Pulse</strong> Schedule tab.
              Reads text automatically — subjects are added for you automatically.
            </div>
            <div className="import-badge free-badge">🆓 Free OCR · No API key</div>
          </button>

          <button className="import-card" onClick={() => setMode('text')}>
            <div className="import-icon">⌨️</div>
            <div className="import-card-title">Type / Paste</div>
            <div className="import-card-desc">
              Paste text copied from CampX or type it manually. Subjects added automatically.
            </div>
            <div className="import-badge free-badge">🆓 Free</div>
          </button>

          <button className="import-card" onClick={() => { setMode('manual'); onImportDone([]); }}>
            <div className="import-icon">🗓️</div>
            <div className="import-card-title">Fill Grid Manually</div>
            <div className="import-card-desc">
              Use the visual weekly grid — pick subjects for each slot. Subjects from Step 1 shown.
            </div>
            <div className="import-badge free-badge">🆓 Free</div>
          </button>
        </div>
      )}

      {/* ── PHOTO / OCR MODE ── */}
      {mode === 'photo' && !analyzed.length && (
        <div className="photo-mode">
          <button className="btn-back-mode" onClick={() => { setMode(null); setPhotos([]); setError(''); }}>← Back</button>

          <div className="campx-guide">
            <div className="guide-title">📱 How to get screenshots from CampX / AU Pulse</div>
            <div className="guide-steps">
              <div className="guide-step"><span className="gs-num">1</span><span>Open CampX → tap <strong>Schedule</strong></span></div>
              <div className="guide-step"><span className="gs-num">2</span><span>Swipe to <strong>Monday</strong> → take screenshot</span></div>
              <div className="guide-step"><span className="gs-num">3</span><span>Repeat for <strong>each day</strong> you have classes</span></div>
              <div className="guide-step"><span className="gs-num">4</span><span>Upload all → assign day → click Extract</span></div>
            </div>
            <div className="ocr-note">
              ✅ <strong>Tesseract OCR</strong> — runs in your browser, free forever.
              Subjects found in screenshots are <strong>auto-added</strong> — no manual entry needed!
            </div>
          </div>

          <div className="upload-zone multi"
            onClick={() => fileRef.current.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handlePhotosAdd(e.dataTransfer.files); }}>
            <div className="upload-icon">📷</div>
            <p><strong>Click to upload</strong> or drag & drop</p>
            <p className="upload-hint">Upload one screenshot per day — you can select multiple files at once</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple
            style={{ display:'none' }} onChange={e => handlePhotosAdd(e.target.files)} />

          {photos.length > 0 && (
            <div className="photo-cards">
              {photos.map(photo => (
                <div key={photo.preview} className={`photo-card ${photo.status}`}>
                  <img src={photo.preview} alt="schedule" className="photo-thumb" />
                  <div className="photo-card-body">
                    <div className="photo-status">
                      {statusIcon[photo.status]}&nbsp;
                      {photo.status === 'reading' && `Reading... ${photo.progress}%`}
                      {photo.status === 'done'    && `${photo.entries.length} class${photo.entries.length !== 1 ? 'es' : ''} found`}
                      {photo.status === 'error'   && 'Failed to read'}
                      {photo.status === 'pending' && 'Ready'}
                    </div>
                    {photo.status === 'reading' && (
                      <div className="ocr-progress-bar">
                        <div className="ocr-progress-fill" style={{ width: `${photo.progress}%` }} />
                      </div>
                    )}
                    <select className="day-select" value={photo.day}
                      onChange={e => setPhotoDay(photo.preview, e.target.value)}>
                      <option value="">-- Select Day --</option>
                      {DAYS.filter(d => d !== 'Sunday').map(d => <option key={d}>{d}</option>)}
                    </select>
                    {photo.entries.length > 0 && (
                      <div className="photo-entries-preview">
                        {photo.entries.map((e, i) => (
                          <div key={i} className="mini-entry"
                            style={{ borderLeft: `2px solid ${TYPE_COLORS[e.type] || '#6c63ff'}` }}>
                            <span className="me-time">{e.timeSlot}</span>
                            <span className="me-name">{e.subjectName}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button className="btn-remove" onClick={() => removePhoto(photo.preview)}>✕</button>
                </div>
              ))}
            </div>
          )}

          {photos.length > 0 && (
            <button className="btn-analyze" onClick={analyzeAllPhotos} disabled={analyzing}>
              {analyzing
                ? `🔍 Reading ${photos.length} screenshot${photos.length > 1 ? 's' : ''}...`
                : `🔍 Extract from ${photos.length} screenshot${photos.length > 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      )}

      {/* ── TEXT MODE ── */}
      {mode === 'text' && !analyzed.length && (
        <div className="text-mode">
          <button className="btn-back-mode" onClick={() => { setMode(null); setError(''); }}>← Back</button>
          <h4 className="sub-title">Paste or type your timetable</h4>
          <p className="section-hint">Use <strong>Tab</strong> between columns. Subjects are auto-added.</p>
          <div className="format-example">
            <div className="ex-line"><span className="ex-day">Tuesday</span><span className="ex-time">9:00-9:55</span><span className="ex-sub">Data Science</span><span className="ex-type">lecture</span></div>
            <div className="ex-line"><span className="ex-day">Tuesday</span><span className="ex-time">9:55-10:50</span><span className="ex-sub">Cloud Application Architectures</span><span className="ex-type">lecture</span></div>
            <div className="ex-line"><span className="ex-day">Monday</span><span className="ex-time">9:00-4:00</span><span className="ex-sub">Industry Training</span><span className="ex-type">training</span></div>
          </div>
          <textarea className="text-import-area"
            placeholder={"Tuesday\t9:00-9:55\tData Science\tlecture\n..."}
            value={textInput} onChange={e => setTextInput(e.target.value)} rows={10} />
          <button className="btn-analyze" onClick={parseTextInput}>📋 Parse Timetable</button>
        </div>
      )}

      {/* ── REVIEW & EDIT RESULTS ── */}
      {analyzed.length > 0 && (
        <div className="parsed-result">
          <div className="parsed-header">
            <h4 className="parsed-title">✅ {analyzed.length} slots extracted</h4>
            <div className="auto-add-note">
              Fix subject names below — editing a name here updates all slots with that subject.
            </div>
          </div>

          {/* ── SUBJECT NAME EDITOR (most important — fix once, applies everywhere) ── */}
          {(() => {
            // Build unique subjects from analyzed
            const subjectMap = new Map();
            analyzed.forEach(e => {
              const n = e.subjectName.trim();
              if (!n) return;
              const k = n.toLowerCase();
              if (!subjectMap.has(k)) subjectMap.set(k, { original: n, edited: n, type: e.type || 'lecture' });
            });
            const uniqueList = [...subjectMap.entries()]; // [lowerKey, {original, edited, type}]

            if (uniqueList.length === 0) return null;

            return (
              <div className="subject-name-editor">
                <div className="sne-title">📝 Step 1 — Fix subject names (OCR may have added noise characters)</div>
                <div className="sne-list">
                  {uniqueList.map(([key, info]) => (
                    <div key={key} className="sne-row">
                      <span className="sne-original">{info.original}</span>
                      <span className="sne-arrow">→</span>
                      <input
                        className="sne-input"
                        defaultValue={info.original}
                        onBlur={e => {
                          const newName = e.target.value.trim();
                          if (!newName || newName === info.original) return;
                          // Update ALL entries that had this subject name
                          setAnalyzed(prev => prev.map(entry =>
                            entry.subjectName.trim().toLowerCase() === key
                              ? { ...entry, subjectName: newName }
                              : entry
                          ));
                        }}
                        placeholder="Corrected name"
                      />
                      <select
                        className="pe-select sne-type"
                        value={info.type}
                        onChange={e => {
                          const newType = e.target.value;
                          setAnalyzed(prev => prev.map(entry =>
                            entry.subjectName.trim().toLowerCase() === key
                              ? { ...entry, type: newType }
                              : entry
                          ));
                        }}
                        style={{ color: TYPE_COLORS[info.type] }}
                      >
                        <option value="lecture">📖 Lecture</option>
                        <option value="lab">🔬 Lab</option>
                        <option value="training">🏋️ Training</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* ── SLOT LIST grouped by day ── */}
          <div className="sne-title" style={{ marginTop: 16 }}>📅 Step 2 — Review slots (fix time or day if wrong)</div>
          {DAYS.filter(d => analyzed.some(e => e.day === d)).map(day => (
            <div key={day} className="parsed-day-group">
              <div className="parsed-day-header">
                {day} — {analyzed.filter(e => e.day === day).length} class{analyzed.filter(e => e.day === day).length !== 1 ? 'es' : ''}
              </div>
              {analyzed.filter(e => e.day === day).map((entry) => {
                const i = analyzed.indexOf(entry);
                return (
                  <div key={i} className="parsed-entry"
                    style={{ borderLeft: `3px solid ${TYPE_COLORS[entry.type] || '#6c63ff'}` }}>
                    <select className="pe-select" value={entry.day}
                      onChange={e => updateEntry(i, 'day', e.target.value)}>
                      {DAYS.filter(d => d !== 'Sunday').map(d => <option key={d}>{d}</option>)}
                    </select>
                    <input className="pe-input" value={entry.timeSlot}
                      onChange={e => updateEntry(i, 'timeSlot', e.target.value)} placeholder="9:00 - 9:55" />
                    <span className="pe-subject-label">{entry.subjectName}</span>
                    <button className="btn-remove" onClick={() => removeEntry(i)}>✕</button>
                  </div>
                );
              })}
            </div>
          ))}

          <button className="btn-add-entry" onClick={addEntry}>+ Add missing class manually</button>

          <div className="parsed-actions">
            <button className="btn-back" onClick={() => { setAnalyzed([]); }}>↩ Re-scan</button>
            <button className="btn-analyze" onClick={applyToTimetable}>
              ✅ Apply ({analyzed.length} slots, {new Set(analyzed.map(e => e.subjectName.trim().toLowerCase())).size} subjects)
            </button>
          </div>
        </div>
      )}

      {error && <div className="error-banner" style={{ whiteSpace: 'pre-line' }}>⚠️ {error}</div>}
    </div>
  );
}