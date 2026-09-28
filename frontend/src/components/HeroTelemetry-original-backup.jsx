import React, { useRef, useEffect, useState } from 'react';
import { 
  Droplets, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  CloudRain, 
  AlertTriangle, 
  CheckCircle, 
  Flame, 
  Radio,
  Clock,
  Zap,
  Volume2,
  VolumeX
} from 'lucide-react';
import { sendCriticalPushNotification } from '../utils/notifications';
import { startContinuousBuzzer, stopContinuousBuzzer, setBuzzerMuted } from '../utils/buzzer';

export default function HeroTelemetry({ latest, zoneInfo }) {
  const [isMuted, setIsMuted] = useState(false);
  const waterLevel = latest ? Number(latest.water_level_cm || 0) : 0;
  const trend = latest ? Number(latest.water_trend_cm_per_hour || 0) : 0;
  const rainfall = latest ? Number(latest.rainfall_24h_mm || 0) : 0;
  const probability = latest ? Number(latest.flood_probability || 0) : 0;
  const aiRiskLevel = (latest?.risk_level || 'SAFE').toUpperCase();
  const geoScore = latest ? latest.geo_risk_score : (zoneInfo?.geo_risk_score || 50);
  const espStatus = (latest?.local_status || '').toUpperCase();
  const hasEspStatus = ['SAFE', 'WARNING', 'DANGER', 'CRITICAL'].includes(espStatus);
  // Prefer the ESP32's own locally-computed status; fall back to the backend AI risk level.
  const riskLevel = hasEspStatus ? espStatus : aiRiskLevel;
  const deviceId = latest?.device_id || 'esp32-01';
  const observedAt = latest?.observed_at ? new Date(latest.observed_at).toLocaleTimeString() : 'Awaiting data...';

  // Tank calculations: sensor height is 50cm
  const MAX_DEPTH = 50.0;
  const fillPercentage = Math.min(Math.max((waterLevel / MAX_DEPTH) * 100, 4), 100);

  // Status visual styles
  const getRiskTheme = () => {
    switch (riskLevel) {
      case 'CRITICAL':
        return {
          badgeClass: 'badge-critical',
          color: '#ef4444',
          glow: 'rgba(239, 68, 68, 0.4)',
          waterGradient: 'linear-gradient(180deg, #ef4444 0%, #991b1b 100%)',
          advisory: 'CRITICAL ALERT: Drainage capacity exceeded. Immediate flash flood mitigation and evacuation protocol activated.',
          icon: <Flame size={20} color="#ef4444" />
        };
      case 'DANGER':
        return {
          badgeClass: 'badge-danger',
          color: '#f97316',
          glow: 'rgba(249, 115, 22, 0.35)',
          waterGradient: 'linear-gradient(180deg, #f97316 0%, #c2410c 100%)',
          advisory: 'DANGER: Water levels approaching street curb crest. Municipal pumps triggered.',
          icon: <AlertTriangle size={20} color="#f97316" />
        };
      case 'WARNING':
        return {
          badgeClass: 'badge-warning',
          color: '#f59e0b',
          glow: 'rgba(245, 158, 11, 0.3)',
          waterGradient: 'linear-gradient(180deg, #f59e0b 0%, #b45309 100%)',
          advisory: 'WARNING: Elevated drainage flow detected. Continuous monitoring in effect.',
          icon: <AlertTriangle size={20} color="#f59e0b" />
        };
      default:
        return {
          badgeClass: 'badge-safe',
          color: '#10b981',
          glow: 'rgba(16, 185, 129, 0.25)',
          waterGradient: 'linear-gradient(180deg, #ffffff 0%, #1a1a1a 100%)',
          advisory: 'NORMAL: Drainage channel operating within safe baseline parameters.',
          icon: <CheckCircle size={20} color="#10b981" />
        };
    }
  };

  const theme = getRiskTheme();

  // Continuous Siren & Push Notification Management:
  // Starts continuous buzzing when CRITICAL and keeps buzzing until status changes to any other state.
  const prevRisk = useRef(null);
  useEffect(() => {
    if (riskLevel === 'CRITICAL') {
      startContinuousBuzzer();
      if (prevRisk.current !== 'CRITICAL') {
        setIsMuted(false);
        sendCriticalPushNotification(latest?.zone_id || 'Z001', { waterLevel, trend, probability });
      }
    } else {
      stopContinuousBuzzer();
      setIsMuted(false);
    }
    prevRisk.current = riskLevel;
  }, [riskLevel, latest, waterLevel, trend, probability]);

  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      setBuzzerMuted(next);
      return next;
    });
  };

  // Badge class for any status level (used for the secondary AI badge)
  const badgeFor = (status) => {
    switch (status) {
      case 'CRITICAL': return 'badge-critical';
      case 'DANGER': return 'badge-danger';
      case 'WARNING': return 'badge-warning';
      default: return 'badge-safe';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Alert Advisory Banner */}
      <div style={{
        background: `rgba(${riskLevel === 'CRITICAL' ? '239, 68, 68, 0.12' : riskLevel === 'DANGER' ? '249, 115, 22, 0.12' : riskLevel === 'WARNING' ? '245, 158, 11, 0.1' : '16, 185, 129, 0.08'})`,
        border: `1px solid ${theme.color}`,
        borderRadius: 'var(--radius-md)',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: `0 0 16px ${theme.glow}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {theme.icon}
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: theme.color, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>{riskLevel} FLOOD ADVISORY &mdash; ZONE {latest?.zone_id || 'Z001'}</span>
              {riskLevel === 'CRITICAL' && (
                <button
                  onClick={handleToggleMute}
                  style={{
                    background: isMuted ? 'rgba(255,255,255,0.1)' : 'rgba(239, 68, 68, 0.25)',
                    border: '1px solid #ef4444',
                    color: '#ef4444',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.2s ease'
                  }}
                  title={isMuted ? 'Unmute Siren' : 'Silence Siren'}
                >
                  {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                  {isMuted ? 'Siren Muted' : 'Siren Active (Click to Silence)'}
                </button>
              )}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {theme.advisory}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span
            className={`badge ${theme.badgeClass}`}
            title={hasEspStatus ? 'Status computed locally by the ESP32 sensor node' : 'Backend AI risk level'}
          >
            {riskLevel}
          </span>
          {hasEspStatus && aiRiskLevel !== espStatus && (
            <span className={`badge ${badgeFor(aiRiskLevel)}`}>
              AI: {aiRiskLevel}
            </span>
          )}
          <span style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Clock size={12} /> {observedAt}
          </span>
        </div>
      </div>

      {/* Main Grid: Water Tank & AI Risk Engine */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px'
      }}>
        {/* Card 1: Interactive Water Level Tank */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Droplets size={20} color="var(--color-cyan)" />
              <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>Drainage Water Level</h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Max: 50.0 cm
            </span>
          </div>

          {/* Tank Visualizer */}
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flex: 1 }}>
            {/* Visual Tank Column */}
            <div style={{
              width: '100px',
              height: '240px',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '2px solid var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)'
            }}>
              {/* Threshold Lines */}
              <div style={{
                position: 'absolute',
                top: `${100 - (25 / MAX_DEPTH) * 100}%`,
                left: 0,
                right: 0,
                borderTop: '1px dashed #ef4444',
                zIndex: 10
              }}>
                <span style={{ fontSize: '0.55rem', color: '#ef4444', position: 'absolute', right: '4px', top: '-12px', fontWeight: 700 }}>25cm CRIT</span>
              </div>
              <div style={{
                position: 'absolute',
                top: `${100 - (22 / MAX_DEPTH) * 100}%`,
                left: 0,
                right: 0,
                borderTop: '1px dashed #f97316',
                zIndex: 10
              }}>
                <span style={{ fontSize: '0.55rem', color: '#f97316', position: 'absolute', right: '4px', top: '-12px', fontWeight: 700 }}>22cm DANG</span>
              </div>
              <div style={{
                position: 'absolute',
                top: `${100 - (15 / MAX_DEPTH) * 100}%`,
                left: 0,
                right: 0,
                borderTop: '1px dashed #f59e0b',
                zIndex: 10
              }}>
                <span style={{ fontSize: '0.55rem', color: '#f59e0b', position: 'absolute', right: '4px', top: '-12px', fontWeight: 700 }}>15cm WARN</span>
              </div>

              {/* Water Liquid Fill */}
              <div style={{
                height: `${fillPercentage}%`,
                width: '100%',
                background: theme.waterGradient,
                position: 'relative',
                transition: 'height 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: `0 0 25px ${theme.glow}`
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'rgba(255, 255, 255, 0.8)',
                  boxShadow: '0 0 8px #fff'
                }} />
              </div>
            </div>

            {/* Readout Numbers */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Current Depth
                </span>
                <div style={{
                  fontSize: '2.5rem',
                  fontWeight: 900,
                  fontFamily: 'var(--font-mono)',
                  color: theme.color,
                  lineHeight: 1.1
                }}>
                  {waterLevel.toFixed(1)} <span style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>cm</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{
                  background: 'var(--bg-surface-elevated)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>DRAIN CAPACITY</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    {fillPercentage.toFixed(0)}%
                  </div>
                </div>

                <div style={{
                  background: 'var(--bg-surface-elevated)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>HEADROOM</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    {Math.max(MAX_DEPTH - waterLevel, 0).toFixed(1)} cm
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: AI Flood Risk Engine */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={20} color="var(--color-purple)" />
              <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>AI Flood Early Warning</h3>
            </div>
            <span className={`badge ${theme.badgeClass}`}>
              {riskLevel}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, justifyContent: 'center' }}>
            {/* Probability Progress */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Calculated Flood Probability</span>
                <span style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  color: theme.color
                }}>
                  {(probability * 100).toFixed(1)}%
                </span>
              </div>
              <div style={{
                height: '12px',
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 'var(--radius-full)',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  width: `${Math.min(probability * 100, 100)}%`,
                  height: '100%',
                  background: theme.waterGradient,
                  borderRadius: 'var(--radius-full)',
                  transition: 'width 0.8s ease',
                  boxShadow: `0 0 12px ${theme.glow}`
                }} />
              </div>
            </div>

            {/* Quick Metrics Matrix */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px'
            }}>
              {/* Trend Velocity */}
              <div style={{
                background: 'var(--bg-surface-elevated)',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {trend > 0 ? (
                    <TrendingUp size={14} color="#ef4444" />
                  ) : trend < 0 ? (
                    <TrendingDown size={14} color="#10b981" />
                  ) : (
                    <Minus size={14} color="var(--text-muted)" />
                  )}
                  Water Trend Velocity
                </div>
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  color: trend > 0 ? '#ef4444' : trend < 0 ? '#10b981' : '#fff',
                  marginTop: '4px'
                }}>
                  {trend > 0 ? `+${trend.toFixed(1)}` : trend.toFixed(1)} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>cm/hr</span>
                </div>
              </div>

              {/* Geo-Risk Index */}
              <div style={{
                background: 'var(--bg-surface-elevated)',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <Zap size={14} color="#ffffff" />
                  Nagpur Geo-Risk Score
                </div>
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  color: '#ffffff',
                  marginTop: '4px'
                }}>
                  {geoScore} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>/ 100</span>
                </div>
              </div>

              {/* 24h Rainfall */}
              <div style={{
                background: 'var(--bg-surface-elevated)',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <CloudRain size={14} color="#cccccc" />
                  24h Precipitation
                </div>
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  color: '#cccccc',
                  marginTop: '4px'
                }}>
                  {rainfall.toFixed(1)} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>mm</span>
                </div>
              </div>

              {/* ESP32 Hardware Node */}
              <div style={{
                background: 'var(--bg-surface-elevated)',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <Radio size={14} color="#10b981" />
                  Active Ingestion Node
                </div>
                <div style={{
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-primary)',
                  marginTop: '4px'
                }}>
                  {deviceId}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
