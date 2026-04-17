import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { APP_PRODUCT_NAME } from '../constants/branding';
import { getProfileWithSessionToken } from '../lib/authApi';
import { fetchWalletTransactions, type WalletTransactionRecord } from '../lib/wallet';
import { getSession } from '../lib/session';
import { formatRupeeInr } from '../utils/price';
import { IonIcon } from '../utils/ionIcon';

const REFERRAL_REWARD_INR = 50;

function startOfThisMonth(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

function isReferralCredit(tx: WalletTransactionRecord): boolean {
  return tx.type === 'credit' && String(tx.reason || '').toLowerCase() === 'referral';
}

export function ReferralPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<WalletTransactionRecord[]>([]);

  const load = useCallback(async (silent: boolean) => {
    setErr(null);
    if (!silent) setLoading(true);
    try {
      const session = getSession();
      if (!session?.token) {
        setReferralCode(null);
        setTransactions([]);
        if (!silent) setLoading(false);
        setRefreshing(false);
        return;
      }
      const [{ user }, { transactions: txs }] = await Promise.all([
        getProfileWithSessionToken(session.token),
        fetchWalletTransactions(session.token),
      ]);
      setReferralCode(user.referralCode?.trim() ? String(user.referralCode).toUpperCase() : null);
      setTransactions(txs);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load referral data');
      setReferralCode(null);
      setTransactions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const referralCredits = useMemo(() => transactions.filter(isReferralCredit), [transactions]);
  const totalEarned = useMemo(
    () => referralCredits.reduce((s, t) => s + (typeof t.amount === 'number' ? t.amount : 0), 0),
    [referralCredits]
  );
  const monthStart = startOfThisMonth();
  const referralsThisMonth = useMemo(
    () =>
      referralCredits.filter((t) => {
        if (!t.createdAt) return false;
        const ts = new Date(t.createdAt).getTime();
        return !Number.isNaN(ts) && ts >= monthStart;
      }).length,
    [referralCredits, monthStart]
  );

  const inviteBody = useMemo(() => {
    const code = referralCode || 'YOURCODE';
    return [
      `I'm inviting you to ${APP_PRODUCT_NAME} — professional home cleaning.`,
      '',
      `Use my referral code: ${code}`,
      `You get ₹${REFERRAL_REWARD_INR} wallet credit after your first completed booking.`,
      `I also get ₹${REFERRAL_REWARD_INR} once your first booking is completed.`,
      '',
      `Open ${APP_PRODUCT_NAME} in your browser or app and enter the code when you sign up.`,
    ].join('\n');
  }, [referralCode]);

  const copyCode = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
      window.alert('Referral code copied to clipboard.');
    } catch {
      window.alert('Copy failed — please copy the code manually.');
    }
  };

  const shareWhatsApp = () => {
    if (!referralCode) {
      window.alert('Log in again to load your referral code.');
      return;
    }
    const url = `https://wa.me/?text=${encodeURIComponent(inviteBody)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const steps = useMemo(
    () => [
      {
        tag: 'Step 01',
        title: 'Send Invite',
        desc: 'Share your referral code with friends via WhatsApp or social platforms.',
        icon: 'paper-plane-outline',
        iconColor: '#006D47',
        iconBg: 'rgba(126,253,190,0.3)',
        chipBg: '#7EFDBE',
        chipColor: '#006D47',
      },
      {
        tag: 'Step 02',
        title: 'Friend Books',
        desc: 'Your friend signs up with your code and completes their first booking.',
        icon: 'clipboard-outline',
        iconColor: '#7c77b9',
        iconBg: 'rgba(169,192,255,0.3)',
        chipBg: '#A9C0FF',
        chipColor: '#7c77b9',
      },
      {
        tag: 'Step 03',
        title: 'Both Earn',
        desc: `After first booking completion, both of you get ₹${REFERRAL_REWARD_INR} each in wallet.`,
        icon: 'cash-outline',
        iconColor: '#006499',
        iconBg: 'rgba(115,191,255,0.3)',
        chipBg: '#73BFFF',
        chipColor: '#006499',
      },
    ],
    []
  );

  const statsSub =
    referralsThisMonth === 0
      ? 'No successful referrals this month yet'
      : `${referralsThisMonth} successful referral${referralsThisMonth === 1 ? '' : 's'} this month`;

  const session = getSession();
  if (!loading && !session?.token) {
    return (
      <div className="ref-page">
        <header className="ref-head">
          <button type="button" className="ref-back" onClick={() => navigate(-1)}>
            <IonIcon ionName="chevron-back" size={16} color="#5f5a92" />
          </button>
          <h1 className="ref-headT">Refer &amp; Earn</h1>
        </header>
        <div className="ref-guest">
          <p className="ref-guestT">Log in to refer friends</p>
          <p className="ref-guestS">Your personal code and rewards show up after you sign in.</p>
          <button type="button" className="ref-login" onClick={() => navigate('/login')}>
            Log in
          </button>
        </div>
        <style>{refCss}</style>
      </div>
    );
  }

  return (
    <div className="ref-page">
      <header className="ref-head">
        <button type="button" className="ref-back" onClick={() => navigate(-1)}>
          <IonIcon ionName="chevron-back" size={16} color="#5f5a92" />
        </button>
        <h1 className="ref-headT">Refer &amp; Earn</h1>
        <button
          type="button"
          className="ref-refresh"
          onClick={() => {
            setRefreshing(true);
            void load(true);
          }}
          disabled={refreshing}
        >
          {refreshing ? '…' : '↻'}
        </button>
      </header>

      {loading ? (
        <p className="ref-load">Loading…</p>
      ) : (
        <div className="ref-scroll">
          {err ? <p className="ref-err">{err}</p> : null}

          <section className="ref-hero">
            <div className="ref-heroGlow" />
            <div className="ref-heroIcon">
              <IonIcon ionName="gift-outline" size={34} color="#7c77b9" />
            </div>
            <h2 className="ref-heroTitle">
              Refer a Friend &amp; Earn <br />₹{REFERRAL_REWARD_INR}
            </h2>
            <p className="ref-heroDesc">
              Share the joy of a spotless home. You and your friend both get ₹{REFERRAL_REWARD_INR} when they complete
              their first booking.
            </p>
            <div className="ref-codeBox">
              <div className="ref-codeLbl">Your Referral Code</div>
              <div className="ref-codeRow">
                <span className="ref-codeVal">{referralCode ?? '—'}</span>
                <button type="button" className="ref-copy" disabled={!referralCode} onClick={() => void copyCode()}>
                  <IonIcon ionName="copy-outline" size={18} color="#7c77b9" />
                </button>
              </div>
              {!referralCode ? (
                <p className="ref-codeHint">We could not load a code. Refresh or contact support.</p>
              ) : null}
            </div>
            <button type="button" className="ref-wa" disabled={!referralCode} onClick={shareWhatsApp}>
              <IonIcon ionName="logo-whatsapp" size={20} color="#F9F8FF" />
              Invite via WhatsApp
            </button>
          </section>

          <section className="ref-sec">
            <h3 className="ref-secT">How it Works</h3>
            <div className="ref-steps">
              {steps.map((step) => (
                <div key={step.tag} className="ref-stepCard">
                  <div className="ref-stepIcon" style={{ backgroundColor: step.iconBg }}>
                    <IonIcon ionName={step.icon} size={22} color={step.iconColor} />
                  </div>
                  <div className="ref-stepBody">
                    <span className="ref-stepTag" style={{ backgroundColor: step.chipBg, color: step.chipColor }}>
                      {step.tag}
                    </span>
                    <div className="ref-stepTitle">{step.title}</div>
                    <p className="ref-stepDesc">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="ref-stats">
            <div className="ref-statsL">
              <div className="ref-statsIcon">
                <IonIcon ionName="sparkles-outline" size={18} color="#006D47" />
              </div>
              <div>
                <div className="ref-statsTitle">Referral history</div>
                <div className="ref-statsSub">{statsSub}</div>
                <div className="ref-statsMeta">
                  {referralCredits.length} lifetime successful referral{referralCredits.length === 1 ? '' : 's'}
                </div>
              </div>
            </div>
            <div className="ref-statsR">
              <div className="ref-statsAmt">{formatRupeeInr(totalEarned)}</div>
              <div className="ref-statsCap">Total earned</div>
            </div>
          </div>

          <button
            type="button"
            className="ref-terms"
            onClick={() =>
              window.alert(
                [
                  `• Reward of ₹${REFERRAL_REWARD_INR} is credited when your friend's first booking is completed.`,
                  '• Your friend must enter your referral code at signup.',
                  `• ${APP_PRODUCT_NAME} may change or end the program with notice in the app.`,
                ].join('\n\n')
              )
            }
          >
            <span>Terms and Conditions</span>
            <IonIcon ionName="chevron-forward" size={12} color="#586161" />
          </button>
        </div>
      )}

      <style>{refCss}</style>
    </div>
  );
}

