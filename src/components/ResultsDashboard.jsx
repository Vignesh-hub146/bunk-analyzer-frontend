import React from 'react';
import { ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, ReferenceLine } from 'recharts';

const STATUS_CONFIG = {
  SAFE: { color: '#22c55e', bg: '#052e16', emoji: '✅', label: 'Safe Zone' },
  WARNING: { color: '#f59e0b', bg: '#1c1400', emoji: '⚠️', label: 'Warning' },
  DANGER: { color: '#ef4444', bg: '#1c0505', emoji: '🔴', label: 'Danger' },
  CRITICAL: { color: '#dc2626', bg: '#200000', emoji: '🚨', label: 'Critical' },
};

export default function ResultsDashboard({ results, target = 75 }) {
  if (!results) return null;

  const { subjectAnalyses, overallAttendance, totalBunkableClasses, overallStatus, recommendation } = results;

  const chartData = subjectAnalyses.map(s => ({
    name: s.subjectName.length > 8 ? s.subjectName.slice(0, 8) + '..' : s.subjectName,
    fullName: s.subjectName,
    attendance: s.currentPercentage,
    canBunk: Math.max(0, s.canBunkClasses),
    needed: Math.max(0, s.classesNeededToReach75),
  }));

  const overallConfig = STATUS_CONFIG[overallStatus] || STATUS_CONFIG.WARNING;

  return (
    <div className="results-dashboard">
      <div className="results-header">
        <h2 className="results-title">📊 Bunk Analysis Report</h2>
        <p className="results-subtitle">Here's your attendance breakdown!</p>
      </div>

      {/* Overall Card */}
      <div className="overall-card" style={{ borderColor: overallConfig.color }}>
        <div className="overall-left">
          <div className="overall-pct" style={{ color: overallConfig.color }}>
            {overallAttendance}%
          </div>
          <div className="overall-label">Overall Attendance</div>
          <div className="overall-status" style={{ background: overallConfig.bg, color: overallConfig.color }}>
            {overallConfig.emoji} {overallConfig.label}
          </div>
        </div>
        <div className="overall-right">
          <div className="bunk-stat">
            <div className="bunk-number">{totalBunkableClasses}</div>
            <div className="bunk-label">Total classes you can bunk</div>
          </div>
          <div className="recommendation-box">{recommendation}</div>
        </div>
      </div>

      {/* Attendance Bar Chart */}
      <div className="chart-card">
        <h3 className="chart-title">Attendance % by Subject</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="name" tick={{ fill: '#aaa', fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#aaa', fontSize: 11 }} unit="%" />
              <Tooltip
                contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8 }}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName}
                formatter={(val) => [`${val}%`, 'Attendance']}
              />
              <ReferenceLine y={target} stroke="rgba(255,255,255,0.3)" strokeDasharray="4 4" label={{ value: `${target}%`, fill: '#888', fontSize: 11 }} />
              <Bar dataKey="attendance" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.attendance >= 85 ? '#22c55e' : entry.attendance >= 75 ? '#f59e0b' : '#ef4444'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-legend">
          <span className="legend-item"><span className="dot" style={{ background: '#22c55e' }} /> ≥85% Safe</span>
          <span className="legend-item"><span className="dot" style={{ background: '#f59e0b' }} /> 75–84% OK</span>
          <span className="legend-item"><span className="dot" style={{ background: '#ef4444' }} /> &lt;75% Danger</span>
          <span className="legend-item target-line">— {target}% target</span>
        </div>
      </div>

      {/* Subject Cards */}
      <div className="subject-results-grid">
        {subjectAnalyses.map(subject => {
          const cfg = STATUS_CONFIG[subject.status] || STATUS_CONFIG.WARNING;
          return (
            <div key={subject.subjectName} className="subject-result-card" style={{ borderTop: `3px solid ${cfg.color}` }}>
              <div className="src-header">
                <span className="src-name">{subject.subjectName}</span>
                <span className="src-badge" style={{ background: cfg.bg, color: cfg.color }}>
                  {cfg.emoji} {cfg.label}
                </span>
              </div>

              <div className="src-pct-row">
                <div className="src-pct" style={{ color: cfg.color }}>{subject.currentPercentage}%</div>
                <div className="src-pct-label">Current</div>
              </div>

              <div className="src-progress">
                <div className="src-bar-bg">
                  <div
                    className="src-bar-fill"
                    style={{ width: `${Math.min(subject.currentPercentage, 100)}%`, background: cfg.color }}
                  />
                  <div className="src-75-marker" title={`${target}% target`} />
                </div>
              </div>

              <div className="src-stats">
                <div className="src-stat">
                  <span className="ss-label">Attended</span>
                  <span className="ss-val">{subject.attendedClasses}/{subject.totalClasses}</span>
                </div>
                <div className="src-stat">
                  <span className="ss-label">Min needed (75%)</span>
                  <span className="ss-val">{subject.classesNeededFor75}</span>
                </div>
                {subject.canBunkClasses > 0 ? (
                  <div className="src-stat bunk-ok">
                    <span className="ss-label">Can bunk 🎉</span>
                    <span className="ss-val green">{subject.canBunkClasses} classes</span>
                  </div>
                ) : (
                  <div className="src-stat bunk-warn">
                    <span className="ss-label">Still need to attend</span>
                    <span className="ss-val red">{subject.classesNeededToReach75} more</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}