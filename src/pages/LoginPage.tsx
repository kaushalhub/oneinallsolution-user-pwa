import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { AppBrandMark } from '../components/AppBrandMark';
import { sendOtp } from '../lib/authApi';
import { setOtpSession } from '../lib/otpSession';

function normalizeIndianPhone(input: string) {
  const digits = input.replace(/\D/g, '');
  return digits.slice(-10);
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const from = (location.state as { from?: string } | null)?.from;
  const sessionExpired = searchParams.get('reason') === 'session';

  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const phoneDigits = normalizeIndianPhone(phone);
  const canSubmit = phoneDigits.length === 10 && !isLoading;

  const handleSendOtp = async () => {
    if (phoneDigits.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    try {
      setError('');
      setIsLoading(true);
      const fullPhoneNumber = `+91${phoneDigits}`;
      const response = await sendOtp(fullPhoneNumber);
      setOtpSession(response.requestId || response.otpSessionId, fullPhoneNumber);
      navigate('/otp', { state: { phoneNumber: fullPhoneNumber, from } });
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : 'Failed to send OTP. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page pwa-page">
      <div className="login-inner">
        <AppBrandMark variant="compact" />
        <h1 className="login-title">Login with Phone</h1>
        <p className="login-sub">Enter your mobile number to receive OTP</p>
        {sessionExpired ? (
          <p className="login-banner" role="status">
            Your session expired or was signed out elsewhere. Please log in again.
          </p>
        ) : null}
        <div className="login-input-wrap">
          <span className="login-prefix">+91</span>
          <input
            className="login-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter phone number"
            inputMode="numeric"
            autoComplete="tel"
            maxLength={14}
          />
        </div>
        {error ? <p className="login-error">{error}</p> : null}
        <button type="button" className="login-btn" disabled={!canSubmit} onClick={() => void handleSendOtp()}>
          {isLoading ? <span className="login-spinner" /> : 'Send OTP'}
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
          margin: 8px 0 28px;
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
        .login-input-wrap {
          height: 56px;
          border-radius: 16px;
          border: 1px solid #d7dfe0;
          background: #fff;
          padding: 0 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .login-prefix {
          color: #2c3435;
          font-size: 18px;
          font-weight: 700;
        }
        .login-input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          color: #2c3435;
          font-size: 18px;
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
