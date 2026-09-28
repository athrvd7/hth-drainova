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
  Activity,
  Volume2,
  VolumeX,
  Globe
} from 'lucide-react';
import { sendCriticalPushNotification } from '../utils/notifications';
import { startContinuousBuzzer, stopContinuousBuzzer, setBuzzerMuted } from '../utils/buzzer';
import EarthGlobeClean from './EarthGlobeClean';

export default function HeroTelemetry({ latest, zoneInfo }) {
  const [isMuted, setIsMuted] = useState(false);
  const waterLevel = latest ? Number(latest.water_level_cm || 0) : 0;
  const trend = latest ? Number(latest.water_trend_cm_per_hour || 0) : 0;
  const trendVelocity = trend / 3600;
  const rainfall = latest ? Number(latest.rainfall_24h_mm || 0) : 0;
  const probability = latest ? Number(latest.flood_probability || 0) : 0;
  const aiRiskLevel = (latest?.risk_level || 'SAFE').toUpperCase();
  const geoScore = latest ? latest.geo_risk_score : (zoneInfo?.geo_risk_score || 50);
  const espStatus = (latest?.local_status || '').toUpperCase();
  const hasEspStatus = ['SAFE', 'WARNING', 'DANGER', 'CRITICAL'].includes(espStatus);
  const riskLevel = hasEspStatus ? espStatus : aiRiskLevel;
  const deviceId = latest?.device_id || 'esp32-01';
  const observedAt = latest?.observed_at ? new Date(latest.observed_at).toLocaleTimeString() : 'Awaiting data...';

  const MAX_DEPTH = 50.0;
  const fillPercentage = Math.min(Math.max((waterLevel / MAX_DEPTH) * 100, 4), 100);

  // Risk is encoded by contrast and fill weight, not hue. The alarm colour is
  // reserved for DANGER and CRITICAL so an emergency is never ambiguous.
  const getRiskTheme = () => {
    switch (riskLevel) {
      case 'CRITICAL':
        return {
          badgeClass: 'badge-critical',
          color: 'var(--status-critical)',
          waterFill: 'var(--alarm)',
          advisory: 'CRITICAL: Drainage capacity exceeded. Immediate flood mitigation protocol active.',
          icon: <Flame size={18} />
        };
      case 'DANGER':
        return {
          badgeClass: 'badge-danger',
          color: 'var(--status-danger)',
          waterFill: 'var(--alarm-bg)',
          advisory: 'DANGER: Water levels approaching critical threshold. Municipal pumps active.',
          icon: <AlertTriangle size={18} />
        };
      case 'WARNING':
        return {
          badgeClass: 'badge-warning',
          color: 'var(--status-warning-strong)',
          waterFill: 'var(--text-primary)',
          advisory: 'WARNING: Elevated drainage flow. Continuous monitoring in effect.',
          icon: <AlertTriangle size={18} />
        };
      default:
        return {
          badgeClass: 'badge-safe',
          color: 'var(--status-safe)',
          waterFill: 'var(--text-muted)',
          advisory: 'NORMAL: Drainage operating within safe parameters.',
          icon: <CheckCircle size={18} />
        };
    }
  };

  const theme = getRiskTheme();

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

  const badgeFor = (status) => {
    switch (status) {
      case 'CRITICAL': return 'badge-critical';
      case 'DANGER': return 'badge-danger';
      case 'WARNING': return 'badge-warning';
      default: return 'badge-safe';
    }
  };

  // Nagpur coordinates for globe marker
  const nagpurMarker = {
    lat: 21.1458,
    lng: 79.0882,
    // Greyscale marker until the state is actually an emergency, then alarm red.
    color: riskLevel === 'CRITICAL' || riskLevel === 'DANGER' ? 0xff453a :
           riskLevel === 'WARNING' ? 0xf2f2f2 :
           0x8c8c8c,
    label: 'Nagpur'
  };

  return (
    <div className="hero-telemetry" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      {/* Alert Banner - More spacious */}
      <div className="telemetry-advisory" style={{
        background: riskLevel === 'CRITICAL' ? 'var(--status-critical-bg)' :
                    riskLevel === 'DANGER' ? 'var(--status-danger-bg)' :
                    riskLevel === 'WARNING' ? 'var(--status-warning-bg)' :
                    'var(--status-safe-bg)',
        border: `1px solid ${theme.color}`,
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-lg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 'var(--space-md)'
      }}>
        <div className="telemetry-advisory__body" style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-md)' }}>
          <div style={{ color: theme.color, marginTop: '2px' }}>
            {theme.icon}
          </div>
          <div>
            <div style={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: theme.color,
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-md)',
              marginBottom: 'var(--space-xs)'
            }}>
              <span>Zone {latest?.zone_id || 'Z001'}</span>
              {riskLevel === 'CRITICAL' && (
                <button
                  onClick={handleToggleMute}
                  style={{
                    background: isMuted ? 'var(--accent-bg)' : 'var(--status-critical-bg)',
                    border: `1px solid ${theme.color}`,
                    color: theme.color,
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  title={isMuted ? 'Unmute Siren' : 'Silence Siren'}
                >
                  {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                  {isMuted ? 'Muted' : 'Siren Active'}
                </button>
              )}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {theme.advisory}
            </div>
          </div>
        </div>

        <div className="telemetry-advisory__meta" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          <span className={`badge ${theme.badgeClass}`}>
            {riskLevel}
          </span>
          {hasEspStatus && aiRiskLevel !== espStatus && (
            <span className={`badge ${badgeFor(aiRiskLevel)}`}>
              AI {aiRiskLevel}
            </span>
          )}
          <span style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-xs)'
          }}>
            <Clock size={12} /> {observedAt}
          </span>
        </div>
      </div>

      {/* Globe Hero Section */}
      <div className="glass-card hero-globe-card" style={{ padding: 'var(--space-xl)' }}>
        {/* Globe Visualization */}
        <div className="globe-stage">
          <div className="globe-stage__header">
            <Globe size={16} color="var(--text-secondary)" />
            <h3>Global Monitoring</h3>
          </div>

          <div className="globe-canvas">
            <EarthGlobeClean autoRotate={true} markers={[nagpurMarker]} />
          </div>

          <div className="globe-stage__location">
            <div>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: theme.color,
                boxShadow: `0 0 8px ${theme.color}`
              }} />
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Nagpur, India
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                21.1458°N, 79.0882°E
              </span>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="hero-globe-summary" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div>
            <div style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              marginBottom: 'var(--space-sm)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Real-Time Status
            </div>
            <div style={{
              fontSize: '2.5rem',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              color: theme.color,
              lineHeight: 1,
              letterSpacing: '0',
              marginBottom: 'var(--space-md)'
            }}>
              {waterLevel.toFixed(1)} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>cm</span>
            </div>
            <div style={{
              height: '8px',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden',
              marginBottom: 'var(--space-lg)'
            }}>
              <div style={{
                width: `${fillPercentage}%`,
                height: '100%',
                background: theme.color,
                borderRadius: 'var(--radius-full)',
                transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
              }} />
            </div>
          </div>

          <div className="hero-quick-stats" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 'var(--space-md)'
          }}>
            <QuickStat
              label="Flood Risk"
              value={`${(probability * 100).toFixed(0)}%`}
              color={theme.color}
            />
            <QuickStat
              label="Capacity"
              value={`${fillPercentage.toFixed(0)}%`}
              color="var(--text-primary)"
            />
            <QuickStat
              label="Water Trend Velocity"
              value={`${trendVelocity > 0 ? '+' : ''}${trendVelocity.toFixed(2)}`}
              unit="cm/s"
              color={trendVelocity > 0 ? 'var(--status-critical)' : trendVelocity < 0 ? 'var(--status-safe)' : 'var(--text-secondary)'}
            />
            <QuickStat
              label="24h Rain"
              value={rainfall.toFixed(1)}
              unit="mm"
              color="var(--accent-dim)"
            />
          </div>
        </div>
      </div>

      {/* Main Grid - More generous spacing */}
      <div className="telemetry-detail-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: 'var(--space-lg)'
      }}>
        {/* Water Level Card - Cleaner layout */}
        <div className="glass-card telemetry-detail-card telemetry-detail-card--water" style={{ padding: 'var(--space-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
                <Droplets size={16} color="var(--text-secondary)" />
                <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Water Level
                </h3>
              </div>
              <div style={{
                fontSize: '3rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: theme.color,
                lineHeight: 1,
                letterSpacing: '0'
              }}>
                {waterLevel.toFixed(1)} <span style={{ fontSize: '1.25rem', color: 'var(--text-muted)', fontWeight: 500 }}>cm</span>
              </div>
            </div>
            <span style={{
              fontSize: '0.6875rem',
              color: 'var(--text-muted)',
              background: 'var(--bg-surface-elevated)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-subtle)'
            }}>
              Max 50 cm
            </span>
          </div>

          {/* Tank Visual - Refined */}
          <div className="water-level-details" style={{ display: 'flex', gap: 'var(--space-xl)', alignItems: 'center' }}>
            <div className="water-tank" style={{
              width: '80px',
              height: '220px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end'
            }}>
              {/* Threshold markers - minimal */}
              {[
                { level: 25, label: 'CRIT', color: 'var(--status-critical)' },
                { level: 22, label: 'DANG', color: 'var(--status-danger)' },
                { level: 15, label: 'WARN', color: 'var(--status-warning)' }
              ].map(({ level, label, color }) => (
                <div key={level} style={{
                  position: 'absolute',
                  top: `${100 - (level / MAX_DEPTH) * 100}%`,
                  left: 0,
                  right: 0,
                  borderTop: `1px dashed ${color}`,
                  opacity: 0.4,
                  zIndex: 10
                }}>
                  <span style={{
                    fontSize: '0.5rem',
                    color,
                    position: 'absolute',
                    right: '6px',
                    top: '-10px',
                    fontWeight: 600,
                    opacity: 0.7
                  }}>
                    {level}
                  </span>
                </div>
              ))}

              {/* Water fill */}
              <div style={{
                height: `${fillPercentage}%`,
                width: '100%',
                background: theme.waterFill,
                position: 'relative',
                transition: 'height 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '2px',
                  background: 'var(--bg-surface)'
                }} />
              </div>
            </div>

            {/* Metrics - Cleaner grid */}
            <div className="water-tank-metrics" style={{ flex: 1, display: 'grid', gap: 'var(--space-md)' }}>
              <div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: 'var(--space-xs)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Capacity
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {fillPercentage.toFixed(0)}<span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>%</span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: 'var(--space-xs)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Headroom
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  {Math.max(MAX_DEPTH - waterLevel, 0).toFixed(1)} cm
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Risk Engine - Cleaner metrics */}
        <div className="glass-card telemetry-detail-card telemetry-detail-card--risk" style={{ padding: 'var(--space-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
                <Activity size={16} color="var(--text-secondary)" />
                <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  AI Risk Analysis
                </h3>
              </div>
              <div style={{
                fontSize: '3rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: theme.color,
                lineHeight: 1,
                letterSpacing: '0'
              }}>
                {(probability * 100).toFixed(1)}<span style={{ fontSize: '1.25rem', color: 'var(--text-muted)', fontWeight: 500 }}>%</span>
              </div>
            </div>
            <span className={`badge ${theme.badgeClass}`}>
              {riskLevel}
            </span>
          </div>

          {/* Probability bar - minimal */}
          <div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Flood Probability
            </div>
            <div style={{
              height: '6px',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <div style={{
                width: `${Math.min(probability * 100, 100)}%`,
                height: '100%',
                background: theme.color,
                borderRadius: 'var(--radius-full)',
                transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
              }} />
            </div>
          </div>

          {/* Metrics Grid - More spacious */}
          <div className="risk-metrics-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 'var(--space-md)'
          }}>
            <MetricCard
              icon={trendVelocity > 0 ? <TrendingUp size={14} /> : trendVelocity < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
              label="Water Trend Velocity"
              value={`${trendVelocity > 0 ? '+' : ''}${trendVelocity.toFixed(2)}`}
              unit="cm/s"
              color={trendVelocity > 0 ? 'var(--status-critical)' : trendVelocity < 0 ? 'var(--status-safe)' : 'var(--text-secondary)'}
            />
            <MetricCard
              icon={<Activity size={14} />}
              label="Geo Risk"
              value={geoScore}
              unit="/100"
              color="var(--text-primary)"
            />
            <MetricCard
              icon={<CloudRain size={14} />}
              label="24h Rain"
              value={rainfall.toFixed(1)}
              unit="mm"
              color="var(--accent-dim)"
            />
            <MetricCard
              icon={<Radio size={14} />}
              label="Device"
              value={deviceId}
              unit=""
              color="var(--status-safe)"
              mono={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Quick stat component for globe section
function QuickStat({ label, value, unit, color }) {
  return (
    <div className="quick-stat" style={{
      background: 'var(--bg-surface-elevated)',
      padding: 'var(--space-md)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-subtle)'
    }}>
      <div style={{
        fontSize: '0.6875rem',
        color: 'var(--text-muted)',
        marginBottom: 'var(--space-xs)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '1.5rem',
        fontWeight: 700,
        fontFamily: 'var(--font-mono)',
        color,
        lineHeight: 1
      }}>
        {value}{unit && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '2px' }}>{unit}</span>}
      </div>
    </div>
  );
}

// Extracted metric card component for consistency
function MetricCard({ icon, label, value, unit, color, mono = false }) {
  return (
    <div className="metric-stat" style={{
      background: 'var(--bg-surface-elevated)',
      padding: 'var(--space-md)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-subtle)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-xs)',
        fontSize: '0.6875rem',
        color: 'var(--text-muted)',
        marginBottom: 'var(--space-sm)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        <span style={{ color }}>{icon}</span>
        {label}
      </div>
      <div style={{
        fontSize: mono ? '0.875rem' : '1.25rem',
        fontWeight: mono ? 600 : 700,
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-mono)',
        color,
        wordBreak: 'break-all'
      }}>
        {value}{unit && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '2px' }}>{unit}</span>}
      </div>
    </div>
  );
}
