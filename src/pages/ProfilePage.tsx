import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { PwaInstallOffer } from '../components/PwaInstallOffer';
import { APP_PRODUCT_NAME } from '../constants/branding';
import { getProfileWithSessionToken } from '../lib/authApi';
import { clearSession, getSession } from '../lib/session';
import {
  updateUserProfile,
  uploadUserProfilePhoto,
  type UserProfile,
  type UpdateUserProfileBody,
} from '../lib/userApi';
import { resolveMediaUrl } from '../lib/api';
import { formatRupeeInr } from '../utils/price';
import { IonIcon } from '../utils/ionIcon';

const GENDER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Prefer not to say' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

function formatDobForInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function sameDob(a: string | null | undefined, bInput: string): boolean {
  return formatDobForInput(a) === bInput.trim();
}

function OptionRow({
  icon,
  iconColor,
  bg,
  label,
  sub,
  onPress,
}: {
  icon: string;
  iconColor: string;
  bg: string;
  label: string;
  sub?: string;
  onPress?: () => void;
}) {
  const inner = (
    <>
      <div className="prof-optLeft">
        <div className="prof-optIcon" style={{ backgroundColor: bg }}>
          <IonIcon ionName={icon} size={20} color={iconColor} />
        </div>
        <div>
          <div className="prof-optLabel">{label}</div>
          {sub ? <div className="prof-optSub">{sub}</div> : null}
        </div>
      </div>
      {onPress ? <IonIcon ionName="chevron-forward" size={12} color="#ABB3B4" /> : null}
    </>
  );
  if (onPress) {
    return (
      <button type="button" className="prof-optRow" onClick={onPress}>
        {inner}
      </button>
    );
  }
  return <div className="prof-optRow prof-optRow--static">{inner}</div>;
}

