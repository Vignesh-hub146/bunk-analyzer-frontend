import { useState, useEffect, useRef } from "react";

const css = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:       #0b0b0f;
  --bg2:      #111118;
  --bg3:      #1a1a24;
  --bg4:      #22222e;
  --border:   #2a2a3a;
  --border2:  #3a3a4a;
  --text:     #e8e8f0;
  --muted:    #8888a8;
  --soft:     #b0b3cc;
  --accent:   #6c63ff;
  --accent2:  #a78bfa;
  --green:    #22c55e;
  --yellow:   #f59e0b;
  --red:      #ef4444;
  --cyan:     #22d3ee;
  --radius:   14px;
  --rsm:      8px;
  --font:     'Space Grotesk', sans-serif;
  --mono:     'JetBrains Mono', monospace;
}

body {
  font-family: var(--font);
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

/* ── Grid background ── */
.auth-bg {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(rgba(108,99,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(108,99,255,0.03) 1px, transparent 1px),
    var(--bg);
  background-size: 48px 48px;
}

/* Glowing orbs */
.auth-bg::before {
  content: '';
  position: fixed;
  top: -200px; left: -200px;
  width: 600px; height: 600px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(108,99,255,0.12) 0%, transparent 70%);
  pointer-events: none;
  animation: driftA 12s ease-in-out infinite alternate;
}
.auth-bg::after {
  content: '';
  position: fixed;
  bottom: -200px; right: -100px;
  width: 500px; height: 500px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(34,211,238,0.07) 0%, transparent 70%);
  pointer-events: none;
  animation: driftB 15s ease-in-out infinite alternate;
}

@keyframes driftA {
  from { transform: translate(0, 0) scale(1); }
  to   { transform: translate(80px, 60px) scale(1.15); }
}
@keyframes driftB {
  from { transform: translate(0, 0) scale(1); }
  to   { transform: translate(-60px, -40px) scale(1.1); }
}

/* ── Card ── */
.auth-card {
  width: 100%;
  max-width: 440px;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 36px 32px;
  box-shadow:
    0 0 0 1px rgba(108,99,255,0.06),
    0 24px 80px rgba(0,0,0,0.6),
    0 4px 24px rgba(0,0,0,0.4);
  position: relative;
  z-index: 1;
  animation: cardIn 0.4s cubic-bezier(0.16,1,0.3,1) both;
}

@keyframes cardIn {
  from { opacity: 0; transform: translateY(24px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)   scale(1); }
}

/* Shine strip on top */
.auth-card::before {
  content: '';
  position: absolute;
  top: 0; left: 50%; transform: translateX(-50%);
  width: 60%; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(108,99,255,0.6), rgba(167,139,250,0.6), transparent);
  border-radius: 1px;
}

/* ── Logo ── */
.auth-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 28px;
}
.auth-logo-icon { font-size: 28px; }
.auth-logo-text {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.5px;
  background: linear-gradient(90deg, #fff 0%, var(--accent2) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.auth-logo-tag {
  font-size: 11px;
  color: var(--muted);
  margin-left: auto;
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 3px 10px;
  font-weight: 600;
  white-space: nowrap;
}

/* ── Tab switcher ── */
.auth-tabs {
  display: flex;
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 4px;
  margin-bottom: 28px;
}
.auth-tab {
  flex: 1;
  padding: 9px;
  border-radius: 7px;
  font-family: var(--font);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  border: none;
  background: transparent;
  color: var(--muted);
  transition: all 0.22s;
}
.auth-tab.active {
  background: var(--accent);
  color: #fff;
  box-shadow: 0 2px 12px rgba(108,99,255,0.45);
}
.auth-tab:not(.active):hover { color: var(--soft); }

/* ── Heading ── */
.auth-heading { font-size: 22px; font-weight: 700; color: var(--text); margin-bottom: 4px; letter-spacing: -0.4px; }
.auth-subheading { font-size: 13px; color: var(--muted); margin-bottom: 24px; line-height: 1.5; }

/* ── Form ── */
.auth-form { display: flex; flex-direction: column; gap: 14px; }

.field-group { display: flex; flex-direction: column; gap: 6px; }
.field-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.field-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.field-icon {
  position: absolute;
  left: 14px;
  font-size: 15px;
  pointer-events: none;
  opacity: 0.5;
  transition: opacity 0.2s;
}
.field-input {
  width: 100%;
  background: var(--bg3);
  border: 1.5px solid var(--border);
  border-radius: var(--rsm);
  padding: 12px 14px 12px 42px;
  color: var(--text);
  font-family: var(--font);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}
.field-input::placeholder { color: var(--muted); opacity: 0.6; }
.field-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(108,99,255,0.14);
  background: var(--bg4);
}
.field-input:focus + .field-icon,
.field-wrap:focus-within .field-icon { opacity: 0.9; }

