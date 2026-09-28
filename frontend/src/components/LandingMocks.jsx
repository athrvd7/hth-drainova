import React from 'react';
import { Droplets, Activity, TrendingUp, MapPin, Search, Download, Box } from 'lucide-react';

// Hero dashboard preview — mini version of live telemetry, not a fake rectangle
export function HeroMock() {
  return (
    <div className="lp-mock lp-mock-hero">
      <div className="lp-mock-top">
        <span className="lp-mock-zone">Z001 • Nagpur Central</span>
        <span className="lp-mock-badge lp-mock-badge-safe">SAFE</span>
        <span className="lp-mock-time">14:32:18</span>
        <span className="lp-mock-live"><i /> Live</span>
      </div>
      <div className="lp-mock-hero-grid">
        <div className="lp-mock-card">
          <div className="lp-mock-label"><Droplets size={12} /> Water Level</div>
          <div className="lp-mock-value">42.0 <span>cm</span></div>
          <div className="lp-mock-bar"><span style={{ width: '42%' }} /></div>
          <div className="lp-mock-meta"><span>Capacity 42%</span><span>Headroom 8.0 cm</span></div>
          <div className="lp-mock-tank">
            <div className="lp-mock-tank-fill" style={{ height: '42%' }} />
            <span className="lp-mock-tank-mark" style={{ bottom: '50%' }}><em>25</em></span>
          </div>
        </div>
        <div className="lp-mock-stats">
          <div className="lp-mock-stat">
            <span><TrendingUp size={11} /> Trend</span>
            <strong>+0.4 <em>cm/h</em></strong>
          </div>
          <div className="lp-mock-stat">
            <span><Activity size={11} /> Flood Risk</span>
            <strong>12.4<em>%</em></strong>
          </div>
          <div className="lp-mock-stat">
            <span>Geo Score</span>
            <strong>38<em>/100</em></strong>
          </div>
          <div className="lp-mock-stat">
            <span>24h Rain</span>
            <strong>04.2<em>mm</em></strong>
          </div>
        </div>
      </div>
      <div className="lp-mock-chart-card">
        <div className="lp-mock-chart-head">
          <span><Activity size={12} /> Level &amp; risk — last 24 readings</span>
          <span className="lp-mono">Z001</span>
        </div>
        <svg viewBox="0 0 400 80" className="lp-mock-spark">
          <defs>
            <linearGradient id="lpGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fafafa" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#fafafa" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1="0" y1="60" x2="400" y2="60" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <line x1="0" y1="30" x2="400" y2="30" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 4" />
          <path d="M0 52 C 40 48, 80 58, 110 44 C 150 28, 180 35, 210 38 C 250 42, 290 18, 330 24 C 360 28, 385 36, 400 32" fill="none" stroke="#fafafa" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
          <path d="M0 52 C 40 48, 80 58, 110 44 C 150 28, 180 35, 210 38 C 250 42, 290 18, 330 24 C 360 28, 385 36, 400 32 L 400 80 L 0 80 Z" fill="url(#lpGrad)" />
          <path d="M0 68 C 60 66, 120 70, 180 62 C 240 54, 300 58, 400 48" fill="none" stroke="#ff453a" strokeWidth="1.2" strokeDasharray="0" opacity="0.9" />
          <circle cx="330" cy="24" r="3" fill="#fafafa" stroke="#09090b" strokeWidth="1.5" />
          <circle cx="210" cy="38" r="2.2" fill="#fafafa" opacity="0.9" />
        </svg>
        <div className="lp-mock-chart-foot">
          <span>00:14</span><span>04:22</span><span>08:40</span><span>14:32 now</span>
        </div>
      </div>
    </div>
  );
}

