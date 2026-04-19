import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { AppBrandMark } from '../components/AppBrandMark';
import { loginPassword, signupPassword } from '../lib/authApi';
import { saveSession } from '../lib/session';

type Busy = 'off' | 'submit';

function isValidEmail(s: string) {
  const t = s.trim();
  if (!t) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

function normalizeIndianPhoneDigits(input: string) {
  return input.replace(/\D/g, '').slice(-10);
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const from = (location.state as { from?: string } | null)?.from;
  const sessionExpired = searchParams.get('reason') === 'session';

  /** Sign-in: single field (email or mobile). */
  const [loginIdentifier, setLoginIdentifier] = useState('');
  /** Sign-up: split fields — at least one of email or mobile required. */
  const [signupEmail, setSignupEmail] = useState('');
  const [signupMobile, setSignupMobile] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [registerMode, setRegisterMode] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<Busy>('off');

  const phoneDigits = normalizeIndianPhoneDigits(signupMobile);
  const hasSignupEmail = isValidEmail(signupEmail);
  const hasSignupMobile = phoneDigits.length === 10;

  const canSubmitLogin =
    loginIdentifier.trim().length > 0 && password.length >= 8 && busy === 'off';

  const canSubmitSignup =
    password.length >= 8 &&
    (hasSignupEmail || hasSignupMobile) &&
    busy === 'off';

  const canSubmit = registerMode ? canSubmitSignup : canSubmitLogin;

  const goHomeAfterAuth = () => {
    const target = from && from.startsWith('/') ? from : '/tabs/home';
    navigate(target, { replace: true });
  };

  const completeAuth = (loginResponse: Awaited<ReturnType<typeof loginPassword>>) => {
    if (!loginResponse.sessionToken) {
      throw new Error('Server did not return a session token.');
    }
    saveSession({
      token: loginResponse.sessionToken,
      userId: loginResponse.user?._id != null ? String(loginResponse.user._id) : undefined,
      phone: loginResponse.user?.phone,
    });
    goHomeAfterAuth();
  };

  const handleSubmit = async () => {
    if (registerMode) {
      if (!canSubmitSignup) {
        setError('Enter a valid email and/or 10-digit mobile, and password (min 8 characters).');
        return;
      }
    } else if (!canSubmitLogin) {
      setError('Enter email or mobile and a password (min 8 characters).');
      return;
    }
    try {
      setError('');
      setBusy('submit');
      const response = registerMode
        ? await signupPassword({
            password,
            ...(name.trim() ? { name: name.trim() } : {}),
            ...(hasSignupEmail ? { email: signupEmail.trim() } : {}),
            ...(hasSignupMobile ? { mobile: signupMobile } : {}),
          })
        : await loginPassword(loginIdentifier, password);
      await completeAuth(response);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setBusy('off');
    }
  };

  return (
    <div className="login-page pwa-page">
      <div className="login-inner">
        <AppBrandMark variant="compact" />
        <h1 className="login-title">{registerMode ? 'Create account' : 'Sign in'}</h1>
        <p className="login-sub">
          {registerMode
            ? 'Name is optional. Enter at least email or mobile, plus password.'
            : 'Use your email or Indian mobile number and password'}
        </p>
        {sessionExpired ? (
          <p className="login-banner" role="status">
            Your session expired or was signed out elsewhere. Please log in again.
          </p>
        ) : null}

        {registerMode ? (
          <>
            <div className="login-field">
              <label className="login-label" htmlFor="login-name">
                Name <span className="login-optional">(optional)</span>
              </label>
              <input
                id="login-name"
                className="login-field-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                type="text"
                autoComplete="name"
              />
            </div>
            <div className="login-field">
              <label className="login-label" htmlFor="signup-email">
                Email <span className="login-optional">(if no mobile)</span>
              </label>
              <input
                id="signup-email"
                className="login-field-input"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
              />
            </div>
            <p className="login-hint">At least one of email or mobile is required.</p>
            <div className="login-field">
              <label className="login-label" htmlFor="signup-mobile">
                Mobile <span className="login-optional">(if no email)</span>
              </label>
              <div className="login-input-wrap">
                <span className="login-prefix">+91</span>
                <input
                  id="signup-mobile"
                  className="login-input"
                  value={signupMobile}
                  onChange={(e) => setSignupMobile(e.target.value)}
                  placeholder="10-digit number"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={14}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="login-field">
            <label className="login-label" htmlFor="login-identifier">
              Email or mobile
            </label>
            <input
              id="login-identifier"
              className="login-field-input"
              value={loginIdentifier}
              onChange={(e) => setLoginIdentifier(e.target.value)}
              placeholder="you@example.com or 10-digit mobile"
              type="text"
              autoComplete="username"
            />
          </div>
        )}
        <div className="login-field">
          <label className="login-label" htmlFor="login-password">
            Password
          </label>
          <input
            id="login-password"
            className="login-field-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 8 characters"
            type="password"
            autoComplete={registerMode ? 'new-password' : 'current-password'}
          />
        </div>
        {error ? <p className="login-error">{error}</p> : null}
        <button
          type="button"
          className="login-btn"
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
        >
          {busy === 'submit' ? <span className="login-spinner" /> : registerMode ? 'Create account' : 'Sign in'}
        </button>
        <button type="button" className="login-toggle" onClick={() => setRegisterMode((v) => !v)}>
          {registerMode ? 'Already have an account? Sign in' : 'New here? Create account'}
        </button>
      </div>
      <style>{`
        .login-page {
          background: #f7fafa;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .login-inner {
          width: 100%;
          max-width: 400px;
        }
        .login-title {
          margin: 16px 0 0;
          text-align: center;
          color: #2c3435;
          font-size: 26px;
          font-weight: 800;
        }
        .login-sub {
          color: #586161;
          font-size: 14px;
          line-height: 22px;
          text-align: center;
          margin: 8px 0 20px;
        }
        .login-banner {
          margin: -12px 0 20px;
          padding: 12px 14px;
          border-radius: 12px;
          background: #fef3c7;
          border: 1px solid #fcd34d;
          color: #92400e;
          font-size: 14px;
          line-height: 20px;
          text-align: center;
        }
        .login-field {
          margin-bottom: 14px;
        }
        .login-label {
          display: block;
          font-size: 12px;
          font-weight: 700;
          color: #64748b;
          margin-bottom: 6px;
        }
        .login-optional {
          font-weight: 600;
          color: #94a3b8;
        }
        .login-hint {
          margin: -6px 0 14px;
          font-size: 12px;
          color: #64748b;
          line-height: 18px;
        }
        .login-field-input {
          width: 100%;
          height: 48px;
          border-radius: 14px;
          border: 1px solid #d7dfe0;
          padding: 0 14px;
          font-size: 16px;
          font-weight: 600;
          color: #2c3435;
          background: #fff;
        }
        .login-field-input::placeholder {
          color: #9aa5a6;
        }
        .login-input-wrap {
          height: 48px;
          border-radius: 14px;
          border: 1px solid #d7dfe0;
          background: #fff;
          padding: 0 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .login-prefix {
          color: #2c3435;
          font-size: 16px;
          font-weight: 700;
        }
        .login-input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          color: #2c3435;
          font-size: 16px;
          font-weight: 600;
        }
        .login-input::placeholder {
          color: #9aa5a6;
        }
        .login-error {
          margin: 10px 0 0;
          color: #cc2a2a;
          font-size: 13px;
          line-height: 18px;
        }
        .login-btn {
          margin-top: 24px;
          width: 100%;
          height: 52px;
          border-radius: 16px;
          border: none;
          background: #7c77b9;
          color: #fff;
          font-size: 16px;
          font-weight: 800;
        }
        .login-btn:disabled {
          opacity: 0.45;
        }
        .login-toggle {
          width: 100%;
          margin-top: 10px;
          border: none;
          background: none;
          color: #7c77b9;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          text-decoration: underline;
        }
        .login-spinner {
          display: inline-block;
          width: 22px;
          height: 22px;
          border: 2px solid rgba(255, 255, 255, 0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: login-spin 0.7s linear infinite;
        }
        @keyframes login-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