.field-input.has-toggle { padding-right: 44px; }

.field-toggle {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 14px;
  padding: 4px;
  border-radius: 4px;
  transition: color 0.2s;
  display: flex;
  align-items: center;
}
.field-toggle:hover { color: var(--soft); }

.field-error {
  font-size: 11px;
  color: var(--red);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* ── Password strength ── */
.pw-strength-wrap { margin-top: 2px; }
.pw-bars { display: flex; gap: 4px; margin-bottom: 4px; }
.pw-bar {
  flex: 1; height: 3px; border-radius: 2px;
  background: var(--border);
  transition: background 0.3s;
}
.pw-bar.filled-weak   { background: var(--red); }
.pw-bar.filled-medium { background: var(--yellow); }
.pw-bar.filled-strong { background: var(--green); }
.pw-label { font-size: 11px; font-weight: 600; }
.pw-label.weak   { color: var(--red); }
.pw-label.medium { color: var(--yellow); }
.pw-label.strong { color: var(--green); }

/* ── Row split ── */
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

/* ── Options row ── */
.auth-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  margin-top: 2px;
}
.remember-wrap { display: flex; align-items: center; gap: 7px; cursor: pointer; color: var(--muted); font-weight: 500; }
.remember-box {
  width: 16px; height: 16px;
  border-radius: 4px;
  border: 1.5px solid var(--border2);
  background: var(--bg3);
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
}
.remember-box.checked { background: var(--accent); border-color: var(--accent); }
.forgot-link { color: var(--accent2); font-weight: 600; background: none; border: none; cursor: pointer; font-family: var(--font); font-size: 12px; transition: color 0.2s; }
.forgot-link:hover { color: var(--accent); }

/* ── Submit button ── */
.btn-auth {
  width: 100%;
  padding: 13px;
  border-radius: var(--rsm);
  font-family: var(--font);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  border: none;
  background: linear-gradient(135deg, var(--accent) 0%, #5b4fcf 100%);
  color: #fff;
  box-shadow: 0 4px 18px rgba(108,99,255,0.35);
  transition: all 0.22s;
  margin-top: 4px;
  position: relative;
  overflow: hidden;
  letter-spacing: 0.2px;
}
.btn-auth::before {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 100%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
  transition: left 0.5s;
}
.btn-auth:hover:not(:disabled)::before { left: 100%; }
.btn-auth:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 28px rgba(108,99,255,0.5);
}
.btn-auth:active:not(:disabled) { transform: translateY(0); }
.btn-auth:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
}

/* ── Spinner inside button ── */
.btn-spinner {
  display: inline-block;
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  vertical-align: middle;
  margin-right: 8px;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Divider ── */
.auth-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 18px 0 14px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}
.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}

/* ── Social buttons ── */
.social-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.btn-social {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: var(--rsm);
  font-family: var(--font);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  border: 1.5px solid var(--border);
  background: var(--bg3);
  color: var(--soft);
  transition: all 0.18s;
}
.btn-social:hover {
  border-color: var(--border2);
  background: var(--bg4);
  color: var(--text);
  transform: translateY(-1px);
}
.social-icon { font-size: 16px; }

/* ── Footer note ── */
.auth-footer {
  text-align: center;
  margin-top: 20px;
  font-size: 12px;
  color: var(--muted);
}
.auth-footer button {
  background: none;
  border: none;
  color: var(--accent2);
  font-family: var(--font);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  margin-left: 4px;
  transition: color 0.2s;
}
.auth-footer button:hover { color: var(--accent); text-decoration: underline; }

