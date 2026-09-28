import React from 'react';
import { Compass } from 'lucide-react';

export default function MapCompass({
  angle = 0,
  headingDeg = 0,
  cardinal = 'N',
  interactive = false,
  onResetNorth,
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        zIndex: 10,
        userSelect: 'none',
      }}
    >
      <button
        onClick={onResetNorth}
        title={interactive ? `Heading: ${headingDeg}° ${cardinal} · Click to reset North` : 'Grid aligned North'}
        style={{
          width: '54px',
          height: '54px',
          borderRadius: '50%',
          background: 'var(--bg-surface-glass)',
          border: '1.5px solid var(--border-medium)',
          boxShadow: 'var(--shadow-card)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: interactive ? 'pointer' : 'default',
          transition: 'transform 0.15s ease, border-color 0.2s ease, box-shadow 0.2s ease',
          padding: 0,
        }}
        onMouseEnter={(e) => {
          if (interactive) {
            e.currentTarget.style.transform = 'scale(1.06)';
            e.currentTarget.style.borderColor = 'var(--color-cyan)';
            e.currentTarget.style.boxShadow = 'var(--shadow-card), var(--shadow-glow-cyan)';
          }
        }}
        onMouseLeave={(e) => {
          if (interactive) {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.borderColor = 'var(--border-medium)';
            e.currentTarget.style.boxShadow = 'var(--shadow-card)';
          }
        }}
      >
        <svg
          viewBox="0 0 100 100"
          style={{
            width: '44px',
            height: '44px',
            transform: `rotate(${angle}deg)`,
            transition: 'transform 0.1s linear',
          }}
        >
          {/* Compass outer bezel markings */}
          <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" />
          <circle cx="50" cy="50" r="41" fill="none" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="0.8" strokeDasharray="2 3" />

          {/* Cardinal tick marks */}
          <line x1="50" y1="4" x2="50" y2="10" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="96" y1="50" x2="90" y2="50" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
          <line x1="50" y1="96" x2="50" y2="90" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
          <line x1="4" y1="50" x2="10" y2="50" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />

          {/* Sub-cardinal tick marks */}
          <line x1="17.5" y1="17.5" x2="22" y2="22" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <line x1="82.5" y1="17.5" x2="78" y2="22" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <line x1="82.5" y1="82.5" x2="78" y2="78" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <line x1="17.5" y1="82.5" x2="22" y2="78" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />

          {/* Compass Needle - North (Red) */}
          <polygon
            points="50,14 43,47 50,44"
            fill="#ef4444"
            filter="drop-shadow(0 0 4px rgba(239, 68, 68, 0.6))"
          />
          <polygon
            points="50,14 57,47 50,44"
            fill="#dc2626"
            filter="drop-shadow(0 0 4px rgba(239, 68, 68, 0.6))"
          />

          {/* Compass Needle - South (Muted/Silver) */}
          <polygon points="50,86 43,53 50,56" fill="#64748b" />
          <polygon points="50,86 57,53 50,56" fill="#475569" />

          {/* Cardinal Labels */}
          <text
            x="50"
            y="25"
            textAnchor="middle"
            dominantBaseline="central"
            fill="#ef4444"
            fontSize="11"
            fontWeight="900"
            fontFamily="var(--font-heading), sans-serif"
            style={{ textShadow: '0 0 6px rgba(239,68,68,0.7)' }}
          >
            N
          </text>
          <text
            x="50"
            y="75"
            textAnchor="middle"
            dominantBaseline="central"
            fill="#64748b"
            fontSize="9"
            fontWeight="700"
            fontFamily="var(--font-sans), sans-serif"
          >
            S
          </text>
          <text
            x="76"
            y="50"
            textAnchor="middle"
            dominantBaseline="central"
            fill="#94a3b8"
            fontSize="9"
            fontWeight="700"
            fontFamily="var(--font-sans), sans-serif"
          >
            E
          </text>
          <text
            x="24"
            y="50"
            textAnchor="middle"
            dominantBaseline="central"
            fill="#94a3b8"
            fontSize="9"
            fontWeight="700"
            fontFamily="var(--font-sans), sans-serif"
          >
            W
          </text>

          {/* Center Hub */}
          <circle cx="50" cy="50" r="5" fill="#111111" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="50" cy="50" r="2" fill="#ffffff" />
        </svg>
      </button>

      {/* Heading Badge */}
      <div
        style={{
          background: 'var(--bg-surface-glass)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '2px 8px',
          fontSize: '0.68rem',
          fontWeight: 700,
          fontFamily: 'var(--font-mono), monospace',
          color: 'var(--color-cyan)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          boxShadow: 'var(--shadow-card)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        <span>{interactive ? `${String(headingDeg).padStart(3, '0')}° ${cardinal}` : 'NORTH'}</span>
      </div>
    </div>
  );
}
