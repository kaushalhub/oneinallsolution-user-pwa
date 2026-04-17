import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { resendOtp, verifyOtp } from '../lib/authApi';
import { clearOtpSession, getOtpSession, setOtpSession } from '../lib/otpSession';
import { saveSession } from '../lib/session';

const RESEND_SECONDS = 30;

function onlyDigits(value: string) {
  return value.replace(/\D/g, '').slice(0, 6);
}

export function OTPPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const phoneNumber = (location.state as { phoneNumber?: string } | null)?.phoneNumber;
  const from = (location.state as { from?: string } | null)?.from;

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (!phoneNumber) {
      navigate('/login', { replace: true });
    }
  }, [navigate, phoneNumber]);

  useEffect(() => {
    if (secondsLeft === 0) return;
    const timerId = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timerId);
  }, [secondsLeft]);

  const canVerify = code.length === 6 && !isVerifying;
  const canResend = secondsLeft === 0 && !isResending;

  const handleVerify = async () => {
    const { requestId } = getOtpSession();
    if (!requestId) {
      setError('Session expired. Please request OTP again.');
      return;
    }
    if (code.length !== 6) {
      setError('Please enter valid 6-digit OTP.');
      return;
    }
    if (!phoneNumber) return;

    try {
      setError('');
      setIsVerifying(true);
      const loginResponse = await verifyOtp(phoneNumber, code, requestId);
      if (!loginResponse.sessionToken) {
        throw new Error('Server did not return a session token.');
      }
      saveSession({
        token: loginResponse.sessionToken,
        userId: loginResponse.user?._id != null ? String(loginResponse.user._id) : undefined,
        phone: loginResponse.user?.phone,
      });
      clearOtpSession();
      const target = from && from.startsWith('/') ? from : '/tabs/home';
      navigate(target, { replace: true });
    } catch (verifyError) {
      const message = verifyError instanceof Error ? verifyError.message : 'Invalid OTP. Please try again.';
      setError(message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!phoneNumber) return;
    try {
      setError('');
      setIsResending(true);
      const { requestId } = getOtpSession();
      const response = await resendOtp(phoneNumber, requestId);
      setOtpSession(response.requestId || response.otpSessionId, phoneNumber);
      setSecondsLeft(RESEND_SECONDS);
      setCode('');
    } catch (resendError) {
      const message = resendError instanceof Error ? resendError.message : 'Unable to resend OTP right now.';
      setError(message);
    } finally {
      setIsResending(false);
    }
  };

  if (!phoneNumber) return null;

  return (
    <div className="otp-page pwa-page">
      <div className="otp-inner">
        <h1 className="otp-title">Enter OTP</h1>
        <p className="otp-sub">We sent a 6-digit code to {phoneNumber}</p>
        <input
          className="otp-input"
          value={code}
          onChange={(e) => setCode(onlyDigits(e.target.value))}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="••••••"
        />
        {error ? <p className="otp-error">{error}</p> : null}
        <button type="button" className="otp-btn" disabled={!canVerify} onClick={() => void handleVerify()}>
          {isVerifying ? <span className="otp-spinner" /> : 'Verify & continue'}
        </button>
        <button type="button" className="otp-resend" disabled={!canResend} onClick={() => void handleResend()}>
          {isResending ? 'Sending…' : secondsLeft > 0 ? `Resend OTP in ${secondsLeft}s` : 'Resend OTP'}
        </button>
      </div>
      <style>{`
        .otp-page {
          background: #f7fafa;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .otp-inner {
          width: 100%;
          max-width: 400px;
        }
        .otp-title {
          margin: 0;
          text-align: center;
          color: #2c3435;
          font-size: 26px;
          font-weight: 800;
        }
        .otp-sub {
          color: #586161;
          font-size: 14px;
          line-height: 22px;
          text-align: center;
          margin: 8px 0 24px;
        }
        .otp-input {
          width: 100%;
          height: 56px;
          border-radius: 16px;
          border: 1px solid #d7dfe0;
          text-align: center;
          font-size: 22px;
          font-weight: 800;
          letter-spacing: 0.35em;
          outline: none;
        }
        .otp-error {
          margin: 10px 0 0;
          color: #cc2a2a;
          font-size: 13px;
        }
        .otp-btn {
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
        .otp-btn:disabled {
          opacity: 0.45;
        }
        .otp-resend {
          margin-top: 16px;
          width: 100%;
          border: none;
          background: none;
          color: #5f5a92;
          font-weight: 700;
          font-size: 15px;
        }
        .otp-resend:disabled {
          color: #94a3b8;
        }
        .otp-spinner {
          display: inline-block;
          width: 22px;
          height: 22px;
          border: 2px solid rgba(255, 255, 255, 0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: otp-spin 0.7s linear infinite;
        }
        @keyframes otp-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