/* ── Success state ── */
.auth-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 0 8px;
  animation: cardIn 0.35s ease both;
}
.success-ring {
  width: 64px; height: 64px;
  border-radius: 50%;
  background: rgba(34,197,94,0.1);
  border: 2px solid rgba(34,197,94,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  animation: popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both;
}
@keyframes popIn {
  from { transform: scale(0); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}
.success-title { font-size: 18px; font-weight: 700; color: var(--green); }
.success-sub { font-size: 13px; color: var(--muted); text-align: center; line-height: 1.6; }

/* ── Terms text ── */
.terms-text {
  font-size: 11px;
  color: var(--muted);
  text-align: center;
  line-height: 1.6;
  margin-top: 6px;
}
.terms-text a { color: var(--accent2); text-decoration: none; font-weight: 600; cursor: pointer; }
.terms-text a:hover { text-decoration: underline; }

/* ── Alert banner ── */
.auth-alert {
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.25);
  border-radius: var(--rsm);
  padding: 10px 14px;
  font-size: 12px;
  color: var(--red);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  animation: cardIn 0.2s ease both;
}

/* ── Responsive ── */
@media (max-width: 480px) {
  .auth-card { padding: 28px 20px; border-radius: 16px; }
  .field-row { grid-template-columns: 1fr; }
  .social-btns { grid-template-columns: 1fr; }
  .auth-heading { font-size: 19px; }
}
`;

// ── Password strength helper ──
function getStrength(pw) {
  if (!pw) return { level: 0, label: '', cls: '' };
  let score = 0;
  if (pw.length >= 8)  score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: 'Weak', cls: 'weak' };
  if (score <= 2) return { level: 2, label: 'Medium', cls: 'medium' };
  return { level: 3, label: 'Strong', cls: 'strong' };
}

// ── EyeIcon ──
const EyeIcon = ({ open }) => open
  ? <span>👁</span>
  : <span style={{ opacity: 0.6 }}>🙈</span>;

export default function AuthPage() {
  const [tab,        setTab]        = useState('login');   // 'login' | 'register'
  const [showPw,     setShowPw]     = useState(false);
  const [showCfm,    setShowCfm]    = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [remember,   setRemember]   = useState(false);
  const [alert,      setAlert]      = useState('');

  const [form, setForm] = useState({
    firstName: '', lastName: '',
    email: '', password: '', confirm: '',
    rollNo: '',
  });
  const [errors, setErrors] = useState({});

  const pw = form.password;
  const strength = getStrength(pw);

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: '' }));
    setAlert('');
  };

  const switchTab = (t) => {
    setTab(t);
    setErrors({});
    setAlert('');
    setSuccess(false);
    setShowPw(false);
    setShowCfm(false);
  };

  const validate = () => {
    const e = {};
    if (tab === 'register') {
      if (!form.firstName.trim()) e.firstName = 'Required';
      if (!form.lastName.trim())  e.lastName  = 'Required';
      if (!form.rollNo.trim())    e.rollNo    = 'Required';
      if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
      if (pw.length < 8) e.password = 'Min 8 characters';
    }
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Invalid email';
    if (!form.password) e.password = 'Required';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    setAlert('');
    // Simulate API call
    await new Promise(r => setTimeout(r, 1600));
    setLoading(false);

    // Simulate login failure demo (wrong password)
    if (tab === 'login' && form.password === 'wrong') {
      setAlert('Incorrect email or password. Please try again.');
      return;
    }

    setSuccess(true);
  };

  return (
    <>
      <style>{css}</style>
      <div className="auth-bg">
        <div className="auth-card">

          {/* Logo */}
          <div className="auth-logo">
            <span className="auth-logo-icon">🎓</span>
            <span className="auth-logo-text">BunkMeter</span>
            <span className="auth-logo-tag">v2.0</span>
          </div>

          {/* Tabs */}
          <div className="auth-tabs">
            <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => switchTab('login')}>
              Sign In
            </button>
            <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => switchTab('register')}>
              Create Account
            </button>
          </div>

          {success ? (
            <div className="auth-success">
              <div className="success-ring">✓</div>
              <div className="success-title">
                {tab === 'login' ? 'Welcome back!' : 'Account created!'}
              </div>
              <div className="success-sub">
                {tab === 'login'
                  ? 'Redirecting you to your dashboard…'
                  : 'Your BunkMeter account is ready.\nRedirecting to dashboard…'}
              </div>
            </div>
          ) : (
            <>
              <div className="auth-heading">
                {tab === 'login' ? 'Welcome back 👋' : 'Join BunkMeter'}
              </div>
              <div className="auth-subheading">
                {tab === 'login'
                  ? 'Sign in to track your attendance and know exactly how many classes you can skip.'
                  : 'Create your account to start tracking attendance smartly.'}
              </div>

              {alert && (
                <div className="auth-alert" style={{ marginBottom: 14 }}>
                  ⚠️ {alert}
                </div>
              )}

              <div className="auth-form">

                {/* Register-only: name row */}
                {tab === 'register' && (
                  <>
                    <div className="field-row">
                      <div className="field-group">
                        <label className="field-label">First Name</label>
                        <div className="field-wrap">
                          <span className="field-icon">👤</span>
                          <input
                            className="field-input"
                            placeholder="Ravi"
                            value={form.firstName}
                            onChange={e => set('firstName', e.target.value)}
                          />
                        </div>
                        {errors.firstName && <span className="field-error">⚠ {errors.firstName}</span>}
                      </div>
                      <div className="field-group">
                        <label className="field-label">Last Name</label>
                        <div className="field-wrap">
                          <span className="field-icon">👤</span>
                          <input
                            className="field-input"
                            placeholder="Kumar"
                            value={form.lastName}
                            onChange={e => set('lastName', e.target.value)}
                          />
                        </div>
                        {errors.lastName && <span className="field-error">⚠ {errors.lastName}</span>}
                      </div>
                    </div>

                    <div className="field-group">
                      <label className="field-label">Roll Number</label>
                      <div className="field-wrap">
                        <span className="field-icon">🎫</span>
                        <input
                          className="field-input"
                          placeholder="22B91A0501"
                          value={form.rollNo}
                          onChange={e => set('rollNo', e.target.value)}
                          style={{ fontFamily: 'var(--mono)', letterSpacing: '0.5px' }}
                        />
                      </div>
                      {errors.rollNo && <span className="field-error">⚠ {errors.rollNo}</span>}
                    </div>
                  </>
                )}

                {/* Email */}
                <div className="field-group">
                  <label className="field-label">Email Address</label>
                  <div className="field-wrap">
                    <span className="field-icon">✉️</span>
                    <input
                      className="field-input"
                      type="email"
                      placeholder="you@college.edu.in"
                      value={form.email}
                      onChange={e => set('email', e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    />
                  </div>
                  {errors.email && <span className="field-error">⚠ {errors.email}</span>}
                </div>

                {/* Password */}
                <div className="field-group">
                  <label className="field-label">Password</label>
                  <div className="field-wrap">
                    <span className="field-icon">🔒</span>
                    <input
                      className="field-input has-toggle"
                      type={showPw ? 'text' : 'password'}
                      placeholder={tab === 'register' ? 'Min 8 characters' : 'Your password'}
                      value={form.password}
                      onChange={e => set('password', e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    />
                    <button className="field-toggle" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                      <EyeIcon open={showPw} />
                    </button>
                  </div>
                  {errors.password && <span className="field-error">⚠ {errors.password}</span>}

                  {/* Strength meter — register only */}
                  {tab === 'register' && pw && (
                    <div className="pw-strength-wrap">
                      <div className="pw-bars">
                        {[1,2,3].map(i => {
                          let cls = '';
                          if (i <= strength.level) {
                            cls = strength.level === 1 ? 'filled-weak' : strength.level === 2 ? 'filled-medium' : 'filled-strong';
                          }
                          return <div key={i} className={`pw-bar ${cls}`} />;
                        })}
                      </div>
                      <span className={`pw-label ${strength.cls}`}>{strength.label} password</span>
                    </div>
                  )}
                </div>

                {/* Confirm password — register only */}
                {tab === 'register' && (
                  <div className="field-group">
                    <label className="field-label">Confirm Password</label>
                    <div className="field-wrap">
                      <span className="field-icon">🔑</span>
                      <input
                        className="field-input has-toggle"
                        type={showCfm ? 'text' : 'password'}
                        placeholder="Repeat password"
                        value={form.confirm}
                        onChange={e => set('confirm', e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                      />
                      <button className="field-toggle" onClick={() => setShowCfm(v => !v)} tabIndex={-1}>
                        <EyeIcon open={showCfm} />
                      </button>
                    </div>
                    {errors.confirm && <span className="field-error">⚠ {errors.confirm}</span>}
                  </div>
                )}

                {/* Remember / Forgot — login only */}
                {tab === 'login' && (
                  <div className="auth-options">
                    <label className="remember-wrap" onClick={() => setRemember(v => !v)}>
                      <div className={`remember-box ${remember ? 'checked' : ''}`}>
                        {remember && <span style={{ color: '#fff', fontSize: 10, fontWeight: 800 }}>✓</span>}
                      </div>
                      Remember me
                    </label>
                    <button className="forgot-link">Forgot password?</button>
                  </div>
                )}

                {/* Submit */}
                <button className="btn-auth" onClick={handleSubmit} disabled={loading}>
                  {loading && <span className="btn-spinner" />}
                  {loading
                    ? (tab === 'login' ? 'Signing in…' : 'Creating account…')
                    : (tab === 'login' ? '→ Sign In' : '→ Create Account')}
                </button>

                {/* Terms — register only */}
                {tab === 'register' && (
                  <p className="terms-text">
                    By creating an account, you agree to our{' '}
                    <a>Terms of Service</a> and <a>Privacy Policy</a>.
                  </p>
                )}
              </div>

              {/* Divider + Social */}
              <div className="auth-divider">or continue with</div>
              <div className="social-btns">
                <button className="btn-social">
                  <span className="social-icon">🔵</span> Google
                </button>
                <button className="btn-social">
                  <span className="social-icon">🎓</span> College SSO
                </button>
              </div>

              {/* Footer switch */}
              <div className="auth-footer">
                {tab === 'login'
                  ? <>Don't have an account?<button onClick={() => switchTab('register')}>Sign up free</button></>
                  : <>Already have an account?<button onClick={() => switchTab('login')}>Sign in</button></>
                }
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}
