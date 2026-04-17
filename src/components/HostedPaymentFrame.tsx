type Props = {
  /** Full https checkout URL from `create-order` response (`payment_session_id`). */
  checkoutUri: string;
};

/**
 * PhonePe hosted checkout in an iframe (same idea as user-app `HostedPaymentWebView`).
 * Completion is handled by parent polling `verify-payment` + optional `/payment-result` deep link.
 */
export function HostedPaymentFrame({ checkoutUri }: Props) {
  const trimmed = String(checkoutUri || '').trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return (
      <div className="hpf-err">
        Invalid checkout link. Go back and start payment again.
        <style>{`
          .hpf-err {
            padding: 24px;
            text-align: center;
            color: #64748b;
            font-size: 15px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="hpf-wrap">
      <iframe
        title="Secure checkout"
        src={trimmed}
        className="hpf-frame"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <style>{`
        .hpf-wrap {
          position: relative;
          flex: 1 1 auto;
          min-height: 0;
          width: 100%;
          background: #fff;
          overflow: hidden;
        }
        .hpf-frame {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border: none;
          display: block;
        }
      `}</style>
    </div>
  );
}
