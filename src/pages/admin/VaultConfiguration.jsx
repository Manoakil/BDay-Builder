import React, { useEffect, useState } from 'react';
import { getVaultForManager, updateVault, getMyBirthdayEvent, getWishesForEvent, createVault } from '../../service/eventService';
import { uploadMedia, createWish } from '../../service/wishService';
import { HiOutlineLockClosed, HiOutlineKey, HiOutlineGift, HiOutlineClock } from 'react-icons/hi';
import { useDialog } from '../../context/DialogContext';
import "../../style/Admin.css";

function VaultConfiguration() {
  const [vault, setVault] = useState(null);
  const [event, setEvent] = useState(null);
  const [wishes, setWishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const dialog = useDialog();

  // Form state
  const [isEnabled, setIsEnabled] = useState(false);
  const [challengeQuestion, setChallengeQuestion] = useState('');
  const [challengeAnswer, setChallengeAnswer] = useState(''); // Only used when updating
  const [lockedUntil, setLockedUntil] = useState('');
  const [hint, setHint] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const evt = await getMyBirthdayEvent();
      setEvent(evt);
      if (evt) {
        const [vaultData, wishesData] = await Promise.all([
          getVaultForManager(evt.id).catch(() => null),
          getWishesForEvent(evt.id)
        ]);

        setWishes(wishesData || []);
        if (vaultData) {
          setVault(vaultData);
          setIsEnabled(vaultData.is_enabled);
          setChallengeQuestion(vaultData.question || vaultData.challenge_question || '');
          setHint(vaultData.hint || '');
          if (vaultData.locked_until) {
            const date = new Date(vaultData.locked_until);
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            const hh = String(date.getHours()).padStart(2, '0');
            const min = String(date.getMinutes()).padStart(2, '0');
            setLockedUntil(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!vault) return;
    setSaving(true);
    try {
      const payload = {
        is_enabled: isEnabled,
        question: challengeQuestion,
        hint: hint,
        locked_until: lockedUntil ? new Date(lockedUntil).toISOString() : null
      };


      // Only include answer if it was changed (backend handles hashing)
      if (challengeAnswer.trim()) {
        payload.answer_hash = challengeAnswer.trim();
      }

      const updated = await updateVault(vault.id, payload);
      dialog.showAlert('Secret vault configured successfully!');
      setVault(updated);
      setChallengeAnswer(''); // Clear answer field after successful save
    } catch (err) {
      dialog.showAlert(`Error updating vault: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateInitialVault = async () => {
    setSaving(true);
    try {
      const newVault = await createVault({
        event_id: event.id,
        is_enabled: false,
        question: "What is my favorite color?",
        answer_hash: "blue"
      });
      dialog.showAlert('Vault created successfully!');
      setVault(newVault);
      fetchData(); // Reload data
    } catch (err) {
      dialog.showAlert(`Error creating vault: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };



  if (loading) return <div className="admin-loading" style={{ color: "white" }}>Loading vault configuration...</div>;
  if (!event) return <div className="admin-empty">No active birthday event found.</div>;
  if (!vault) return (
    <div className="admin-empty">
      <h3>No Secret Vault Found</h3>
      <p>A secret vault has not been initialized for this event.</p>
      <button className="admin-btn primary" onClick={handleCreateInitialVault} disabled={saving}>
        {saving ? "Creating..." : "🔐 Configure Secret Vault"}
      </button>
    </div>
  );

  return (
    <div className="admin-section">
      <h2 className="admin-section-title">🔐 Secret Vault Configuration</h2>
      <p className="admin-section-subtitle">Set up a special hidden wish that unlocks by answering a personal question.</p>

      <form className="admin-form" onSubmit={handleSave}>
        <div className="form-group-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={e => setIsEnabled(e.target.checked)}
              className="toggle-checkbox"
            />
            <span className="toggle-text">Enable Secret Vault</span>
          </label>
        </div>

        {isEnabled && (
          <div style={{
            background: "rgba(255, 209, 102, 0.08)",
            border: "1px solid rgba(255, 209, 102, 0.3)",
            borderRadius: "12px",
            padding: "16px 20px",
            marginBottom: "2rem"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
              <span style={{ fontWeight: 600, color: "#ffd166", fontSize: "0.95rem" }}>
                🔗 Dedicated Secret Vault Wish Link
              </span>
              <button
                type="button"
                className="admin-btn outline"
                style={{ padding: "6px 14px", fontSize: "0.85rem" }}
                onClick={() => {
                  const shareUrl = `${window.location.origin}/vault?org_id=${event.organization_id}&vault_id=${vault.id}`;
                  navigator.clipboard.writeText(shareUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2500);
                  dialog.showAlert("Secret Vault link copied to clipboard!");
                }}
              >
                {copied ? "✓ Copied!" : "📋 Copy Link"}
              </button>
            </div>
            <p style={{ margin: "0 0 8px", fontSize: "0.85rem", color: "#e2e8f0" }}>
              Share this dedicated link with the birthday star. They will be asked the secret question before unlocking the vault!
            </p>
            <input
              type="text"
              readOnly
              value={`${window.location.origin}/vault?org_id=${event.organization_id}&vault_id=${vault.id}`}
              style={{
                width: "100%",
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#ffd166",
                padding: "8px 12px",
                borderRadius: "6px",
                fontSize: "0.85rem",
                fontFamily: "monospace"
              }}
              onClick={(e) => e.target.select()}
            />
          </div>
        )}

        <div className={`vault-settings ${!isEnabled ? 'disabled-section' : ''}`}>

          <div className="form-group" style={{ marginBottom: "2rem", display: "flex", gap: "1rem", alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <label><HiOutlineGift /> Secret Vault Wishes</label>
              <p style={{ margin: 0, color: "white", fontSize: "0.9rem" }}>
                Leave normal wishes on behalf of others, but make them strictly visible only when the Vault is unlocked.
              </p>
            </div>
            <button
              type="button"
              className="admin-btn outline"
              disabled={!isEnabled}
              onClick={() => window.location.href = '/wisher?mode=secret'}
            >
              + Give Vault Wish
            </button>
          </div>

          <div className="form-group">
            <label><HiOutlineLockClosed /> Challenge Question</label>
            <input
              type="text"
              value={challengeQuestion}
              onChange={e => setChallengeQuestion(e.target.value)}
              placeholder="e.g. What was the name of our first pet?"
              disabled={!isEnabled}
              required={isEnabled}
            />
          </div>

          <div className="form-group">
            <label><HiOutlineKey /> Challenge Answer</label>
            <input
              type="text"
              value={challengeAnswer}
              onChange={e => setChallengeAnswer(e.target.value)}
              placeholder="Leave blank to keep existing answer"
              disabled={!isEnabled}
              required={isEnabled && !vault.challenge_question} // Require if it's the first time setting up
            />
            <small>The correct answer (case-insensitive).</small>
          </div>

          <div className="form-group">
            <label>💡 Clue / Hint</label>
            <input
              type="text"
              value={hint}
              onChange={e => setHint(e.target.value)}
              placeholder="e.g. Think about the summer of 2018..."
              disabled={!isEnabled}
            />
            <small>A helpful hint if they get stuck.</small>
          </div>

          <div className="form-group">
            <label><HiOutlineClock /> Lock Until (Optional)</label>
            <input
              type="datetime-local"
              value={lockedUntil}
              onChange={e => setLockedUntil(e.target.value)}
              disabled={!isEnabled}
            />
            <small>The vault cannot be attempted before this time.</small>
          </div>
        </div>

        <button type="submit" className="admin-btn primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save Vault Configuration'}
        </button>
      </form>
    </div>
  );
}

export default VaultConfiguration;
