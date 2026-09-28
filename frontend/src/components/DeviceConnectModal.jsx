import React, { useState } from 'react';
import { X, Cpu, Copy, Check, Wifi, Terminal, AlertCircle } from 'lucide-react';

export default function DeviceConnectModal({ isOpen, onClose }) {
  const [copiedSection, setCopiedSection] = useState(null);

  if (!isOpen) return null;

  const backendIp = '10.73.209.8';
  const backendPort = '8000';
  const backendUrl = `http://${backendIp}:${backendPort}/api/readings`;

  const codeSnippet = `// ==================================================
// WI-FI & BACKEND SETTINGS IN floodguard_esp32.ino
// ==================================================
const char *ssid = "Galaxy M35 5G 002A";      // Hotspot / Wi-Fi name
const char *password = "1234567809";          // Hotspot password

const char *backendUrl = "${backendUrl}";
const char *deviceId = "esp32-01";
const char *zoneId = "Z001";`;

  const curlSnippet = `curl -X POST "${backendUrl}" ^
  -H "Content-Type: application/json" ^
  -d "{\\"device_id\\": \\"esp32-01\\", \\"zone_id\\": \\"Z001\\", \\"water_level_cm\\": 24.5, \\"rainfall_24h_mm\\": 15.0}"`;

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(key);
    setTimeout(() => setCopiedSection(null), 2000);
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
        maxWidth: '680px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '28px',
        border: '1px solid var(--border-medium)',
        background: 'var(--bg-surface)'
      }}>
        {/* Modal Header */}
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
              <Cpu size={20} color="var(--color-cyan)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>ESP32 Node Connection Guide</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                How to link external ESP32 sensor hardware to this backend
              </p>
            </div>
          </div>

          <button onClick={onClose} style={{ color: 'var(--text-muted)', padding: '4px', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Step-by-Step Instructions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Step 1 */}
          <div style={{
            background: 'var(--bg-surface-elevated)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{
                background: 'var(--accent)',
                color: 'var(--bg-primary)',
                fontSize: '0.75rem',
                fontWeight: 800,
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>1</span>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Join the Same Wi-Fi / Mobile Hotspot</h4>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Both this backend laptop and the ESP32 (running from another computer) must be on the same network:
            </p>
            <div style={{ marginTop: '8px', display: 'flex', gap: '12px', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Hotspot SSID:</span>
              <strong style={{ color: 'var(--text-primary)' }}>Galaxy M35 5G 002A</strong>
            </div>
          </div>

          {/* Step 2 */}
          <div style={{
            background: 'var(--bg-surface-elevated)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  background: 'var(--accent)',
                  color: 'var(--bg-primary)',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>2</span>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Update ESP32 Firmware Code</h4>
              </div>
              <button 
                onClick={() => copyToClipboard(codeSnippet, 'arduino')}
                className="btn-secondary"
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
              >
                {copiedSection === 'arduino' ? <Check size={12} color="var(--text-primary)" /> : <Copy size={12} />}
                {copiedSection === 'arduino' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre style={{
              background: 'var(--bg-secondary)',
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-primary)',
              overflowX: 'auto'
            }}>
              {codeSnippet}
            </pre>
          </div>

          {/* Step 3: Curl verification */}
          <div style={{
            background: 'var(--bg-surface-elevated)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={16} color="var(--text-secondary)" />
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Test From Another Terminal</h4>
              </div>
              <button 
                onClick={() => copyToClipboard(curlSnippet, 'curl')}
                className="btn-secondary"
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
              >
                {copiedSection === 'curl' ? <Check size={12} color="var(--text-primary)" /> : <Copy size={12} />}
                {copiedSection === 'curl' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre style={{
              background: 'var(--bg-secondary)',
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-secondary)',
              overflowX: 'auto'
            }}>
              {curlSnippet}
            </pre>
          </div>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn-primary">
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
