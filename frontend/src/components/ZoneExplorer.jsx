import React, { useState, useMemo } from 'react';
import { MapPin, Search, Filter, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

export default function ZoneExplorer({ zones, selectedZone, onSelectZone }) {
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('ALL');
  const [page, setPage] = useState(1);
  const itemsPerPage = 24;

  const filteredZones = useMemo(() => {
    return (zones || []).filter((z) => {
      const matchSearch = z.zone_id.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filterClass === 'ALL' || (z.geo_risk_class && z.geo_risk_class.toUpperCase() === filterClass);
      return matchSearch && matchFilter;
    });
  }, [zones, search, filterClass]);

  const totalPages = Math.ceil(filteredZones.length / itemsPerPage) || 1;
  const currentZones = filteredZones.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const getRiskClassBadge = (riskClass) => {
    switch ((riskClass || '').toUpperCase()) {
      case 'CRITICAL':
      case 'HIGH':
        return 'badge-critical';
      case 'MODERATE':
        return 'badge-warning';
      default:
        return 'badge-safe';
    }
  };

  return (
    <div className="zone-explorer" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Controls */}
      <div className="glass-card zone-explorer__header" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="zone-explorer__topline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={22} color="var(--color-cyan)" />
              Nagpur Geo-Risk Zone Directory
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Geo-topographical flood vulnerability database. {zones?.length || 0} total zones
            </p>
          </div>

          {/* Search Box */}
          <div className="zone-search" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 14px',
            width: '260px'
          }}>
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search Zone (e.g. Z001)..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                outline: 'none',
                fontSize: '0.85rem',
                width: '100%'
              }}
            />
          </div>
        </div>

        {/* Filter Chips */}
        <div className="zone-filters" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['ALL', 'CRITICAL', 'HIGH', 'MODERATE', 'LOW'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => { setFilterClass(lvl); setPage(1); }}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: 700,
                background: filterClass === lvl ? 'var(--accent)' : 'var(--bg-surface-elevated)',
                color: filterClass === lvl ? 'var(--bg-primary)' : 'var(--text-secondary)',
                border: `1px solid ${filterClass === lvl ? 'var(--accent)' : 'var(--border-subtle)'}`,
                cursor: 'pointer'
              }}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Zones Grid */}
      <div className="zone-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '16px'
      }}>
        {currentZones.map((z) => {
          const isSelected = z.zone_id === selectedZone;
          return (
            <div
              key={z.zone_id}
              className={`glass-card zone-card${isSelected ? ' is-selected' : ''}`}
              onClick={() => onSelectZone(z.zone_id)}
              style={{
                padding: '16px',
                cursor: 'pointer',
                border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                background: isSelected ? 'var(--accent-bg)' : 'var(--bg-surface-glass)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {z.zone_id}
                </span>
                <span className={`badge ${getRiskClassBadge(z.geo_risk_class)}`}>
                  {z.geo_risk_class || 'MODERATE'}
                </span>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  <span>Geo-Risk Score</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{z.geo_risk_score}/100</span>
                </div>
                <div style={{
                  height: '6px',
                  background: 'var(--accent-bg)',
                  borderRadius: 'var(--radius-full)',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${Math.min(z.geo_risk_score, 100)}%`,
                    height: '100%',
                    background: z.geo_risk_score > 70 ? 'var(--alarm)' : z.geo_risk_score > 40 ? 'var(--text-primary)' : 'var(--text-muted)'
                  }} />
                </div>
              </div>

              <div style={{
                marginTop: 'auto',
                paddingTop: '8px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.75rem',
                color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)'
              }}>
                <span>{isSelected ? '● Active Monitor' : 'Click to select'}</span>
                <MapPin size={12} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page === 1}
            className="btn-secondary"
            style={{ opacity: page === 1 ? 0.5 : 1 }}
          >
            Previous
          </button>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Page {page} of {totalPages} ({filteredZones.length} Zones)
          </span>
          <button
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            disabled={page === totalPages}
            className="btn-secondary"
            style={{ opacity: page === totalPages ? 0.5 : 1 }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
