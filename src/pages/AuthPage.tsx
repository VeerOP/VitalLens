import React, { useState } from 'react';
import {
  HeartPulse,
  Lock,
  User,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ArrowRight,
  UserPlus,
  LogIn,
  BadgeCheck,
} from 'lucide-react';
import {
  loginUser,
  registerUser,
  DEFAULT_ADMIN_USER,
  type AuthUser,
} from '../lib/storage/authStore';
import { triggerHaptic } from '../lib/utils/haptics';

interface AuthPageProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState<'Clinician' | 'Patient'>('Clinician');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Feedback & Loading
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Handle Quick-Fill for Demo Credentials
  const handleQuickFillAdmin = () => {
    triggerHaptic('light');
    setMode('login');
    setLoginUsername(DEFAULT_ADMIN_USER.username);
    setLoginPassword(DEFAULT_ADMIN_USER.password);
    setError(null);
    setSuccessMsg('Admin credentials populated');
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  // Handle Sign In submission
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!loginUsername.trim()) {
      setError('Please enter your username or email.');
      triggerHaptic('warning');
      return;
    }
    if (!loginPassword) {
      setError('Please enter your password.');
      triggerHaptic('warning');
      return;
    }

    setIsLoading(true);
    triggerHaptic('light');

    // Simulate authentic clinical authentication handshake
    setTimeout(() => {
      const res = loginUser(loginUsername, loginPassword);
      setIsLoading(false);

      if (res.success && res.user) {
        triggerHaptic('success');
        setSuccessMsg(`Welcome, ${res.user.fullName}!`);
        setTimeout(() => {
          onLoginSuccess(res.user!);
        }, 350);
      } else {
        triggerHaptic('warning');
        setError(res.error || 'Authentication failed. Please verify credentials.');
      }
    }, 300);
  };

  // Handle Register submission
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!regFullName.trim()) {
      setError('Please enter your full name.');
      triggerHaptic('warning');
      return;
    }
    if (!regUsername.trim()) {
      setError('Please choose a username.');
      triggerHaptic('warning');
      return;
    }
    if (regUsername.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      triggerHaptic('warning');
      return;
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      triggerHaptic('warning');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      triggerHaptic('warning');
      return;
    }

    setIsLoading(true);
    triggerHaptic('light');

    setTimeout(() => {
      const res = registerUser({
        fullName: regFullName,
        username: regUsername,
        email: regEmail,
        password: regPassword,
        role: regRole,
      });
      setIsLoading(false);

      if (res.success && res.user) {
        triggerHaptic('success');
        setSuccessMsg(`Account created for ${res.user.fullName}!`);
        setTimeout(() => {
          onLoginSuccess(res.user!);
        }, 400);
      } else {
        triggerHaptic('warning');
        setError(res.error || 'Registration failed.');
      }
    }, 350);
  };

  return (
    <div className="w-full flex flex-col justify-start sm:justify-center items-center px-2 py-4 max-w-md mx-auto animate-in fade-in duration-300">
      {/* Brand Hero */}
      <div className="text-center mb-6 w-full">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--teal-subtle)] text-[var(--teal-primary)] mb-3 shadow-xs border border-[var(--teal-primary)]/20">
          <HeartPulse className="w-8 h-8 stroke-[2.2] animate-pulse" />
        </div>
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            VitalLens
          </h1>
          <span className="text-[10px] font-semibold uppercase tracking-wider bg-[var(--teal-subtle)] text-[var(--teal-primary)] px-2 py-0.5 rounded-full border border-[var(--teal-primary)]/20">
            Clinical
          </span>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Optical Photoplethysmography & Autonomic Telemetry
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="clinical-card w-full p-5 sm:p-6 shadow-md border-[var(--border-color)]">
        {/* Mode Toggle Switch (Segmented Control) */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-[var(--bg-surface-subtle)] rounded-lg border border-[var(--border-color)] mb-5">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setMode('login');
              setError(null);
            }}
            className={`min-h-[38px] flex items-center justify-center gap-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-[var(--bg-surface)] text-[var(--teal-primary)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <LogIn className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setMode('register');
              setError(null);
            }}
            className={`min-h-[38px] flex items-center justify-center gap-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-[var(--bg-surface)] text-[var(--teal-primary)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Register</span>
          </button>
        </div>

        {/* Demo Credentials Callout */}
        <div className="mb-5 p-3 rounded-xl bg-[var(--teal-subtle)]/70 border border-[var(--teal-primary)]/25 text-left">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[var(--teal-primary)] stroke-[2] shrink-0" />
              <div>
                <span className="text-[11px] font-bold text-[var(--teal-primary)] uppercase tracking-wider block">
                  Saved Credentials
                </span>
                <p className="text-xs text-[var(--text-primary)] font-medium mt-0.5">
                  <span className="font-semibold">User:</span>{' '}
                  <code className="bg-white/80 px-1 py-0.5 rounded text-[11px] font-mono text-[var(--teal-primary)] font-bold">
                    admin
                  </code>{' '}
                  <span className="text-[var(--text-muted)] mx-0.5">•</span>{' '}
                  <span className="font-semibold">Pass:</span>{' '}
                  <code className="bg-white/80 px-1 py-0.5 rounded text-[11px] font-mono text-[var(--teal-primary)] font-bold">
                    admin123
                  </code>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleQuickFillAdmin}
              className="text-[11px] font-semibold text-[var(--teal-primary)] hover:text-[var(--teal-hover)] bg-white px-2.5 py-1.5 rounded-lg border border-[var(--teal-primary)]/30 hover:border-[var(--teal-primary)] transition-colors shadow-2xs shrink-0 cursor-pointer active:scale-95"
            >
              Quick Fill
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-[var(--status-alert-bg)] border border-[var(--status-alert)]/30 text-[var(--status-alert)] flex items-start gap-2.5 text-xs animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 stroke-[2] shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* Success Notification */}
        {successMsg && (
          <div className="mb-4 p-3 rounded-lg bg-[var(--status-success-bg)] border border-[var(--status-success)]/30 text-[var(--status-success)] flex items-center gap-2.5 text-xs animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 stroke-[2] shrink-0" />
            <div className="flex-1 font-medium">{successMsg}</div>
          </div>
        )}

        {/* Sign In Form */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)]">
                  <User className="w-4 h-4 stroke-[2]" />
                </div>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  autoCapitalize="none"
                  className="w-full bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] rounded-lg pl-9.5 pr-3 py-2.5 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--teal-primary)] focus:bg-[var(--bg-surface)] transition-all min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[var(--text-primary)]">
                  Password
                </label>
                <span className="text-[11px] text-[var(--text-muted)]">Default: admin123</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)]">
                  <Lock className="w-4 h-4 stroke-[2]" />
                </div>
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] rounded-lg pl-9.5 pr-10 py-2.5 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--teal-primary)] focus:bg-[var(--bg-surface)] transition-all min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                >
                  {showLoginPassword ? (
                    <EyeOff className="w-4 h-4 stroke-[2]" />
                  ) : (
                    <Eye className="w-4 h-4 stroke-[2]" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="clinical-btn-primary w-full min-h-[46px] text-sm mt-2 font-semibold shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.2]" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Register Form */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)]">
                  <User className="w-4 h-4 stroke-[2]" />
                </div>
                <input
                  type="text"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="Dr. Veer Nagda"
                  className="w-full bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] rounded-lg pl-9.5 pr-3 py-2 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--teal-primary)] focus:bg-[var(--bg-surface)] transition-all min-h-[42px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="veernagda"
                  autoCapitalize="none"
                  className="w-full bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--teal-primary)] focus:bg-[var(--bg-surface)] transition-all min-h-[42px]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Role
                </label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as 'Clinician' | 'Patient')}
                  className="w-full bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--teal-primary)] focus:bg-[var(--bg-surface)] transition-all min-h-[42px] cursor-pointer"
                >
                  <option value="Clinician">Clinician</option>
                  <option value="Patient">Patient / User</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                Email Address <span className="text-[var(--text-muted)] font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)]">
                  <Mail className="w-4 h-4 stroke-[2]" />
                </div>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="clinician@example.com"
                  autoCapitalize="none"
                  className="w-full bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] rounded-lg pl-9.5 pr-3 py-2 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--teal-primary)] focus:bg-[var(--bg-surface)] transition-all min-h-[42px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min. 6 chars"
                    className="w-full bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--teal-primary)] focus:bg-[var(--bg-surface)] transition-all min-h-[42px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[var(--text-muted)]"
                  >
                    {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Confirm Password
                </label>
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Re-enter"
                  className="w-full bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--teal-primary)] focus:bg-[var(--bg-surface)] transition-all min-h-[42px]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="clinical-btn-primary w-full min-h-[46px] text-sm mt-3 font-semibold shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Registering Account...</span>
                </>
              ) : (
                <>
                  <BadgeCheck className="w-4 h-4 stroke-[2]" />
                  <span>Create Account & Sign In</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Security and Privacy Assurance */}
      <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-[var(--text-secondary)]">
        <ShieldCheck className="w-4 h-4 text-[var(--teal-primary)] stroke-[2]" />
        <span>Clinical Offline Mode • Secure On-Device Storage</span>
      </div>
    </div>
  );
};
