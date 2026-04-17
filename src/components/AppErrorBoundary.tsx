import { Component, type ErrorInfo, type ReactNode } from 'react';

import { captureClientException } from '../lib/sentryClient';

type Props = { children: ReactNode };

type State = { hasError: boolean; message: string };

function reportToSentry(error: Error, errorInfo: ErrorInfo) {
  captureClientException(error, { componentStack: errorInfo.componentStack });
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'Something went wrong' };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AppErrorBoundary]', error, errorInfo);
    reportToSentry(error, errorInfo);
  }

  private reload = () => {
    window.location.reload();
  };

  private goHome = () => {
    this.setState({ hasError: false, message: '' });
    window.location.assign('/');
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="aeb-root">
          <div className="aeb-card">
            <h1 className="aeb-title">Something went wrong</h1>
            <p className="aeb-msg">{this.state.message}</p>
            <p className="aeb-hint">You can try again. If this keeps happening, contact support.</p>
            <div className="aeb-actions">
              <button type="button" className="aeb-btn aeb-btn--primary" onClick={this.reload}>
                Reload app
              </button>
              <button type="button" className="aeb-btn aeb-btn--ghost" onClick={this.goHome}>
                Go to start
              </button>
            </div>
          </div>
          <style>{`
            .aeb-root {
              min-height: 100dvh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 24px;
              background: linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%);
              font-family: var(--cs-font-sans, system-ui, sans-serif);
            }
            .aeb-card {
              max-width: 420px;
              width: 100%;
              background: #fff;
              border-radius: 20px;
              padding: 28px 24px;
              box-shadow: 0 12px 40px rgba(15, 23, 42, 0.1);
              border: 1px solid #e2e8f0;
            }
            .aeb-title {
              margin: 0 0 10px;
              font-size: 20px;
              font-weight: 800;
              color: #0f172a;
              letter-spacing: -0.3px;
            }
            .aeb-msg {
              margin: 0 0 8px;
              font-size: 14px;
              color: #b91c1c;
              line-height: 20px;
              word-break: break-word;
            }
            .aeb-hint {
              margin: 0 0 22px;
              font-size: 13px;
              color: #64748b;
              line-height: 19px;
            }
            .aeb-actions {
              display: flex;
              flex-direction: column;
              gap: 10px;
            }
            .aeb-btn {
              border-radius: 14px;
              padding: 14px 16px;
              font-size: 15px;
              font-weight: 700;
              cursor: pointer;
              border: none;
            }
            .aeb-btn--primary {
              background: linear-gradient(135deg, #9a95ca, #7c77b9);
              color: #fff;
            }
            .aeb-btn--ghost {
              background: #f1f5f9;
              color: #334155;
            }
          `}</style>
        </div>
      );
    }
    return this.props.children;
  }
}
