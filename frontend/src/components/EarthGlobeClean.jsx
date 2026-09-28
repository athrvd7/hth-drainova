'use client';
import React, { useRef, useEffect, useState } from 'react';

// Will be loaded dynamically
let Globe = null;

export default function EarthGlobeClean({
  width = 400,
  height = 400,
  autoRotate = true,
  markers = []
}) {
  const globeRef = useRef();
  const containerRef = useRef();
  const [isLoaded, setIsLoaded] = useState(false);
  const [size, setSize] = useState({ width, height });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const { width: nextWidth, height: nextHeight } = container.getBoundingClientRect();
      const nextSize = {
        width: Math.max(Math.floor(nextWidth), 1),
        height: Math.max(Math.floor(nextHeight), 1),
      };

      setSize((current) => (
        current.width === nextSize.width && current.height === nextSize.height
          ? current
          : nextSize
      ));
    };

    updateSize();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateSize);
    observer?.observe(container);

    return () => observer?.disconnect();
  }, [width, height]);

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

    // Set initial camera position to Nagpur
    setTimeout(() => {
      globe.pointOfView({ lat: 21.1458, lng: 79.0882, altitude: 2.5 }, 1500);
    }, 100);

    // Auto-rotate
    if (autoRotate) {
      globe.controls().autoRotate = true;
      globe.controls().autoRotateSpeed = 0.5;
    }

    // Enable interactions
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
      : m.color || '#8c8c8c';

    return {
      lat: m.lat,
      lng: m.lng,
      size: 1.2,
      color: colorHex,
      label: m.label || '',
      altitude: 0.01
    };
  });

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      {!isLoaded || !Globe ? (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.875rem'
        }}>
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
      ) : (
        <>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>

          <Globe
            ref={globeRef}
            width={size.width}
            height={size.height}
            backgroundColor="rgba(0,0,0,0)"

            globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
            bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"

            showAtmosphere={true}
            atmosphereColor="#8c8c8c"
            atmosphereAltitude={0.14}

            // Marker points
            pointsData={pointsData}
            pointAltitude="altitude"
            pointRadius={0.6}
            pointColor="color"
            pointLabel="label"
            pointsMerge={false}
            pointResolution={12}

            // Labels on markers
            labelsData={pointsData}
            labelLat={d => d.lat}
            labelLng={d => d.lng}
            labelText={d => d.label}
            labelSize={1.8}
            labelDotRadius={0.5}
            labelColor={() => 'rgba(242, 242, 242, 0.95)'}
            labelResolution={2}
            labelAltitude={0.02}

            // Interaction
            enablePointerInteraction={true}
            onPointClick={(point) => {
              console.log('Clicked point:', point);
              if (globeRef.current) {
                globeRef.current.pointOfView(
                  { lat: point.lat, lng: point.lng, altitude: 1.5 },
                  1000
                );
              }
            }}
          />
        </>
      )}
    </div>
  );
}
