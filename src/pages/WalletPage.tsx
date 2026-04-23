import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { fetchWalletBalance, fetchWalletTransactions, type WalletTransactionRecord } from '../lib/wallet';
import { getSession } from '../lib/session';
import { formatRupeeInr } from '../utils/price';
import { IonIcon } from '../utils/ionIcon';
import { APP_PRODUCT_NAME } from '../constants/branding';
import { WALLET_TOPUP_VIA_PHONEPE_DISABLED } from '../config/paymentFlags';

function formatTxTitle(reason: string): string {
  const r = String(reason || '').toLowerCase();
  if (r === 'referral') return 'Referral reward';
  if (r === 'cashback') return 'Cashback';
  if (r === 'top_up' || r === 'topup') return 'Added to wallet';
  if (r === 'booking' || r === 'service' || r === 'payment' || r === 'booking_payment') return 'Booking payment';
  if (r === 'booking_cancel') return 'Booking cancelled (refund)';
  return String(reason || 'Transaction')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTxWhen(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function WalletPage() {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const hasFetchedOnce = useRef(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    setErr(null);
    const silent = opts?.silent ?? false;
    if (!silent) setLoading(true);
    try {
      const session = getSession();
      if (!session?.token) {
        setBalance(0);
        setTransactions([]);
        return;
      }
      const [w, t] = await Promise.all([fetchWalletBalance(session.token), fetchWalletTransactions(session.token)]);
      setBalance(Number(w.wallet) || 0);
      setTransactions(t.transactions ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load wallet');
      setBalance(0);
      setTransactions([]);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const silent = hasFetchedOnce.current;
    hasFetchedOnce.current = true;
    void load({ silent });
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load({ silent: true });
  }, [load]);

  const { referralTotal, otherCreditTotal } = useMemo(() => {
    let refSum = 0;
    let other = 0;
    for (const tx of transactions) {
      if (tx.type !== 'credit') continue;
      if (tx.reason === 'referral') refSum += tx.amount;
      else other += tx.amount;
    }
    return { referralTotal: refSum, otherCreditTotal: other };
  }, [transactions]);

  const recentTx = useMemo(() => transactions.slice(0, 15), [transactions]);

  return (
    <div className="wal-page">
      <header className="wal-head">
        <h1 className="wal-title">Wallet</h1>
        <button type="button" className="wal-refresh" onClick={onRefresh} disabled={refreshing} aria-label="Refresh">
          <IonIcon ionName="flash-outline" size={22} color="#7c77b9" />
        </button>
      </header>

      <div className="wal-scroll">
        {loading ? <p className="wal-muted">Loading…</p> : null}
        {err ? <p className="wal-err">{err}</p> : null}

        {!loading ? (
          <>
            <div className="wal-balanceCard">
              <div className="wal-balanceGlowR" />
              <div className="wal-balanceGlowL" />
              <div className="wal-balanceLabel">AVAILABLE BALANCE</div>
              <div className="wal-balanceAmt">{formatRupeeInr(balance)}</div>
            </div>

            {WALLET_TOPUP_VIA_PHONEPE_DISABLED ? (
              <></>
              // <div className="wal-payCard wal-payCard--disabled" aria-disabled="true">
              //   <IonIcon ionName="card-outline" size={22} color="#94a3b8" />
              //   {/* <div className="wal-payMid">
              //     <div className="wal-payTitle">Add money (UPI / card)</div>
                  
              //   </div> */}
              // </div>
            ) : (
              <button type="button" className="wal-payCard" onClick={() => navigate('/wallet-topup')}>
                <IonIcon ionName="card-outline" size={22} color="#7c77b9" />
                <div className="wal-payMid">
                  <div className="wal-payTitle">Pay with UPI / card</div>
                  <div className="wal-paySub">Secure checkout via PhonePe (sandbox / live)</div>
                </div>
                <IonIcon ionName="chevron-forward" size={20} color="#94A3B8" />
              </button>
            )}

            <div className="wal-earnGrid">
              <div className="wal-earnCard">
                <div className="wal-earnIconG">
                  <IonIcon ionName="people-outline" size={18} color="#006D47" />
                </div>
                <div className="wal-earnLbl">Referral earnings</div>
                <div className="wal-earnVal">{formatRupeeInr(referralTotal)}</div>
              </div>
              <div className="wal-earnCard">
                <div className="wal-earnIconB">
                  <IonIcon ionName="wallet-outline" size={18} color="#006499" />
                </div>
                <div className="wal-earnLbl">Other credits</div>
                <div className="wal-earnVal">{formatRupeeInr(otherCreditTotal)}</div>
              </div>
            </div>

            <button type="button" className="wal-invite" onClick={() => navigate('/profile/referral')}>
              <div className="wal-inviteShade" />
              <div className="wal-inviteBody">
                <div className="wal-inviteTitle">Invite &amp; Earn</div>
                <div className="wal-inviteTxt">Share {APP_PRODUCT_NAME} with friends and earn wallet rewards.</div>
                <div className="wal-referRow">
                  <span className="wal-referTxt">Refer Now</span>
                  <IonIcon ionName="arrow-forward" size={10} color="#006D47" />
                </div>
              </div>
              <div className="wal-inviteIcon">
                <IonIcon ionName="megaphone-outline" size={24} color="#006D47" />
              </div>
            </button>

            <section className="wal-txSec">
              <h2 className="wal-secTitle">Recent transactions</h2>
              {recentTx.length === 0 ? (
                <p className="wal-noTx">No transactions yet.</p>
              ) : (
                recentTx.map((tx) => {
                  const credit = tx.type === 'credit';
                  return (
                    <div key={tx._id} className="wal-txItem">
                      <div className="wal-txLeft">
                        <div className={credit ? 'wal-txIconG' : 'wal-txIcon'}>
                          <IonIcon
                            ionName={credit ? 'add-circle-outline' : 'remove-circle-outline'}
                            size={20}
                            color={credit ? '#006D47' : '#AC3434'}
                          />
                        </div>
                        <div className="wal-txMeta">
                          <div className="wal-txTitle">{formatTxTitle(tx.reason)}</div>
                          <div className="wal-txSub">{formatTxWhen(tx.createdAt)}</div>
                        </div>
                      </div>
                      <div>
                        <div className={credit ? 'wal-txAmtG' : 'wal-txAmt'}>
                          {credit ? '+ ' : '- '}
                          {formatRupeeInr(tx.amount)}
                        </div>
                        <div className="wal-txType">{credit ? 'CREDIT' : 'DEBIT'}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </section>
          </>
        ) : null}
      </div>

      <style>{`
        .wal-page {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #f7fafa;
          min-height: 0;
        }
        .wal-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: calc(var(--cs-safe-top) + 8px) 20px 12px;
          background: #fff;
          border-bottom: 1px solid #e9efef;
        }
        .wal-title {
          margin: 0;
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.4px;
          color: #0f172a;
        }
        .wal-refresh {
          width: 40px;
          height: 40px;
          border: none;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
        }
        .wal-refresh:disabled {
          opacity: 0.5;
        }
        .wal-scroll {
          flex: 1;
          overflow: auto;
          padding: 24px 24px 32px;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }
        .wal-muted {
          color: #64748b;
          text-align: center;
        }
        .wal-err {
          color: #ac3434;
          font-size: 14px;
        }
        .wal-balanceCard {
          position: relative;
          min-height: 136px;
          border-radius: 48px;
          background: #7c77b9;
          padding: 32px;
          overflow: hidden;
        }
        .wal-balanceGlowR {
          position: absolute;
          width: 192px;
          height: 192px;
          border-radius: 96px;
          right: -48px;
          top: -48px;
          background: rgba(255, 255, 255, 0.1);
        }
        .wal-balanceGlowL {
          position: absolute;
          width: 128px;
          height: 128px;
          border-radius: 64px;
          left: -32px;
          bottom: -32px;
          background: rgba(126, 253, 190, 0.2);
        }
        .wal-balanceLabel {
          position: relative;
          color: rgba(249, 248, 255, 0.7);
          font-size: 14px;
          font-weight: 400;
          letter-spacing: 1.4px;
          text-transform: uppercase;
        }
        .wal-balanceAmt {
          position: relative;
          color: #f9f8ff;
          font-size: 48px;
          line-height: 48px;
          font-weight: 800;
          margin-top: 4px;
          letter-spacing: -1.2px;
        }
        .wal-payCard {
          display: flex;
          flex-direction: row;
          align-items: center;
          background: #fff;
          border-radius: 20px;
          padding: 16px;
          border: 1px solid #e9efef;
          text-align: left;
          cursor: pointer;
          width: 100%;
        }
        .wal-payCard--disabled {
          opacity: 0.9;
          cursor: default;
          background: #f8fafc;
          border-style: dashed;
        }
        .wal-payMid {
          flex: 1;
          margin-left: 12px;
          min-width: 0;
        }
        .wal-payTitle {
          font-size: 16px;
          font-weight: 700;
          color: #2c3435;
        }
        .wal-paySub {
          font-size: 12px;
          color: #586161;
          margin-top: 2px;
        }
        .wal-earnGrid {
          display: flex;
          flex-direction: row;
          gap: 16px;
        }
        .wal-earnCard {
          flex: 1;
          min-height: 128px;
          border-radius: 32px;
          background: #f0f4f4;
          padding: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .wal-earnIconG {
          width: 40px;
          height: 32px;
          border-radius: 32px;
          background: rgba(126, 253, 190, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .wal-earnIconB {
          width: 36px;
          height: 35px;
          border-radius: 32px;
          background: rgba(115, 191, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .wal-earnLbl {
          color: #586161;
          font-size: 12px;
          font-weight: 500;
        }
        .wal-earnVal {
          color: #2c3435;
          font-size: 20px;
          font-weight: 700;
        }
        .wal-invite {
          position: relative;
          min-height: 142px;
          border-radius: 32px;
          border: 1px solid rgba(0, 109, 71, 0.1);
          background: rgba(126, 253, 190, 0.1);
          padding: 24px;
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 16px;
          overflow: hidden;
          cursor: pointer;
          text-align: left;
          width: 100%;
        }
        .wal-inviteShade {
          position: absolute;
          left: 71%;
          right: -16px;
          top: 1px;
          bottom: -2px;
          background: rgba(126, 253, 190, 0.05);
        }
        .wal-inviteBody {
          flex: 1;
          position: relative;
          z-index: 1;
        }
        .wal-inviteTitle {
          color: #00603e;
          font-size: 15.6px;
          font-weight: 700;
        }
        .wal-inviteTxt {
          color: rgba(0, 96, 62, 0.7);
          font-size: 14px;
          line-height: 20px;
          margin-top: 4px;
          max-width: 210px;
        }
        .wal-referRow {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 4px;
        }
        .wal-referTxt {
          color: #006d47;
          font-size: 14px;
          font-weight: 700;
        }
        .wal-inviteIcon {
          position: relative;
          z-index: 1;
          width: 48px;
          height: 64px;
          border-radius: 9999px;
          background: rgba(126, 253, 190, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .wal-txSec {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .wal-secTitle {
          margin: 0;
          color: #2c3435;
          font-size: 20px;
          font-weight: 700;
        }
        .wal-noTx {
          font-size: 14px;
          color: #586161;
          margin: 0;
        }
        .wal-txItem {
          min-height: 80px;
          border-radius: 32px;
          background: #fff;
          padding: 16px;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
        }
        .wal-txLeft {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 16px;
          flex: 1;
          margin-right: 12px;
          min-width: 0;
        }
        .wal-txIcon {
          width: 48px;
          height: 48px;
          border-radius: 24px;
          background: #f0f4f4;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .wal-txIconG {
          width: 48px;
          height: 48px;
          border-radius: 24px;
          background: rgba(126, 253, 190, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .wal-txMeta {
          flex: 1;
          min-width: 0;
        }
        .wal-txTitle {
          color: #2c3435;
          font-size: 16px;
          font-weight: 700;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .wal-txSub {
          color: #586161;
          font-size: 12px;
          margin-top: 2px;
        }
        .wal-txAmt {
          color: #2c3435;
          font-size: 16px;
          font-weight: 700;
          text-align: right;
        }
        .wal-txAmtG {
          color: #006d47;
          font-size: 16px;
          font-weight: 700;
          text-align: right;
        }
        .wal-txType {
          color: #586161;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: -0.5px;
          text-transform: uppercase;
          text-align: right;
        }
      `}</style>
    </div>
  );
}