export function TelemetryMock() {
  return (
    <div className="lp-mock lp-mock-telemetry">
      <div className="lp-mock-head">
        <span className="lp-mock-title"><Activity size={13} /> Real-Time Water Level &amp; Risk Trends</span>
        <span className="lp-mock-count">24 Telemetry Records</span>
      </div>
      <div className="lp-mock-chart-card" style={{ marginTop: 8 }}>
        <svg viewBox="0 0 420 120" className="lp-mock-spark" style={{ height: 120 }}>
          <defs>
            <linearGradient id="lpGrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fafafa" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#fafafa" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[20,40,60,80,100].map(y => (
            <line key={y} x1="36" y1={y} x2="410" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          ))}
          <text x="2" y="44" fill="rgba(250,250,250,0.35)" fontSize="8" fontFamily="JetBrains Mono">40</text>
          <text x="2" y="84" fill="rgba(250,250,250,0.35)" fontSize="8" fontFamily="JetBrains Mono">20</text>
          <text x="6" y="114" fill="rgba(250,250,250,0.35)" fontSize="8" fontFamily="JetBrains Mono">0</text>
          <path d="M36 98 C 70 92, 110 88, 150 72 C 190 56, 230 62, 270 48 C 310 34, 350 28, 410 36" fill="none" stroke="#fafafa" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M36 98 C 70 92, 110 88, 150 72 C 190 56, 230 62, 270 48 C 310 34, 350 28, 410 36 L 410 110 L 36 110 Z" fill="url(#lpGrad2)" />
          <path d="M36 102 C 90 100, 160 96, 220 88 C 280 80, 340 72, 410 64" fill="none" stroke="#ff453a" strokeWidth="1.2" />
          <g fontSize="7" fill="rgba(250,250,250,0.45)" fontFamily="JetBrains Mono">
            <text x="40" y="118">02:14</text>
            <text x="170" y="118">08:40</text>
            <text x="300" y="118">12:22</text>
          </g>
        </svg>
        <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 10, color: 'rgba(250,250,250,0.5)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><i style={{ width: 8, height: 8, background: '#fafafa', borderRadius: 2, display: 'inline-block' }} /> Water Level (cm)</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><i style={{ width: 8, height: 8, background: '#ff453a', borderRadius: 2, display: 'inline-block' }} /> Flood Risk (%)</span>
        </div>
      </div>
    </div>
  );
}

export function MapMock() {
  return (
    <div className="lp-mock lp-mock-map">
      <div className="lp-mock-head">
        <span className="lp-mock-title"><Box size={13} /> Nagpur Geo-Spatial Risk Map</span>
        <span className="lp-mock-count">24 zones • Nagpur boundary</span>
      </div>
      <div className="lp-mock-map-grid">
        <svg viewBox="0 0 320 200" className="lp-mock-map-svg">
          <rect x="0" y="0" width="320" height="200" rx="10" fill="#18181b" />
          <rect x="14" y="14" width="292" height="172" rx="8" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          {[
            { x: 18, y: 18, w: 78, h: 52, c: 'rgba(250,250,250,0.09)', label: 'Z001' },
            { x: 100, y: 18, w: 68, h: 42, c: 'rgba(250,250,250,0.18)', label: 'Z002' },
            { x: 172, y: 18, w: 72, h: 52, c: '#ff453a', label: 'Z003', critical: true },
            { x: 248, y: 18, w: 54, h: 42, c: 'rgba(250,250,250,0.09)', label: 'Z004' },
            { x: 18, y: 74, w: 62, h: 48, c: 'rgba(255,69,58,0.18)', label: 'Z005' },
            { x: 84, y: 74, w: 84, h: 48, c: 'rgba(250,250,250,0.14)', label: 'Z006' },
            { x: 172, y: 74, w: 60, h: 48, c: 'rgba(250,250,250,0.09)', label: 'Z007' },
            { x: 236, y: 74, w: 66, h: 58, c: 'rgba(250,250,250,0.14)', label: 'Z008' },
            { x: 18, y: 126, w: 90, h: 60, c: 'rgba(250,250,250,0.06)', label: 'Z009' },
            { x: 112, y: 126, w: 56, h: 60, c: '#ff453a', label: 'Z010', critical: true },
            { x: 172, y: 136, w: 60, h: 50, c: 'rgba(250,250,250,0.09)', label: 'Z011' },
            { x: 236, y: 136, w: 66, h: 50, c: 'rgba(250,250,250,0.06)', label: 'Z012' },
          ].map((z) => (
            <g key={z.label}>
              <rect x={z.x} y={z.y} width={z.w} height={z.h} rx="6" fill={z.c} stroke={z.critical ? '#ff453a' : 'rgba(255,255,255,0.08)'} strokeWidth={z.critical ? 1.2 : 0.8} />
              <text x={z.x + 6} y={z.y + 14} fontSize="7" fontWeight="700" fill={z.critical ? '#fff' : 'rgba(250,250,250,0.7)'} fontFamily="JetBrains Mono">{z.label}</text>
            </g>
          ))}
          <g>
            <path d="M 84 74 L 100 18" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            <path d="M 18 74 L 320 74" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          </g>
          <g>
            <circle cx="206" cy="46" r="4.5" fill="#ff453a" stroke="#fff" strokeWidth="1.2" />
            <circle cx="206" cy="46" r="9" fill="none" stroke="#ff453a" strokeOpacity="0.35" strokeWidth="1" />
          </g>
          <g>
            <rect x="100" y="152" width="26" height="10" rx="5" fill="#ff453a" />
            <text x="113" y="159.5" fontSize="5.5" fontWeight="700" fill="#fff" textAnchor="middle" fontFamily="Instrument Sans">HOT</text>
          </g>
        </svg>
        <div className="lp-mock-legend">
          <span><i style={{ background: 'rgba(250,250,250,0.09)', borderColor: 'rgba(255,255,255,0.12)' }} /> LOW</span>
          <span><i style={{ background: 'rgba(250,250,250,0.18)' }} /> HIGH</span>
          <span><i style={{ background: '#ff453a' }} /> CRITICAL</span>
          <span><i style={{ background: 'rgba(56,189,248,0.18)', borderColor: '#38bdf8' }} /> Waterway</span>
        </div>
      </div>
    </div>
  );
}

