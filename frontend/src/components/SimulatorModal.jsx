import React, { useState, useEffect } from 'react';
import { X, Sliders, Play, Square, Send, AlertTriangle, CloudRain, Droplets, Zap } from 'lucide-react';
import { postSensorReading } from '../api/client';

export default function SimulatorModal({ isOpen, onClose, selectedZone, onReadingSent }) {
  const [waterLevel, setWaterLevel] = useState(20.0);
  const [rainfall, setRainfall] = useState(15.0);
  const [deviceId, setDeviceId] = useState('esp32-sim-01');
  const [zoneId, setZoneId] = useState(selectedZone || 'Z001');
  const [isSending, setIsSending] = useState(false);
  const [autoLoop, setAutoLoop] = useState(false);
  const [lastResponse, setLastResponse] = useState(null);

  useEffect(() => {
    if (selectedZone) setZoneId(selectedZone);
  }, [selectedZone]);

  // Auto-loop simulation
  useEffect(() => {
    let interval;
    if (autoLoop) {
      interval = setInterval(async () => {
        // Random slight perturbation
        setWaterLevel((prev) => {
          const delta = (Math.random() - 0.4) * 3;
          const next = Math.max(5, Math.min(prev + delta, 48));
          sendReading(next, rainfall);
          return next;
        });
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [autoLoop, rainfall, deviceId, zoneId]);

  if (!isOpen) return null;

  const sendReading = async (level = waterLevel, rain = rainfall) => {
    setIsSending(true);
    try {
      const payload = {
        device_id: deviceId,
        zone_id: zoneId,
        water_level_cm: parseFloat(level),
        rainfall_24h_mm: parseFloat(rain),
      };
      const res = await postSensorReading(payload);
      setLastResponse(res);
      if (onReadingSent) onReadingSent(res);
    } catch (err) {
      console.error('Simulator error:', err);
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const applyPreset = (lvl, rain) => {
    setWaterLevel(lvl);
    setRainfall(rain);
    sendReading(lvl, rain);
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
        maxWidth: '560px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
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
              <Sliders size={20} color="var(--color-cyan)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>ESP32 Live Sensor Simulator</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Test Early Warning alerts &amp; chart animations
              </p>
            </div>
          </div>

          <button onClick={onClose} style={{ color: 'var(--text-muted)', padding: '4px', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Sliders & Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Preset Buttons */}
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
              SCENARIO PRESETS:
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
              <button 
                onClick={() => applyPreset(8.0, 2.0)}
                className="btn-secondary"
                style={{ fontSize: '0.75rem', padding: '6px', justifyContent: 'center', border: '1px solid var(--border-medium)' }}
              >
                Safe (8cm)
              </button>
              <button 
                onClick={() => applyPreset(17.0, 35.0)}
                className="btn-secondary"
                style={{ fontSize: '0.75rem', padding: '6px', justifyContent: 'center', border: '1px solid var(--border-strong)' }}
              >
                Warning (17cm)
              </button>
              <button 
                onClick={() => applyPreset(23.5, 75.0)}
                className="btn-secondary"
                style={{ fontSize: '0.75rem', padding: '6px', justifyContent: 'center', border: '1px solid var(--alarm-border)' }}
              >
                Danger (23.5cm)
              </button>
              <button 
                onClick={() => applyPreset(27.0, 110.0)}
                className="btn-secondary"
                style={{ fontSize: '0.75rem', padding: '6px', justifyContent: 'center', border: '1px solid var(--alarm)' }}
              >
                Critical (27cm)
              </button>
            </div>
          </div>

          {/* Water Level Slider */}
          <div style={{
            background: 'var(--bg-surface-elevated)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Droplets size={16} color="var(--text-primary)" />
                Water Level (cm)
              </span>
              <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontSize: '1.1rem' }}>
                {Number(waterLevel).toFixed(1)} cm
              </strong>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="0.5"
              value={waterLevel}
              onChange={(e) => setWaterLevel(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--text-primary)', cursor: 'pointer' }}
            />
          </div>

          {/* 24h Rainfall Slider */}
          <div style={{
            background: 'var(--bg-surface-elevated)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CloudRain size={16} color="var(--text-secondary)" />
                24h Precipitation (mm)
              </span>
              <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                {Number(rainfall).toFixed(1)} mm
              </strong>
            </div>
            <input
              type="range"
              min="0"
              max="150"
              step="1"
              value={rainfall}
              onChange={(e) => setRainfall(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--text-secondary)', cursor: 'pointer' }}
            />
          </div>

          {/* Response summary */}
          {lastResponse && (
            <div style={{
              background: 'var(--accent-bg)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              fontSize: '0.8rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>Result: <strong>{lastResponse.risk_level}</strong> (Prob: {(lastResponse.flood_probability * 100).toFixed(1)}%)</span>
              <span style={{ color: 'var(--text-muted)' }}>HTTP 201 Ingested</span>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button
              onClick={() => sendReading()}
              disabled={isSending}
              className="btn-primary"
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <Send size={16} />
              {isSending ? 'Transmitting...' : 'Send Single Ingestion'}
            </button>

            <button
              onClick={() => setAutoLoop(!autoLoop)}
              className="btn-secondary"
              style={{
                background: autoLoop ? 'var(--alarm-bg)' : 'var(--bg-surface-elevated)',
                border: `1px solid `,
                color: autoLoop ? 'var(--alarm)' : 'var(--text-primary)'
              }}
            >
              {autoLoop ? <Square size={16} /> : <Play size={16} />}
              {autoLoop ? 'Stop Loop' : 'Auto Stream'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
