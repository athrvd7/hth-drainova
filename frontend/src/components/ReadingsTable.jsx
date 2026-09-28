import React, { useState } from 'react';
import { Database, Download, Search } from 'lucide-react';

export default function ReadingsTable({ history, selectedZone }) {
  const [filterText, setFilterText] = useState('');

  const filteredHistory = (history || []).filter((row) => {
    const text = `${row.device_id} ${row.zone_id} ${row.risk_level}`.toLowerCase();
    return text.includes(filterText.toLowerCase());
  });

  const exportCSV = () => {
    if (!history || history.length === 0) return;
    const headers = ['Observed At', 'Device ID', 'Zone ID', 'Water Level (cm)', 'Trend (cm/s)', '24h Rain (mm)', 'Geo Score', 'Flood Prob', 'Risk Level'];
    const rows = history.map(r => [
      r.observed_at,
      r.device_id,
      r.zone_id,
      r.water_level_cm,
      (Number(r.water_trend_cm_per_hour) / 3600).toFixed(2),
      r.rainfall_24h_mm,
      r.geo_risk_score,
      r.flood_probability,
      r.risk_level
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `floodguard_${selectedZone}_readings.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getBadgeClass = (risk) => {
    switch ((risk || '').toUpperCase()) {
      case 'CRITICAL': return 'badge-critical';
      case 'DANGER': return 'badge-danger';
      case 'WARNING': return 'badge-warning';
      default: return 'badge-safe';
    }
  };

  return (
    <div className="glass-card readings-table" style={{ padding: '24px' }}>
      <div className="section-heading readings-table__heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={20} color="var(--accent)" />
          <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>Sensor Ingestion Logs ({selectedZone})</h3>
        </div>

        <div className="readings-table__tools" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="table-filter" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 12px'
          }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Filter logs..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '0.8rem', width: '120px' }}
            />
          </div>

          <button onClick={exportCSV} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {filteredHistory.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          No telemetry readings recorded yet for zone {selectedZone}.
        </div>
      ) : (
        <div className="table-scroll" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 12px' }}>Timestamp</th>
                <th style={{ padding: '10px 12px' }}>Device</th>
                <th style={{ padding: '10px 12px' }}>Zone</th>
                <th style={{ padding: '10px 12px' }}>Water Level</th>
                <th style={{ padding: '10px 12px' }}>Trend</th>
                <th style={{ padding: '10px 12px' }}>Geo Score</th>
                <th style={{ padding: '10px 12px' }}>Probability</th>
                <th style={{ padding: '10px 12px' }}>Risk Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((row, idx) => (
                <tr 
                  key={idx} 
                  style={{ 
                    borderBottom: '1px solid var(--border-subtle)',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface-elevated)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                    {row.observed_at ? new Date(row.observed_at).toLocaleTimeString() : '-'}
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>{row.device_id}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--accent)', fontWeight: 600 }}>{row.zone_id}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {Number(row.water_level_cm).toFixed(1)} cm
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: Number(row.water_trend_cm_per_hour) > 0 ? 'var(--alarm)' : 'var(--text-secondary)' }}>
                    {(() => {
                      const trendCs = Number(row.water_trend_cm_per_hour) / 3600;
                      return `${trendCs > 0 ? '+' : ''}${trendCs.toFixed(2)} cm/s`;
                    })()}
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>{row.geo_risk_score}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    {(Number(row.flood_probability) * 100).toFixed(1)}%
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span className={`badge ${getBadgeClass(row.risk_level)}`}>
                      {row.risk_level}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