export function LogsMock() {
  const rows = [
    { t: '14:32:08', d: 'esp32-01', z: 'Z001', lvl: '42.0', trend: '+0.4', prob: '12.4%', risk: 'SAFE' },
    { t: '14:32:04', d: 'esp32-03', z: 'Z003', lvl: '27.3', trend: '+1.2', prob: '67.1%', risk: 'CRITICAL' },
    { t: '14:31:58', d: 'esp32-02', z: 'Z005', lvl: '18.5', trend: '+0.9', prob: '34.2%', risk: 'WARNING' },
    { t: '14:31:52', d: 'esp32-01', z: 'Z001', lvl: '41.6', trend: '+0.3', prob: '11.8%', risk: 'SAFE' },
  ];
  return (
    <div className="lp-mock lp-mock-logs">
      <div className="lp-mock-head">
        <span className="lp-mock-title"><Search size={13} /> Sensor Ingestion Logs (Z001)</span>
        <span className="lp-mock-actions">
          <span className="lp-mock-search"><Search size={11} /> Filter logs...</span>
          <span className="lp-mock-export"><Download size={11} /> Export CSV</span>
        </span>
      </div>
      <div className="lp-mock-table">
        <div className="lp-mock-tr lp-mock-th">
          <span>Timestamp</span><span>Device</span><span>Zone</span><span>Level</span><span>Risk</span>
        </div>
        {rows.map((r) => (
          <div key={r.t} className="lp-mock-tr">
            <span className="lp-mono">{r.t}</span>
            <span style={{ fontWeight: 600 }}>{r.d}</span>
            <span style={{ color: '#fafafa', fontWeight: 600 }}>{r.z}</span>
            <span className="lp-mono" style={{ fontWeight: 700 }}>{r.lvl} cm</span>
            <span><em className={`lp-mock-badge ${r.risk === 'CRITICAL' ? 'lp-mock-badge-critical' : r.risk === 'WARNING' ? 'lp-mock-badge-warning' : 'lp-mock-badge-safe'}`}>{r.risk}</em></span>
          </div>
        ))}
      </div>
      <div className="lp-mock-table-foot">Live ingestion — newest first. 2 second refresh.</div>
    </div>
  );
}
