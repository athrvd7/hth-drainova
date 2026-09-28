import React from 'react';
import { Flame, X, Volume2, VolumeX } from 'lucide-react';

export default function CriticalAlertPopup({ alertData, onClose, onMuteToggle, isMuted }) {
  if (!alertData) return null;

  const { zoneId, waterLevel, trend, probability, observedAt } = alertData;
  const trendVelocity = Number(trend || 0) / 3600;
  const probabilityValue = Number(probability);
  const numericProbability = Number.isFinite(probabilityValue)
    ? Math.min(Math.max(probabilityValue, 0), 1)
    : 0;
  const observedDate = observedAt ? new Date(observedAt) : null;
  const observedLabel = observedDate && !Number.isNaN(observedDate.valueOf())
    ? observedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Live alarm';

  return (
    <div
      className="critical-alert"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      aria-labelledby="critical-alert-title"
      aria-describedby="critical-alert-description"
    >
      <div className="critical-alert__header">
        <div className="critical-alert__identity">
          <div className="critical-alert__icon" aria-hidden="true">
            <Flame size={20} strokeWidth={2.2} />
          </div>
          <div>
            <div className="critical-alert__eyebrow">
              <span>Critical alert</span>
              <span className="critical-alert__zone">Zone {zoneId || 'Z001'}</span>
            </div>
            <h2 id="critical-alert-title">Critical flood alert</h2>
          </div>
        </div>

        <button
          className="critical-alert__close"
          type="button"
          onClick={onClose}
          aria-label="Dismiss critical alert"
          title="Dismiss critical alert"
        >
          <X size={16} />
        </button>
      </div>

      <p id="critical-alert-description" className="critical-alert__message">
        Drainage capacity exceeded. Immediate evacuation advisory.
      </p>

      <div className="critical-alert__metrics" aria-label="Critical alert telemetry">
        <div className="critical-alert__metric">
          <span>Water level</span>
          <strong>{Number(waterLevel || 0).toFixed(1)} <small>cm</small></strong>
        </div>
        <div className="critical-alert__metric">
          <span>Rise rate</span>
          <strong className={trendVelocity > 0 ? 'is-rising' : ''}>
            {trendVelocity > 0 ? `+${trendVelocity.toFixed(2)}` : trendVelocity.toFixed(2)} <small>cm/s</small>
          </strong>
        </div>
        <div className="critical-alert__metric">
          <span>Flood probability</span>
          <strong>{(numericProbability * 100).toFixed(0)}<small>%</small></strong>
        </div>
      </div>

      <div className="critical-alert__footer">
        <button
          className={`critical-alert__siren${isMuted ? ' is-muted' : ''}`}
          type="button"
          onClick={onMuteToggle}
          aria-pressed={isMuted}
        >
          {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          <span>{isMuted ? 'Unmute siren' : 'Silence siren'}</span>
        </button>

        <div className="critical-alert__timestamp">
          <span>Observed</span>
          <time dateTime={observedAt || undefined}>{observedLabel}</time>
        </div>
      </div>
    </div>
  );
}
