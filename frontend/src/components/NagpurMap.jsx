import React, { useEffect, useMemo, useState } from 'react';
import { Map as MapIcon, Box, Layers, Loader2, Filter, Droplets, AlertTriangle } from 'lucide-react';
import { fetchMap } from '../api/client';
import NagpurMap3D from './NagpurMap3D';
import MapCompass from './MapCompass';

const RISK_COLORS = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MODERATE: '#eab308',
  LOW: '#10b981',
};

export default function NagpurMap({ selectedZone, onSelectZone, latestReading }) {
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('3d'); // '3d' | '2d'
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'high' | 'waterways'
  const [hoveredZone, setHoveredZone] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMap()
      .then((data) => {
        if (!cancelled) {
          setMapData(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const counts = { CRITICAL: 0, HIGH: 0, MODERATE: 0, LOW: 0 };
    (mapData?.zones?.features || []).forEach((f) => {
      const cls = (f.properties?.risk_class || 'LOW').toUpperCase();
      if (counts[cls] !== undefined) counts[cls] += 1;
    });
    return {
      total: mapData?.zones?.features?.length || 0,
      hotspots: mapData?.hotspots?.features?.length || 0,
      waterways: mapData?.waterways?.features?.length || 0,
      ...counts,
    };
  }, [mapData]);

  // Shared projection for the 2D SVG view.
  const svg = useMemo(() => {
    if (!mapData?.zones) return null;
    const feats = mapData.zones.features;
    const lons = [];
    const lats = [];
    feats.forEach((f) => {
      (f.geometry?.coordinates || []).forEach((ring) =>
        ring.forEach(([lon, lat]) => {
          lons.push(lon);
          lats.push(lat);
        })
      );
    });
    // Include the city outline in the fit so it is fully visible, not cropped.
    (mapData.boundary?.geometry?.coordinates?.[0] || []).forEach(([lon, lat]) => {
      lons.push(lon);
      lats.push(lat);
    });
    if (!lons.length) return null;
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const cosLat = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
    const W = 920;
    const worldW = (maxLon - minLon) * cosLat;
    const worldH = maxLat - minLat;
    const s = W / worldW;
    const H = worldH * s;
    const px = (lon) => (lon - minLon) * cosLat * s;
    const py = (lat) => (maxLat - lat) * s;

    const pathFor = (geometry) => {
      if (!geometry) return '';
      if (geometry.type === 'Polygon') {
        const ring = geometry.coordinates?.[0];
        if (!ring || ring.length < 3) return '';
        return (
          ring
            .map(([lon, lat], i) => `${i === 0 ? 'M' : 'L'}${px(lon).toFixed(1)},${py(lat).toFixed(1)}`)
            .join(' ') + ' Z'
        );
      }
      if (geometry.type === 'LineString') {
        return (geometry.coordinates || [])
          .map(([lon, lat], i) => `${i === 0 ? 'M' : 'L'}${px(lon).toFixed(1)},${py(lat).toFixed(1)}`)
          .join(' ');
      }
      return '';
    };

    const boundary = mapData.boundary?.geometry;
    const boundaryPath = boundary
      ? (boundary.coordinates[0] || [])
          .map(([lon, lat], i) => `${i === 0 ? 'M' : 'L'}${px(lon).toFixed(1)},${py(lat).toFixed(1)}`)
          .join(' ') + ' Z'
      : '';

    return {
      W,
      H,
      px,
      py,
      feats,
      pathFor,
      boundaryPath,
      hotspots: mapData.hotspots?.features || [],
      waterways: mapData.waterways?.features || [],
    };
  }, [mapData]);

  return (
    <div className="nagpur-map" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Page Header */}
      <div
        className="glass-card map-header"
        style={{
          padding: '18px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <MapIcon size={20} color="var(--color-cyan)" />
            Nagpur Geo-Spatial Risk Map
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {stats.total} risk zones within Nagpur Municipal Boundary ·{' '}
            {stats.hotspots} flood hotspots · {stats.waterways ? `${stats.waterways} water bodies` : 'Live GIS'}
          </p>
        </div>

        {/* Controls: Filter & 2D/3D View Switcher */}
        <div className="map-controls" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Density / Layer Filter */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(255,255,255,0.03)',
              padding: '3px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              gap: '3px',
            }}
          >
            <button
              onClick={() => setFilterMode('all')}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                color: filterMode === 'all' ? '#ffffff' : 'var(--text-muted)',
                background: filterMode === 'all' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                border: 'none',
                transition: 'all 0.2s ease',
              }}
            >
              All Zones
            </button>
            <button
              onClick={() => setFilterMode('high')}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                color: filterMode === 'high' ? '#f97316' : 'var(--text-muted)',
                background: filterMode === 'high' ? 'rgba(249, 115, 22, 0.15)' : 'transparent',
                border: 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <AlertTriangle size={13} />
              High Risk ({stats.CRITICAL + stats.HIGH})
            </button>
            <button
              onClick={() => setFilterMode('waterways')}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                color: filterMode === 'waterways' ? '#38bdf8' : 'var(--text-muted)',
                background: filterMode === 'waterways' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                border: 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <Droplets size={13} />
              Lakes &amp; Rivers
            </button>
          </div>

          {/* 2D / 3D Toggle */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(255,255,255,0.04)',
              padding: '3px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              gap: '3px',
            }}
          >
            <button
              onClick={() => setView('3d')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                color: view === '3d' ? '#ffffff' : 'var(--text-secondary)',
                background: view === '3d' ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
                border: 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <Box size={14} />
              3D Hologram
            </button>
            <button
              onClick={() => setView('2d')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                color: view === '2d' ? '#ffffff' : 'var(--text-secondary)',
                background: view === '2d' ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
                border: 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <Layers size={14} />
              2D GIS Map
            </button>
          </div>
        </div>
      </div>

      {/* Legend + Stats Bar */}
      <div
        className="glass-card map-legend"
        style={{
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          {Object.entries(RISK_COLORS).map(([cls, color]) => (
            <span
              key={cls}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.74rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
              }}
            >
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '2px',
                  background: color,
                  boxShadow: `0 0 6px ${color}88`,
                }}
              />
              {cls} ({stats[cls]})
            </span>
          ))}
          {stats.hotspots > 0 && (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.74rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#f43f5e',
                  boxShadow: `0 0 8px #f43f5e`,
                }}
              />
              Hotspots ({stats.hotspots})
            </span>
          )}
          {stats.waterways > 0 && (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.74rem',
                fontWeight: 600,
                color: '#38bdf8',
              }}
            >
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '2px',
                  background: 'rgba(56, 189, 248, 0.4)',
                  border: '1px solid #38bdf8',
                }}
              />
              Waterways
            </span>
          )}
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          Nagpur Municipal Corporation Boundary. High-resolution DEM
        </span>
      </div>

      {/* Map Viewport */}
      {loading ? (
        <div
          className="glass-card"
          style={{
            height: '560px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            color: 'var(--text-muted)',
          }}
        >
          <Loader2 size={28} className="spin" />
          Loading Nagpur map data...
        </div>
      ) : error ? (
        <div
          className="glass-card"
          style={{
            height: '200px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(239,68,68,0.4)',
            color: '#ef4444',
            fontSize: '0.875rem',
          }}
        >
          Map unavailable. {error}
        </div>
      ) : view === '3d' ? (
        <NagpurMap3D
          mapData={mapData}
          selectedZone={selectedZone}
          liveReading={latestReading}
          onSelectZone={onSelectZone}
          filterMode={filterMode}
        />
      ) : (
        <div
          className="glass-card map-viewport map-viewport--2d"
          style={{
            position: 'relative',
            padding: '16px',
            overflow: 'hidden',
          }}
        >
          <MapCompass angle={0} headingDeg={0} cardinal="N" interactive={false} />

          {/* Hover HUD Badge */}
          {hoveredZone && (
            <div
              style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                background: 'var(--bg-surface-glass)',
                backdropFilter: 'blur(12px)',
                border: `1px solid ${hoveredZone.color || 'var(--color-cyan)'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px',
                pointerEvents: 'none',
                boxShadow: `0 0 16px ${hoveredZone.color || 'var(--color-cyan)'}33`,
                zIndex: 10,
              }}
            >
              <div
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: hoveredZone.color || 'var(--color-cyan)',
                }}
              >
                {hoveredZone.title}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                {hoveredZone.subtitle}
              </div>
            </div>
          )}

          <svg
            viewBox={`0 0 ${svg.W} ${svg.H}`}
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <defs>
              {/* Radial gradient for subtle city glow */}
              <radialGradient id="cityGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
              </radialGradient>
              <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Subtle background radar grid lines */}
            <g opacity="0.12" stroke="#38bdf8" strokeWidth="0.5">
              {[0.2, 0.4, 0.6, 0.8].map((ratio) => (
                <line key={`gx-${ratio}`} x1={svg.W * ratio} y1="0" x2={svg.W * ratio} y2={svg.H} strokeDasharray="3 6" />
              ))}
              {[0.2, 0.4, 0.6, 0.8].map((ratio) => (
                <line key={`gy-${ratio}`} x1="0" y1={svg.H * ratio} x2={svg.W} y2={svg.H * ratio} strokeDasharray="3 6" />
              ))}
            </g>

            {/* Nagpur municipal city boundary fill & glowing contour */}
            {svg.boundaryPath && (
              <g>
                <path d={svg.boundaryPath} fill="url(#cityGlow)" />
                <path
                  d={svg.boundaryPath}
                  fill="rgba(14, 23, 42, 0.4)"
                  stroke="#ffffff"
                  strokeWidth="1.8"
                  strokeDasharray="8 4"
                  opacity="0.8"
                  filter="url(#neonGlow)"
                />
              </g>
            )}

            {/* Waterways / Lakes (Ambazari, Futala, Gandhi Sagar, Gorewada, Nag River) */}
            {svg.waterways.map((w, i) => {
              const d = svg.pathFor(w.geometry);
              if (!d) return null;
              const isPoly = w.geometry?.type?.includes('Polygon');
              return (
                <path
                  key={`water-${i}`}
                  d={d}
                  fill={isPoly ? 'rgba(56, 189, 248, 0.45)' : 'none'}
                  stroke="#38bdf8"
                  strokeWidth={isPoly ? 1.2 : 2}
                  opacity="0.85"
                  onMouseEnter={() =>
                    setHoveredZone({
                      title: w.properties?.name || 'Water Body',
                      subtitle: 'Nagpur Natural Drainage Basin',
                      color: '#38bdf8',
                    })
                  }
                  onMouseLeave={() => setHoveredZone(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <title>{w.properties?.name || 'Waterway'}</title>
                </path>
              );
            })}

            {/* Zone polygons with clean translucency and breathing room */}
            {svg.feats.map((f) => {
              const props = f.properties || {};
              const cls = (props.risk_class || 'LOW').toUpperCase();
              const color = RISK_COLORS[cls] || RISK_COLORS.LOW;
              const isSelected = props.zone_id === selectedZone;

              // Filter mode visibility
              if (filterMode === 'high' && cls !== 'CRITICAL' && cls !== 'HIGH') {
                return null;
              }
              if (filterMode === 'waterways') {
                return null;
              }

              const fillOpacity = isSelected ? 0.9 : cls === 'CRITICAL' ? 0.65 : cls === 'HIGH' ? 0.55 : 0.35;

              return (
                <path
                  key={props.zone_id}
                  d={svg.pathFor(f.geometry)}
                  fill={color}
                  fillOpacity={fillOpacity}
                  stroke={isSelected ? '#ffffff' : color}
                  strokeOpacity={isSelected ? 1 : 0.5}
                  strokeWidth={isSelected ? 2 : 0.75}
                  style={{
                    cursor: 'pointer',
                    transition: 'fill-opacity 0.15s ease, stroke-width 0.15s ease',
                  }}
                  onMouseEnter={() =>
                    setHoveredZone({
                      title: props.zone_id,
                      subtitle: `${cls} Risk. Score ${props.risk_score ?? '-'}/100. Elev ${props.elevation_m ?? '-'}m`,
                      color,
                    })
                  }
                  onMouseLeave={() => setHoveredZone(null)}
                  onClick={() => onSelectZone(props.zone_id)}
                >
                  <title>
                    {props.zone_id}. {cls} risk. Score {props.risk_score ?? '-'}/100. Elev {props.elevation_m ?? '-'}m
                  </title>
                </path>
              );
            })}

            {/* Flood hotspots with pulsing beacon rings */}
            {svg.hotspots.map((f, i) => {
              const [lon, lat] = f.geometry?.coordinates || [];
              if (lon == null || lat == null) return null;
              const cx = svg.px(lon);
              const cy = svg.py(lat);
              return (
                <g
                  key={`hs-${i}`}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() =>
                    setHoveredZone({
                      title: f.properties?.name || 'Flood Hotspot',
                      subtitle: `Documented flood event · Year: ${f.properties?.event_year || 'Historical'}`,
                      color: '#f43f5e',
                    })
                  }
                  onMouseLeave={() => setHoveredZone(null)}
                >
                  {/* Outer pulse wave */}
                  <circle cx={cx} cy={cy} r="8" fill="none" stroke="#f43f5e" strokeWidth="1" opacity="0.6">
                    <animate attributeName="r" values="4;14;4" dur="2.4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0;0.8" dur="2.4s" repeatCount="indefinite" />
                  </circle>
                  {/* Inner solid marker */}
                  <circle cx={cx} cy={cy} r="4" fill="#f43f5e" stroke="#fff" strokeWidth="1.2" />
                  <title>Flood hotspot: {f.properties?.name || 'Unknown'}</title>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
