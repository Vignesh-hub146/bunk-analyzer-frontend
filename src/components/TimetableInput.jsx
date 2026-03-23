import React, { useState } from 'react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TYPE_COLORS = {
  lecture:  '#6c63ff',
  lab:      '#06b6d4',
  training: '#f59e0b',
};

export default function TimetableInput({ subjects, timetable, setTimetable }) {
  const [customSlot, setCustomSlot] = useState('');
  const [showAddSlot, setShowAddSlot] = useState(false);

  // ── Derive slots dynamically from timetable keys ────────────────────────
  const [extraSlots, setExtraSlots] = useState([]);

  // Normalize a slot string: trim spaces, ensure "H:MM - H:MM" format
  const normalizeSlot = s => s
    .trim()
    .replace(/\s*-\s*/g, ' - ')          // "9:00-9:55"  → "9:00 - 9:55"
    .replace(/(^|\s)0(\d)/g, '$1$2')     // "09:00"      → "9:00"
    .replace(/\s+/g, ' ');               // collapse spaces

  // Extract minutes-since-midnight from a slot string (uses START time)
  const slotToMinutes = s => {
    const m = s.match(/(\d{1,2}):(\d{2})/);  // first HH:MM found
    return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 0;
  };

  const slotsFromTimetable = [...new Set(
    Object.keys(timetable).map(k => normalizeSlot(k.substring(k.indexOf('|') + 1)))
  )];

  // Merge and sort by actual start time (minutes), not alphabetically
  const allSlots = [...new Set([...slotsFromTimetable, ...extraSlots])]
    .sort((a, b) => slotToMinutes(a) - slotToMinutes(b));

  // Lookup with normalized key so "9:00 - 9:55" and "9:00-9:55" both match
  const getCell = (day, slot) => {
    const key = `${day}|${normalizeSlot(slot)}`;
    // Also try original key in case timetable was set before normalization
    return timetable[key] || timetable[`${day}|${slot}`] || null;
  };

  const handleCellChange = (day, slot, subjectName) => {
    const key = `${day}|${slot}`;
    if (!subjectName) {
      setTimetable(prev => { const n = { ...prev }; delete n[key]; return n; });
      return;
    }
    const subj = subjects.find(s => s.name === subjectName);
    setTimetable(prev => ({
      ...prev,
      [key]: { subjectName, type: subj?.type || 'lecture' }
    }));
  };

  const addCustomSlot = () => {
    const s = customSlot.trim();
    if (!s) return;
    // Normalize: "9:00-10:00" → "9:00 - 10:00"
    const normalized = s.replace(/\s*-\s*/, ' - ');
    setExtraSlots(prev => [...new Set([...prev, normalized])]);
    setCustomSlot('');
    setShowAddSlot(false);
  };

  const removeSlot = (slot) => {
    setExtraSlots(prev => prev.filter(s => s !== slot));
    setTimetable(prev => {
      const n = { ...prev };
      DAYS.forEach(d => delete n[`${d}|${slot}`]);
      return n;
    });
  };

  // Summary per subject
  const summary = {};
  subjects.forEach(s => { summary[s.name] = 0; });
  Object.values(timetable).forEach(cell => {
    if (cell?.subjectName) summary[cell.subjectName] = (summary[cell.subjectName] || 0) + 1;
  });

  const filledCount = Object.values(timetable).filter(Boolean).length;

  return (
    <div className="timetable-section">
      <h3 className="section-title">📅 Weekly Timetable</h3>
      {filledCount > 0 ? (
        <p className="section-hint">
          ✅ {filledCount} slot{filledCount !== 1 ? 's' : ''} imported from your screenshots.
          Fix any mistakes below.
        </p>
      ) : (
        <p className="section-hint">
          Fill in your subjects for each day and time slot.
        </p>
      )}

      <div className="timetable-scroll">
        <table className="timetable-table">
          <thead>
            <tr>
              <th className="th-time">
                Time Slot
                <button className="btn-add-slot" onClick={() => setShowAddSlot(v => !v)}>
                  + slot
                </button>
              </th>
              {DAYS.map(day => (
                <th key={day} className="th-day">{day.slice(0, 3)}</th>
              ))}
            </tr>
            {showAddSlot && (
              <tr>
                <th colSpan={7} className="add-slot-row">
                  <input
                    className="slot-input"
                    placeholder="e.g. 9:55 - 10:50"
                    value={customSlot}
                    onChange={e => setCustomSlot(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustomSlot()}
                  />
                  <button className="btn-add" onClick={addCustomSlot}>Add</button>
                  <button className="btn-back" onClick={() => setShowAddSlot(false)}>Cancel</button>
                </th>
              </tr>
            )}
          </thead>
          <tbody>
            {allSlots.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#888', padding: '24px' }}>
                  No slots yet — import your timetable or click "+ slot" to add manually
                </td>
              </tr>
            )}
            {allSlots.map(slot => (
              <tr key={slot}>
                <td className="td-time">
                  <span>{slot}</span>
                  {!slotsFromTimetable.includes(slot) && (
                    <button className="btn-remove-slot" onClick={() => removeSlot(slot)}>✕</button>
                  )}
                </td>
                {DAYS.map(day => {
                  const cell  = getCell(day, slot);
                  const color = cell ? TYPE_COLORS[cell.type] || '#6c63ff' : null;
                  return (
                    <td key={day} className="td-cell">
                      <select
                        className="cell-select"
                        value={cell?.subjectName || ''}
                        onChange={e => handleCellChange(day, slot, e.target.value)}
                        style={cell ? { borderBottom: `2px solid ${color}`, color } : {}}
                      >
                        <option value="">—</option>
                        {subjects.map(s => (
                          <option key={s.name} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="legend-row">
        <span className="legend-item"><span className="dot" style={{ background: '#6c63ff' }} /> Lecture</span>
        <span className="legend-item"><span className="dot" style={{ background: '#06b6d4' }} /> Lab</span>
        <span className="legend-item"><span className="dot" style={{ background: '#f59e0b' }} /> Training</span>
      </div>

      {filledCount > 0 && (
        <div className="timetable-summary">
          <h4>📊 Weekly frequency:</h4>
          <div className="subject-counts">
            {subjects.map(s => {
              const count = summary[s.name] || 0;
              const color = { lecture: '#6c63ff', lab: '#06b6d4', training: '#f59e0b' }[s.type] || '#6c63ff';
              return count > 0 ? (
                <span key={s.name} className="count-badge" style={{ borderColor: color }}>
                  {s.name}: <strong>{count}</strong>/week
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}