const refCss = `
  .ref-page { flex: 1; display: flex; flex-direction: column; background: #f7fafa; min-height: 0; }
  .ref-head {
    height: 56px; background: #fff; padding: 0 12px; display: flex; flex-direction: row; align-items: center; gap: 8px;
    border-bottom: 1px solid #e9efef;
  }
  .ref-back { width: 32px; height: 32px; border-radius: 999px; border: none; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .ref-headT { margin: 0; flex: 1; color: #5f5a92; font-size: 18px; font-weight: 700; }
  .ref-refresh { margin-left: auto; border: none; background: #f1f5f9; width: 36px; height: 32px; border-radius: 8px; font-weight: 800; cursor: pointer; color: #7c77b9; }
  .ref-load { padding: 32px; text-align: center; color: #64748b; }
  .ref-scroll { flex: 1; overflow: auto; padding: 16px 16px 40px; display: flex; flex-direction: column; gap: 32px; }
  .ref-err { color: #ac3434; font-size: 14px; margin: 0; }
  .ref-guest { padding: 24px; display: flex; flex-direction: column; gap: 12px; }
  .ref-guestT { margin: 0; font-size: 20px; font-weight: 800; color: #2c3435; }
  .ref-guestS { margin: 0; font-size: 15px; color: #586161; line-height: 22px; }
  .ref-login { align-self: flex-start; margin-top: 8px; background: #7c77b9; color: #fff; font-weight: 700; font-size: 15px; border: none; padding: 12px 24px; border-radius: 9999px; cursor: pointer; }
  .ref-hero {
    position: relative; background: #f0f4f4; border-radius: 32px; padding: 56px 32px 32px;
    display: flex; flex-direction: column; gap: 24px; overflow: hidden;
  }
  .ref-heroGlow { position: absolute; width: 192px; height: 192px; top: -48px; right: -48px; border-radius: 96px; background: rgba(124,119,185,0.15); }
  .ref-heroIcon { align-self: center; position: relative; z-index: 1; width: 96px; height: 96px; border-radius: 48px; background: rgba(169,192,255,0.3); display: flex; align-items: center; justify-content: center; }
  .ref-heroTitle { position: relative; z-index: 1; margin: 0; color: #2c3435; text-align: center; font-size: 22px; line-height: 1.2; font-weight: 800; letter-spacing: -0.5px; }
  .ref-heroDesc { position: relative; z-index: 1; margin: 0; color: #586161; text-align: center; font-size: 14px; line-height: 23px; padding: 0 8px; }
  .ref-codeBox { position: relative; z-index: 1; background: #fff; border-radius: 48px; border: 1px solid rgba(171,179,180,0.15); padding: 24px; }
  .ref-codeLbl { color: #747c7d; text-align: center; text-transform: uppercase; letter-spacing: 1px; font-size: 10px; font-weight: 700; }
  .ref-codeRow { margin-top: 12px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .ref-codeVal { flex: 1; color: #7c77b9; letter-spacing: 2.4px; font-size: 22px; font-weight: 700; word-break: break-all; }
  .ref-copy { width: 40px; height: 40px; border-radius: 999px; border: none; background: transparent; cursor: pointer; flex-shrink: 0; }
  .ref-codeHint { margin: 10px 0 0; text-align: center; font-size: 12px; color: #94a3b8; line-height: 17px; }
  .ref-wa {
    position: relative; z-index: 1; height: 48px; border-radius: 48px; border: none; background: #7c77b9;
    color: #f9f8ff; font-size: 16px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;
  }
  .ref-wa:disabled { opacity: 0.55; }
  .ref-sec { display: flex; flex-direction: column; gap: 24px; }
  .ref-secT { margin: 0; padding: 0 4px; color: #2c3435; font-size: 20px; font-weight: 700; }
  .ref-steps {
    display: flex;
    flex-direction: column;
    gap: 16px;
    --ref-step-pad: 16px;
    --ref-step-icon: 56px;
  }
  .ref-stepCard {
    background: #fff;
    border-radius: 16px;
    border: 1px solid rgba(171,179,180,0.05);
    padding: var(--ref-step-pad);
    display: flex;
    flex-direction: row;
    gap: 16px;
  }
  .ref-stepIcon {
    width: var(--ref-step-icon);
    height: var(--ref-step-icon);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .ref-stepBody { flex: 1; display: flex; flex-direction: column; justify-content: center; }
  .ref-stepTag { align-self: flex-start; border-radius: 999px; padding: 2px 8px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
  .ref-stepTitle { margin-top: 4px; color: #2c3435; font-size: 16px; font-weight: 700; }
  .ref-stepDesc { margin: 4px 0 0; color: #586161; font-size: 14px; line-height: 1.35; }
  .ref-stats {
    min-height: 106px; border-radius: 48px; border: 1px solid rgba(0,109,71,0.1); background: rgba(126,253,190,0.2);
    padding: 24px; display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: 12px;
  }
  .ref-statsL { display: flex; flex-direction: row; align-items: center; gap: 16px; flex: 1; min-width: 0; }
  .ref-statsIcon { width: 48px; height: 48px; border-radius: 24px; background: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .ref-statsTitle { color: #004b30; font-size: 16px; font-weight: 700; }
  .ref-statsSub { color: rgba(0,75,48,0.8); font-size: 12px; margin-top: 2px; line-height: 1.3; }
  .ref-statsMeta { color: rgba(0,75,48,0.55); font-size: 11px; margin-top: 4px; font-weight: 600; }
  .ref-statsR { text-align: right; }
  .ref-statsAmt { color: #004b30; font-size: 22px; font-weight: 800; }
  .ref-statsCap { color: rgba(0,75,48,0.6); font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; margin-top: 4px; }
  .ref-terms {
    border: none; border-top: 1px solid rgba(171,179,180,0.15); padding-top: 16px; min-height: 48px;
    display: flex; flex-direction: row; align-items: center; justify-content: space-between; background: transparent;
    font-size: 16px; font-weight: 500; color: #586161; cursor: pointer; width: 100%; text-align: left;
  }
`;
