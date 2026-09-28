import React, { useState } from 'react';
import { X, Settings, Server, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { getBaseUrl, setBaseUrl, fetchHealth } from '../api/client';

export default function SettingsModal({ isOpen, onClose, refreshInterval, setRefreshInterval, onSettingsSaved }) {
  const [customUrl, setCustomUrl] = useState(getBaseUrl() || '');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  if (!isOpen) return null;

  const handleSave = () => {
    setBaseUrl(customUrl.trim());
    if (onSettingsSaved) onSettingsSaved();
    onClose();
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // Temporarily store to test
      const original = getBaseUrl();
      setBaseUrl(customUrl.trim());
      const res = await fetchHealth();
      setTestResult({ ok: true, msg: `Connected! ${res.system || 'FloodGuard Backend'} (${res.zones_loaded || 0} zones)` });
      setBaseUrl(original); // restore until saved
    } catch (err) {
      setTestResult({ ok: false, msg: `Failed: ${err.message}` });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(10, 10, 10, 0.6)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '20px'
    }}>
      <div className="glass-card" style={{
        maxWidth: '500px',
        width: '100%',
        padding: '28px',
        border: '1px solid var(--border-medium)',
        background: 'var(--bg-surface)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--accent-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Settings size={20} color="var(--color-cyan)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>Network &amp; API Settings</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Configure FastAPI backend endpoint &amp; sync rates
              </p>
            </div>
          </div>

          <button onClick={onClose} style={{ color: 'var(--text-muted)', padding: '4px', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Custom Backend URL */}
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
              Backend API Base URL (leave empty for default localhost / proxy)
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="http://10.144.108.16:8000"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                style={{
                  flex: 1,
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem'
                }}
              />
              <button onClick={handleTestConnection} disabled={testing} className="btn-secondary" style={{ fontSize: '0.8rem' }}>
                {testing ? 'Testing...' : 'Test'}
              </button>
            </div>
          </div>

          {/* Test connection result */}
          {testResult && (
            <div style={{
              background: testResult.ok ? 'var(--accent-bg)' : 'var(--alarm-bg)',
              border: `1px solid ${testResult.ok ? 'var(--border-medium)' : 'var(--alarm-border)'}`,
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              fontSize: '0.8rem',
              color: testResult.ok ? 'var(--text-primary)' : 'var(--alarm)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {testResult.ok ? <Check size={16} /> : <AlertCircle size={16} />}
              <span>{testResult.msg}</span>
            </div>
          )}

          {/* Polling Interval */}
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
              Auto-Sync Refresh Interval
            </label>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              style={{
                width: '100%',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px',
                color: 'var(--text-primary)',
                fontSize: '0.85rem'
              }}
            >
              <option value={1000} style={{ background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}>1 Second (Ultra-responsive)</option>
              <option value={2000} style={{ background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}>2 Seconds (Recommended)</option>
              <option value={3000} style={{ background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}>3 Seconds (Standard ESP32 Rate)</option>
              <option value={5000} style={{ background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}>5 Seconds (Power saving)</option>
            </select>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleSave} className="btn-primary">
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
