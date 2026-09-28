'use client';
import React, { useRef, useEffect, useState } from 'react';

// Will be loaded dynamically
let Globe = null;

export default function EarthGlobeRealistic({
  width = 400,
  height = 400,
  autoRotate = true,
  markers = []
}) {
  const globeRef = useRef();
  const containerRef = useRef();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Dynamically import react-globe.gl
    import('react-globe.gl').then((module) => {
      Globe = module.default;
      setIsLoaded(true);
    }).catch(err => {
      console.error('Failed to load Globe:', err);
    });
  }, []);

  useEffect(() => {
    if (!globeRef.current || !isLoaded) return;

    const globe = globeRef.current;

    // Set initial camera position to Nagpur with cinematic angle
    setTimeout(() => {
      globe.pointOfView({ lat: 21.1458, lng: 79.0882, altitude: 2.5 }, 1500);
    }, 100);

    // Auto-rotate with smooth motion
    if (autoRotate) {
      globe.controls().autoRotate = true;
      globe.controls().autoRotateSpeed = 0.4;
    }

    // Enable smooth interactions
    globe.controls().enableZoom = true;
    globe.controls().minDistance = 150;
    globe.controls().maxDistance = 500;
    globe.controls().enableDamping = true;
    globe.controls().dampingFactor = 0.05;

  }, [autoRotate, isLoaded]);

  // Format markers for react-globe.gl
  const pointsData = markers.map(m => {
    // Convert hex color number to string
    const colorHex = typeof m.color === 'number'
      ? `#${m.color.toString(16).padStart(6, '0')}`
      : m.color || '#22c55e';

    return {
      lat: m.lat,
      lng: m.lng,
      size: 1.5,
      color: colorHex,
      label: m.label || '',
      altitude: 0.01
    };
  });

  // Create pulsing rings around markers for dramatic effect
  const ringsData = markers.map(m => {
    const colorHex = typeof m.color === 'number'
      ? `#${m.color.toString(16).padStart(6, '0')}`
      : m.color || '#22c55e';

    return {
      lat: m.lat,
      lng: m.lng,
      maxR: 3,
      propagationSpeed: 1.5,
      repeatPeriod: 2000,
      color: colorHex
    };
  });

  if (!isLoaded || !Globe) {
    return (
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.875rem'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid var(--border-medium)',
            borderTopColor: 'var(--text-primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 12px'
          }} />
          Loading Earth...
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <Globe
        ref={globeRef}
        width={width}
        height={height}
        backgroundColor="rgba(0,0,0,0)"

        // HIGH-QUALITY Earth textures
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"

        // CLOUDS LAYER - Realistic cloud formations
        cloudsImageUrl="//unpkg.com/three-globe/example/img/earth-clouds.png"
        cloudsAltitude={0.015}
        cloudsTransitionDuration={1000}

        // NIGHT LIGHTS - City lights on dark side
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"

        // ENHANCED ATMOSPHERE - Multi-layer glow
        showAtmosphere={true}
        atmosphereColor="#4a9fd8"
        atmosphereAltitude={0.25}

        // PULSING RINGS around markers (weather/alert effect)
        ringsData={ringsData}
        ringColor="color"
        ringMaxRadius="maxR"
        ringPropagationSpeed="propagationSpeed"
        ringRepeatPeriod="repeatPeriod"
        ringAltitude={0.015}

        // MARKER POINTS with glow
        pointsData={pointsData}
        pointAltitude="altitude"
        pointRadius={0.7}
        pointColor="color"
        pointLabel="label"
        pointsMerge={false}
        pointResolution={12}

        // LABELS with backdrop for readability
        labelsData={pointsData}
        labelLat={d => d.lat}
        labelLng={d => d.lng}
        labelText={d => d.label}
        labelSize={2}
        labelDotRadius={0.6}
        labelColor={() => 'rgba(255, 255, 255, 1)'}
        labelResolution={3}
        labelAltitude={0.02}

        // HEXED POLYGONS for weather visualization (optional layer)
        // hexBinPointsData={weatherHexData}
        // hexBinPointWeight="value"
        // hexAltitude={d => d.sumWeight * 0.001}
        // hexBinResolution={4}
        // hexTopColor={d => `rgba(74, 157, 216, ${d.sumWeight / 100})`}
        // hexSideColor={d => `rgba(74, 157, 216, ${d.sumWeight / 200})`}

        // INTERACTION
        enablePointerInteraction={true}
        onPointClick={(point) => {
          console.log('Clicked location:', point);
          if (globeRef.current) {
            globeRef.current.pointOfView(
              { lat: point.lat, lng: point.lng, altitude: 1.5 },
              1000
            );
          }
        }}

        // LIGHTING for dramatic effect
        // Custom material rendering happens internally
      />

      {/* Overlay glow effect */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle at center, transparent 40%, rgba(74, 157, 216, 0.1) 70%, rgba(74, 157, 216, 0.2) 100%)',
        pointerEvents: 'none',
        borderRadius: '50%'
      }} />

      {/* Subtle vignette for depth */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle at center, transparent 50%, rgba(0, 0, 0, 0.3) 100%)',
        pointerEvents: 'none'
      }} />
    </div>
  );
}