export function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [dobInput, setDobInput] = useState('');
  const [genderValue, setGenderValue] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const session = getSession();
      if (!session?.token) {
        setUser(null);
        return;
      }
      const { user: u } = await getProfileWithSessionToken(session.token);
      setUser(u);
      setNameInput(u.name || '');
      setEmailInput(u.email || '');
      setDobInput(formatDobForInput(u.dateOfBirth));
      setGenderValue(u.gender || '');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load profile');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = () => {
    if (!user) return;
    setErr(null);
    setNameInput(user.name || '');
    setEmailInput(user.email || '');
    setDobInput(formatDobForInput(user.dateOfBirth));
    setGenderValue(user.gender || '');
    setEditing(true);
  };

  const logout = () => {
    clearSession();
    navigate('/', { replace: true });
  };

  const walletDisplay = user?.wallet != null ? formatRupeeInr(user.wallet) : '—';
  const phoneDisplay = user?.phone ? `+91 ${user.phone.replace(/^(\+91)?/, '')}` : 'Not set';
  const avatarResolved = user?.profilePhotoUrl ? resolveMediaUrl(user.profilePhotoUrl) : null;

  const onPickPhoto = () => fileInputRef.current?.click();

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    const session = getSession();
    if (!session?.token) {
      logout();
      return;
    }
    setErr(null);
    setUploadingPhoto(true);
    try {
      const { user: updated } = await uploadUserProfilePhoto(session.token, file);
      setUser(updated);
    } catch (err) {
      setErr(err instanceof Error ? err.message : 'Could not update photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    const session = getSession();
    if (!session?.token) {
      logout();
      return;
    }
    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      setErr('Please enter your name');
      return;
    }
    setErr(null);
    const body: UpdateUserProfileBody = {};
    if (trimmedName !== (user.name || '').trim()) body.name = trimmedName;
    if (emailInput.trim().toLowerCase() !== (user.email || '').trim().toLowerCase()) {
      body.email = emailInput.trim().toLowerCase();
    }
    if (!sameDob(user.dateOfBirth, dobInput)) {
      body.dateOfBirth = dobInput.trim() === '' ? null : dobInput.trim();
    }
    const ug = user.gender || '';
    if (genderValue !== ug) body.gender = genderValue;

    if (Object.keys(body).length === 0) {
      setEditing(false);
      return;
    }

    try {
      setSavingProfile(true);
      const { user: updated } = await updateUserProfile(session.token, body);
      setUser(updated);
      setEditing(false);
    } catch (err) {
      setErr(err instanceof Error ? err.message : 'Could not save profile');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="prof-page">
      <header className="prof-head">
        <h1 className="prof-title">Profile</h1>
      </header>

      <div className="prof-scroll">
        {loading ? <p className="prof-muted">Loading…</p> : null}
        {err && !editing ? <p className="prof-err">{err}</p> : null}

        {!loading && !user ? (
          <div className="prof-guest">
            <p className="prof-guestName">Guest</p>
            <p className="prof-guestSub">Log in to manage your profile.</p>
            <button type="button" className="prof-loginBtn" onClick={() => navigate('/login')}>
              Log in
            </button>
          </div>
        ) : null}

        {user ? (
          <>
            <div className="prof-hero">
              <div className="prof-avatarWrap">
                {avatarResolved ? (
                  <img className="prof-avatar" src={avatarResolved} alt="" />
                ) : (
                  <img className="prof-avatar" src="/favicon.png" alt="" />
                )}
                {(uploadingPhoto || savingProfile) && (
                  <div className="prof-avatarLoad">
                    <span className="prof-spin" />
                  </div>
                )}
                <button type="button" className="prof-editFab" onClick={openEdit} disabled={uploadingPhoto}>
                  <IonIcon ionName="create-outline" size={10} color="#FFFFFF" />
                </button>
              </div>
              <p className="prof-name">{user.name || 'Guest'}</p>
            </div>

            <div className="prof-stats">
              <div className="prof-statCard">
                <IonIcon ionName="shield-checkmark-outline" size={20} color="#7c77b9" />
                <div className="prof-statLbl">WALLET</div>
                <div className="prof-statVal">{walletDisplay}</div>
              </div>
              <div className="prof-statCard">
                <IonIcon ionName="gift-outline" size={18} color="#006D47" />
                <div className="prof-statLbl">REFERRAL CODE</div>
                <div className="prof-statVal">{user.referralCode || 'Not assigned'}</div>
              </div>
            </div>

            <div className="prof-options">
              <OptionRow
                icon="map-outline"
                iconColor="#7c77b9"
                bg="rgba(124,119,185,0.08)"
                label="Saved Addresses"
                onPress={() => navigate('/profile/saved-addresses')}
              />
              <OptionRow
                icon="wallet-outline"
                iconColor="#006D47"
                bg="rgba(0,109,71,0.05)"
                label="Wallet Balance"
                sub={walletDisplay}
              />
              <OptionRow
                icon="gift-outline"
                iconColor="#006499"
                bg="rgba(0,100,153,0.05)"
                label="Referral & Earn"
                sub={user.referralCode ? `Your code: ${user.referralCode}` : undefined}
                onPress={() => navigate('/profile/referral')}
              />
              <OptionRow
                icon="headset-outline"
                iconColor="#586161"
                bg="rgba(88,97,97,0.05)"
                label="Help & Support"
                onPress={() => navigate('/profile/help-support')}
              />
              <OptionRow
                icon="information-circle-outline"
                iconColor="#586161"
                bg="rgba(88,97,97,0.05)"
                label={`About ${APP_PRODUCT_NAME}`}
              />
              <div className="prof-installSlot">
                <PwaInstallOffer />
              </div>
              <button type="button" className="prof-logout" onClick={logout}>
                <IonIcon ionName="log-out-outline" size={18} color="#AC3434" />
                Logout
              </button>
            </div>
          </>
        ) : null}

        <p className="prof-version">VERSION 2.4.0 (PRISTINE CANVAS)</p>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="prof-file" onChange={onFileChange} />

      {user && editing ? (
        <div className="prof-sheetRoot">
          <button
            type="button"
            className="prof-sheetBackdrop"
            aria-label="Close"
            onClick={() => !savingProfile && !uploadingPhoto && setEditing(false)}
          />
          <div className="prof-sheet">
            <h2 className="prof-sheetTitle">Edit profile</h2>
            {err ? <p className="prof-sheetErr">{err}</p> : null}
            <div className="prof-sheetScroll">
              <div className="prof-photoRow">
                <div className="prof-photoSm">
                  {avatarResolved ? (
                    <img className="prof-photoSmImg" src={avatarResolved} alt="" />
                  ) : (
                    <img className="prof-photoSmImg" src="/favicon.png" alt="" />
                  )}
                  {uploadingPhoto ? (
                    <div className="prof-photoSmLoad">
                      <span className="prof-spin prof-spin--sm" />
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="prof-changePhoto"
                  disabled={uploadingPhoto}
                  onClick={() => void onPickPhoto()}
                >
                  Change photo
                </button>
              </div>

              <label className="prof-fldLbl">Full name</label>
              <input
                className="prof-fldInp"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Your name"
              />

              <label className="prof-fldLbl">Mobile</label>
              <div className="prof-fldRead">{phoneDisplay}</div>
              <p className="prof-fldHint">Verified with OTP — contact support to change.</p>

              <label className="prof-fldLbl">Email</label>
              <input
                className="prof-fldInp"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="you@example.com"
                inputMode="email"
                autoCapitalize="off"
              />

              <label className="prof-fldLbl">Date of birth</label>
              <input
                className="prof-fldInp"
                value={dobInput}
                onChange={(e) => setDobInput(e.target.value)}
                placeholder="YYYY-MM-DD"
              />

              <div className="prof-fldLbl">Gender</div>
              <div className="prof-genderRow">
                {GENDER_OPTIONS.map((opt) => {
                  const selected = genderValue === opt.value;
                  return (
                    <button
                      key={opt.value || 'unspecified'}
                      type="button"
                      className={`prof-chip ${selected ? 'prof-chip--on' : ''}`}
                      onClick={() => setGenderValue(opt.value)}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="prof-sheetActions">
              <button
                type="button"
                className="prof-btnGhost"
                disabled={savingProfile || uploadingPhoto}
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="prof-btnPri"
                disabled={savingProfile || uploadingPhoto}
                onClick={() => void saveProfile()}
              >
                {savingProfile ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style>{`
        .prof-page {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #f7fafa;
          min-height: 0;
        }
        .prof-head {
          padding: calc(var(--cs-safe-top) + 8px) 24px 12px;
          background: #fff;
          border-bottom: 1px solid #e9efef;
        }
        .prof-title {
          margin: 0;
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.4px;
          color: #0f172a;
        }
        .prof-scroll {
          flex: 1;
          overflow: auto;
          padding: 32px 24px 40px;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }
        .prof-muted {
          text-align: center;
          color: #64748b;
        }
        .prof-err {
          color: #ac3434;
          font-size: 14px;
        }
        .prof-guest {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .prof-guestName {
          margin: 0;
          font-size: 24px;
          font-weight: 800;
          color: #2c3435;
        }
        .prof-guestSub {
          margin: 0;
          color: #586161;
          font-size: 16px;
        }
        .prof-loginBtn {
          align-self: flex-start;
          margin-top: 8px;
          background: #7c77b9;
          color: #fff;
          font-weight: 700;
          font-size: 14px;
          border: none;
          padding: 10px 20px;
          border-radius: 9999px;
          cursor: pointer;
        }
        .prof-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .prof-avatarWrap {
          position: relative;
          width: 112px;
          height: 112px;
          border-radius: 56px;
          background: #fff;
          overflow: visible;
          border: 1px solid rgba(15, 23, 42, 0.08);
        }
        .prof-avatar {
          width: 112px;
          height: 112px;
          border-radius: 56px;
          object-fit: cover;
          display: block;
        }
        .prof-avatarLoad {
          position: absolute;
          inset: 0;
          border-radius: 56px;
          background: rgba(15, 23, 42, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .prof-spin {
          width: 28px;
          height: 28px;
          border: 3px solid rgba(255, 255, 255, 0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: prof-spin 0.8s linear infinite;
        }
        .prof-spin--sm {
          width: 22px;
          height: 22px;
          border-width: 2px;
        }
        @keyframes prof-spin {
          to {
            transform: rotate(360deg);
          }
        }
        .prof-editFab {
          position: absolute;
          right: -8px;
          bottom: -8px;
          width: 30px;
          height: 30px;
          border-radius: 15px;
          border: 2px solid #fff;
          background: #7c77b9;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .prof-editFab:disabled {
          opacity: 0.5;
        }
        .prof-name {
          margin: 16px 0 0;
          color: #2c3435;
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.6px;
        }
        .prof-stats {
          display: flex;
          flex-direction: row;
          gap: 16px;
        }
        .prof-statCard {
          flex: 1;
          min-height: 112px;
          border-radius: 32px;
          border: 1px solid rgba(171, 179, 180, 0.1);
          background: #f0f4f4;
          padding: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .prof-statLbl {
          color: #586161;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.1px;
          text-transform: uppercase;
        }
        .prof-statVal {
          color: #2c3435;
          font-size: 18px;
          font-weight: 700;
          word-break: break-all;
        }
        .prof-options {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .prof-optRow {
          height: 72px;
          border-radius: 32px;
          background: #fff;
          padding: 0 16px;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          border: none;
          width: 100%;
          cursor: pointer;
          text-align: left;
        }
        .prof-optRow--static {
          cursor: default;
        }
        .prof-optLeft {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 16px;
          min-width: 0;
        }
        .prof-optIcon {
          width: 40px;
          height: 40px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .prof-optLabel {
          color: #2c3435;
          font-size: 16px;
          font-weight: 600;
        }
        .prof-optSub {
          color: #006d47;
          font-size: 12px;
          font-weight: 700;
          margin-top: 2px;
        }
        .prof-installSlot {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          padding: 4px 0;
        }
        .prof-logout {
          margin-top: 16px;
          height: 56px;
          border-radius: 32px;
          background: rgba(172, 52, 52, 0.05);
          border: none;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #ac3434;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
        }
        .prof-version {
          text-align: center;
          color: #abb3b4;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin: 0;
        }
        .prof-file {
          display: none;
        }
        .prof-sheetRoot {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          align-items: stretch;
        }
        .prof-sheetBackdrop {
          position: absolute;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          border: none;
          cursor: pointer;
        }
        .prof-sheet {
          position: relative;
          background: #fff;
          border-top-left-radius: 24px;
          border-top-right-radius: 24px;
          padding: 18px 24px max(20px, env(safe-area-inset-bottom, 0px));
          max-height: 92vh;
          display: flex;
          flex-direction: column;
        }
        .prof-sheetTitle {
          margin: 0 0 8px;
          font-size: 18px;
          font-weight: 700;
          color: #2c3435;
        }
        .prof-sheetErr {
          color: #ac3434;
          font-size: 13px;
          margin: 0 0 8px;
        }
        .prof-sheetScroll {
          overflow: auto;
          flex: 1;
          min-height: 0;
          padding-bottom: 8px;
        }
        .prof-photoRow {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 16px;
          margin-bottom: 12px;
        }
        .prof-photoSm {
          position: relative;
          width: 72px;
          height: 72px;
          border-radius: 36px;
          overflow: hidden;
          background: #eef2f6;
        }
        .prof-photoSmImg {
          width: 72px;
          height: 72px;
          object-fit: cover;
          display: block;
        }
        .prof-photoSmLoad {
          position: absolute;
          inset: 0;
          background: rgba(15, 23, 42, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .prof-changePhoto {
          padding: 10px 16px;
          border-radius: 9999px;
          border: 1px solid #7c77b9;
          background: rgba(124, 119, 185, 0.08);
          color: #7c77b9;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
        }
        .prof-changePhoto:disabled {
          opacity: 0.6;
        }
        .prof-fldLbl {
          display: block;
          margin-top: 12px;
          font-size: 12px;
          font-weight: 700;
          color: #586161;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }
        .prof-fldInp {
          margin-top: 6px;
          width: 100%;
          padding: 12px 14px;
          font-size: 16px;
          font-weight: 600;
          color: #2c3435;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #fafbfc;
          box-sizing: border-box;
        }
        .prof-fldRead {
          margin-top: 6px;
          padding: 12px 14px;
          font-size: 16px;
          font-weight: 600;
          color: #475569;
          border-radius: 12px;
          border: 1px solid #eef2f6;
          background: #f1f5f9;
        }
        .prof-fldHint {
          margin: 4px 0 0;
          font-size: 11px;
          color: #94a3b8;
        }
        .prof-genderRow {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }
        .prof-chip {
          padding: 8px 14px;
          border-radius: 9999px;
          border: 1px solid #e2e8f0;
          background: #fafbfc;
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
        }
        .prof-chip--on {
          border-color: #7c77b9;
          background: rgba(124, 119, 185, 0.12);
          color: #7c77b9;
        }
        .prof-sheetActions {
          margin-top: 16px;
          display: flex;
          flex-direction: row;
          justify-content: flex-end;
          gap: 12px;
        }
        .prof-btnGhost {
          padding: 10px 18px;
          border-radius: 9999px;
          border: 1px solid #e2e8f0;
          background: #fff;
          font-size: 14px;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
        }
        .prof-btnPri {
          padding: 10px 22px;
          border-radius: 9999px;
          border: none;
          background: #7c77b9;
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          min-width: 100px;
          cursor: pointer;
        }
        .prof-btnGhost:disabled,
        .prof-btnPri:disabled {
          opacity: 0.65;
        }
      `}</style>
    </div>
  );
}
