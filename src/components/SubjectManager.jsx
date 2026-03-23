import React, { useState } from 'react';

const TYPE_CONFIG = {
  lecture:  { label: 'Lecture',  emoji: '📖', color: '#6c63ff' },
  lab:      { label: 'Lab',      emoji: '🔬', color: '#06b6d4' },
  training: { label: 'Training', emoji: '🖥️', color: '#f59e0b' },
};

export default function SubjectManager({ subjects, setSubjects }) {
  const [input, setInput] = useState('');
  const [type, setType]   = useState('lecture');
  const [error, setError] = useState('');

  const addSubject = () => {
    const name = input.trim();
    if (!name) { setError('Enter a subject name'); return; }
    if (subjects.find(s => s.name.toLowerCase() === name.toLowerCase())) {
      setError('Subject already added'); return;
    }
    setSubjects(prev => [...prev, { name, type, attendedClasses: 0 }]);
    setInput('');
    setError('');
  };

  const removeSubject = (name) => {
    setSubjects(prev => prev.filter(s => s.name !== name));
  };

  const updateAttended = (name, val) => {
    setSubjects(prev => prev.map(s =>
      s.name === name ? { ...s, attendedClasses: Math.max(0, parseInt(val) || 0) } : s
    ));
  };

  return (
    <div className="subject-manager">
      <h3 className="section-title">📚 Add Your Subjects</h3>
      <p className="section-hint">
        Enter each subject name and its type. You will set the schedule (days &amp; times) in the next step.
      </p>

      {/* Add row */}
      <div className="add-subject-form">
        <input
          className="input-field"
          placeholder="Subject name  e.g. DBMS, OS Lab, Placement Training"
          value={input}
          onChange={e => { setInput(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && addSubject()}
        />

        {/* Type selector */}
        <div className="type-pills">
          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              className={`type-pill ${type === key ? 'active' : ''}`}
              style={{ '--pill-color': cfg.color }}
              onClick={() => setType(key)}
              type="button"
            >
              {cfg.emoji} {cfg.label}
            </button>
          ))}
        </div>

        <button className="btn-add" onClick={addSubject}>+ Add</button>
      </div>

      {error && <p className="error-msg">⚠️ {error}</p>}

      {subjects.length === 0 ? (
        <div className="empty-state">No subjects yet — add at least one to continue.</div>
      ) : (
        <div className="subjects-list">
          {subjects.map(s => {
            const cfg = TYPE_CONFIG[s.type] || TYPE_CONFIG.lecture;
            return (
              <div key={s.name} className="subject-card" style={{ borderLeft: `3px solid ${cfg.color}` }}>
                <div className="subject-info">
                  <span className="subject-type-badge" style={{ background: cfg.color + '22', color: cfg.color }}>
                    {cfg.emoji} {cfg.label}
                  </span>
                  <span className="subject-name">{s.name}</span>
                </div>

                {/* Classes attended so far */}
                <div className="attended-row">
                  <label className="attended-label">Classes attended so far:</label>
                  <input
                    type="number"
                    className="inline-input"
                    value={s.attendedClasses}
                    min="0"
                    onChange={e => updateAttended(s.name, e.target.value)}
                  />
                </div>

                <button className="btn-remove" onClick={() => removeSubject(s.name)}>✕</button>
              </div>
            );
          })}
        </div>
      )}

      {subjects.length > 0 && (
        <div className="subjects-footer">
          {subjects.length} subject{subjects.length > 1 ? 's' : ''} added &nbsp;·&nbsp;
          {subjects.filter(s => s.type === 'lecture').length} lectures &nbsp;·&nbsp;
          {subjects.filter(s => s.type === 'lab').length} labs &nbsp;·&nbsp;
          {subjects.filter(s => s.type === 'training').length} trainings
        </div>
      )}
    </div>
  );
}