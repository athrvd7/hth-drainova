import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import MapCompass from './MapCompass';

const RISK_COLORS = {
  CRITICAL: 0xef4444,
  HIGH: 0xf97316,
  MODERATE: 0xeab308,
  LOW: 0x10b981,
};
const RISK_HEIGHT = {
  CRITICAL: 9,
  HIGH: 6,
  MODERATE: 3.5,
  LOW: 1.8,
};
// Selected zone stands this many times taller so live demo zones read at a glance.
const SPOTLIGHT_HEIGHT_SCALE = 2.2;
// Live sensor status reuses the static visual vocabulary; SAFE means "currently safe", not "unsusceptible".
const LIVE_CLASS = {
  SAFE: 'LOW',
  WARNING: 'MODERATE',
  DANGER: 'HIGH',
  CRITICAL: 'CRITICAL',
};

const FOOTPRINT_SHRINK = 0.88;
const ELEVATION_SCALE = 0.05;

export default function NagpurMap3D({ mapData, selectedZone, liveReading = null, onSelectZone, filterMode = 'all' }) {
  const containerRef = useRef(null);
  const sceneState = useRef(null);
  const liveRef = useRef(null);
  const [hovered, setHovered] = useState(null);
  const [heading, setHeading] = useState({ angle: 0, headingDeg: 0, cardinal: 'N' });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !mapData?.zones) return undefined;

    // ---- Equirectangular projection fitted to Nagpur bounds ----
    const lons = [];
    const lats = [];
    mapData.zones.features.forEach((f) => {
      (f.geometry?.coordinates || []).forEach((ring) => {
        ring.forEach(([lon, lat]) => {
          lons.push(lon);
          lats.push(lat);
        });
      });
    });
    (mapData.boundary?.geometry?.coordinates?.[0] || []).forEach(([lon, lat]) => {
      lons.push(lon);
      lats.push(lat);
    });

    if (!lons.length) return undefined;
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const centerLon = (minLon + maxLon) / 2;
    const centerLat = (minLat + maxLat) / 2;
    const WIDTH = 110;
    const cosLat = Math.cos((centerLat * Math.PI) / 180);
    const scale = WIDTH / ((maxLon - minLon) * cosLat);
    const px = (lon) => (lon - centerLon) * cosLat * scale;
    const pz = (lat) => (lat - centerLat) * scale;

    // ---- Renderer / camera / controls ----
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b14);
    scene.fog = new THREE.Fog(0x070b14, 260, 750);

    const camera = new THREE.PerspectiveCamera(48, container.clientWidth / container.clientHeight, 1, 2500);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.target.set(0, 2, 0);
    camera.position.set(WIDTH * 0.7, WIDTH * 0.65, WIDTH * 0.7);
    controls.update();

    // ---- Lighting ----
    scene.add(new THREE.HemisphereLight(0x38bdf8, 0x070b14, 1.2));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight.position.set(70, 100, 45);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    const shadowSpan = 85;
    dirLight.shadow.camera.left = -shadowSpan;
    dirLight.shadow.camera.right = shadowSpan;
    dirLight.shadow.camera.top = shadowSpan;
    dirLight.shadow.camera.bottom = -shadowSpan;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 320;
    scene.add(dirLight);

    const cyanFill = new THREE.DirectionalLight(0x00f0ff, 0.45);
    cyanFill.position.set(-60, 35, -50);
    scene.add(cyanFill);
    scene.add(new THREE.AmbientLight(0x475569, 0.35));

    // ---- Ground Plane & Subtle Tech Grid ----
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(450, 450),
      new THREE.MeshStandardMaterial({ color: 0x090f1d, roughness: 0.95 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(160, 32, 0x1e293b, 0x0f172a);
    grid.position.y = 0.01;
    scene.add(grid);

    // ---- Glowing Nagpur Boundary Outline ----
    if (mapData.boundary?.geometry) {
      const ring = mapData.boundary.geometry.coordinates[0] || [];
      if (ring.length > 2) {
        const points = ring.map(([lon, lat]) => new THREE.Vector3(px(lon), 0.08, pz(lat)));
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const boundaryLine = new THREE.Line(
          geo,
          new THREE.LineBasicMaterial({ color: 0x00f0ff, linewidth: 2 }),
        );
        scene.add(boundaryLine);
      }
    }

    // ---- Waterways in 3D (Lakes and Rivers) ----
    const waterMeshes = [];
    (mapData.waterways?.features || []).forEach((w) => {
      const geom = w.geometry || {};
      const name = w.properties?.name || 'Water Body';
      if (geom.type === 'Polygon' && geom.coordinates?.[0]?.length > 2) {
        const ring = geom.coordinates[0];
        const pts = ring.map(([lon, lat]) => new THREE.Vector2(px(lon), -pz(lat)));
        const shape = new THREE.Shape(pts);
        const waterGeo = new THREE.ShapeGeometry(shape);
        const waterMat = new THREE.MeshStandardMaterial({
          color: 0x00f0ff,
          emissive: 0x00f0ff,
          emissiveIntensity: 0.4,
          roughness: 0.1,
          metalness: 0.8,
          transparent: true,
          opacity: 0.75,
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(waterGeo, waterMat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = 0.06;
        mesh.userData = { zone_id: null, lake: name };
        scene.add(mesh);
        waterMeshes.push(mesh);
      } else if (geom.type === 'LineString' && geom.coordinates?.length > 1) {
        const pts = geom.coordinates.map(([lon, lat]) => new THREE.Vector3(px(lon), 0.07, pz(lat)));
        const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 });
        const riverLine = new THREE.Line(lineGeo, lineMat);
        scene.add(riverLine);
      }
    });

    // ---- Zone prisms (clean translucent blocks) ----
    const elevations = mapData.zones.features.map((f) => Number(f.properties?.elevation_m) || 0);
    const minElev = Math.min(...elevations);
    const meshes = [];

    const buildPrism = (feature) => {
      const props = feature.properties || {};
      const ring = feature.geometry?.coordinates?.[0];
      if (!ring || ring.length < 4) return null;
      const riskClass = (props.risk_class || 'LOW').toUpperCase();
      const color = RISK_COLORS[riskClass] || RISK_COLORS.LOW;
      const height = RISK_HEIGHT[riskClass] || RISK_HEIGHT.LOW;

      const pts = ring.map(([lon, lat]) => ({ x: px(lon), y: -pz(lat) }));
      const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
      const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      const shape = new THREE.Shape();
      pts.forEach((p, i) => {
        const x = cx + (p.x - cx) * FOOTPRINT_SHRINK;
        const y = cy + (p.y - cy) * FOOTPRINT_SHRINK;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      });
      shape.closePath();

      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: height,
        bevelEnabled: true,
        bevelSize: 0.2,
        bevelThickness: 0.2,
        bevelSegments: 2,
      });

      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.45,
        metalness: 0.15,
        transparent: true,
        opacity: 0.88,
        emissive: color,
        emissiveIntensity: riskClass === 'CRITICAL' ? 0.35 : riskClass === 'HIGH' ? 0.22 : 0.1,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = ((Number(props.elevation_m) || 0) - minElev) * ELEVATION_SCALE;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = {
        zone_id: props.zone_id,
        risk_score: props.risk_score,
        risk_class: riskClass,
        elevation_m: props.elevation_m,
        baseColor: color,
      };
      return mesh;
    };

    mapData.zones.features.forEach((feature) => {
      const mesh = buildPrism(feature);
      if (mesh) {
        scene.add(mesh);
        meshes.push(mesh);
      }
    });

    // ---- Flood hotspots with 3D beacons ----
    (mapData.hotspots?.features || []).forEach((feature) => {
      const [lon, lat] = feature.geometry?.coordinates || [];
      if (lon == null || lat == null) return;
      const markerX = px(lon);
      const markerZ = pz(lat);

      // Red core sphere
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.65, 16, 16),
        new THREE.MeshStandardMaterial({
          color: 0xf43f5e,
          emissive: 0xf43f5e,
          emissiveIntensity: 1,
          roughness: 0.2,
        }),
      );
      marker.position.set(markerX, 1.8, markerZ);
      marker.userData = { zone_id: null, hotspot: feature.properties?.name };
      scene.add(marker);
      meshes.push(marker);

      // Vertical beacon column
      const beacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 12, 8),
        new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.35 }),
      );
      beacon.position.set(markerX, 6, markerZ);
      scene.add(beacon);
    });

    // ---- Filter, Selection & Live-status updater ----
    const applyVisualState = (curSelected, curFilter) => {
      const live = liveRef.current;
      const liveZoneId = live?.zone_id || curSelected;
      const liveClass = live ? LIVE_CLASS[(live.risk_level || '').toUpperCase()] : null;
      if (sceneState.current) sceneState.current.liveMesh = null;
      meshes.forEach((m) => {
        const base = m.userData.risk_class;
        if (!base) return;
        const isSel = m.userData.zone_id === curSelected;
        const isLive = Boolean(liveClass) && m.userData.zone_id === liveZoneId;

        let targetOpacity = 0.88;
        if (curFilter === 'high') {
          targetOpacity = base === 'CRITICAL' || base === 'HIGH' ? 0.95 : 0.12;
        } else if (curFilter === 'waterways') {
          targetOpacity = 0.1;
        }

        m.material.transparent = true;
        m.material.opacity = isSel ? 1 : targetOpacity;

        if (isLive) {
          const liveColor = RISK_COLORS[liveClass] || RISK_COLORS.LOW;
          const liveHeight = RISK_HEIGHT[liveClass] || RISK_HEIGHT.LOW;
          m.material.color.setHex(liveColor);
          m.material.emissive.setHex(liveColor);
          m.material.emissiveIntensity = 0.5;
          m.scale.z = (liveHeight / RISK_HEIGHT[base]) * (isSel ? SPOTLIGHT_HEIGHT_SCALE : 1);
          sceneState.current.liveMesh = m;
        } else {
          m.material.color.setHex(RISK_COLORS[base] || RISK_COLORS.LOW);
          m.scale.z = isSel ? SPOTLIGHT_HEIGHT_SCALE : 1;
          if (isSel) {
            m.material.emissive.setHex(0xffffff);
            m.material.emissiveIntensity = 0.65;
          } else {
            m.material.emissive.setHex(RISK_COLORS[base] || RISK_COLORS.LOW);
            m.material.emissiveIntensity = base === 'CRITICAL' ? 0.35 : base === 'HIGH' ? 0.22 : 0.1;
          }
        }
      });
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hoveredMesh = null;

    const pick = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const allTargets = [...meshes, ...waterMeshes];
      const hits = raycaster.intersectObjects(allTargets, false);
      return hits[0]?.object || null;
    };

    const onPointerMove = (event) => {
      const hit = pick(event);
      if (hit === hoveredMesh) return;
      applyVisualState(selectedZone, filterMode);
      hoveredMesh = hit;
      if (hoveredMesh) {
        if (hoveredMesh.userData.zone_id) {
          hoveredMesh.material.emissive.setHex(0xffffff);
          hoveredMesh.material.emissiveIntensity = 0.75;
        }
        renderer.domElement.style.cursor = 'pointer';
        setHovered({ ...hoveredMesh.userData });
      } else {
        renderer.domElement.style.cursor = 'default';
        setHovered(null);
      }
    };

    const onClick = (event) => {
      const hit = pick(event);
      if (hit?.userData?.zone_id && onSelectZone) {
        onSelectZone(hit.userData.zone_id);
      }
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('click', onClick);

    // ---- Direction / Compass heading updates ----
    const vNorth = new THREE.Vector3(0, 0, 1);
    const dirCam = new THREE.Vector3();
    const camDir = new THREE.Vector3();
    const cardinals = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

    const updateCompass = () => {
      dirCam.copy(vNorth).transformDirection(camera.matrixWorldInverse);
      const angleDeg = Math.round(Math.atan2(dirCam.x, dirCam.y) * (180 / Math.PI));

      camera.getWorldDirection(camDir);
      const deg = Math.round(((Math.atan2(camDir.x, camDir.z) * 180 / Math.PI) + 360) % 360);
      const idx = Math.round(deg / 22.5) % 16;

      setHeading({
        angle: angleDeg,
        headingDeg: deg,
        cardinal: cardinals[idx],
      });
    };

    controls.addEventListener('change', updateCompass);
    updateCompass();

    const resetNorth = () => {
      controls.target.set(0, 2, 0);
      camera.position.set(0, WIDTH * 0.8, -WIDTH * 0.85);
      camera.lookAt(0, 2, 0);
      controls.update();
      updateCompass();
    };

    // ---- Animation loop ----
    const clock = new THREE.Clock();
    const animate = () => {
      controls.update();
      const liveMesh = sceneState.current?.liveMesh;
      if (liveMesh) {
        liveMesh.material.emissiveIntensity = 0.45 + 0.25 * Math.sin(clock.getElapsedTime() * 5);
      }
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };
    let rafId = requestAnimationFrame(animate);

    // ---- Resize ----
    const onResize = () => {
      if (!container.clientWidth || !container.clientHeight) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    sceneState.current = { applyVisualState, resetNorth };
    applyVisualState(selectedZone, filterMode);

    // ---- Cleanup ----
    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      controls.removeEventListener('change', updateCompass);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('click', onClick);
      meshes.forEach((m) => {
        m.geometry.dispose();
        m.material.dispose();
      });
      waterMeshes.forEach((m) => {
        m.geometry.dispose();
        m.material.dispose();
      });
      scene.traverse((obj) => {
        if (obj.isMesh) {
          obj.geometry.dispose();
          obj.material.dispose();
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      sceneState.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapData]);

  // Update selection / filter / live reading without recreating the scene
  useEffect(() => {
    liveRef.current = liveReading;
    sceneState.current?.applyVisualState?.(selectedZone, filterMode);
  }, [selectedZone, filterMode, liveReading]);

  const handleResetNorth = useCallback(() => {
    sceneState.current?.resetNorth?.();
  }, []);

  const hoverInfo = hovered?.hotspot
    ? { title: hovered.hotspot, subtitle: 'Flood hotspot', color: '#f43f5e' }
    : hovered?.lake
    ? { title: hovered.lake, subtitle: 'Water Body / Natural Basin', color: '#38bdf8' }
    : {
        title: hovered?.zone_id || '',
        subtitle: hovered
          ? `${hovered.risk_class} risk. Score ${hovered.risk_score ?? '-'}/100. Elev ${hovered.elevation_m ?? '-'}m`
          : '',
        color: RISK_COLORS[hovered?.risk_class] || '#10b981',
      };

  return (
    <div
      className="map-viewport map-viewport--3d"
      style={{
        position: 'relative',
        height: '560px',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        border: '1px solid var(--border-medium)',
        background: 'var(--bg-secondary)',
      }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <MapCompass
        angle={heading.angle}
        headingDeg={heading.headingDeg}
        cardinal={heading.cardinal}
        interactive
        onResetNorth={handleResetNorth}
      />
      {hovered && (
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            background: 'var(--bg-surface-glass)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${hoverInfo.color}`,
            borderRadius: 'var(--radius-sm)',
            padding: '8px 14px',
            pointerEvents: 'none',
            boxShadow: `0 0 16px ${hoverInfo.color}44`,
            zIndex: 10,
          }}
        >
          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: hoverInfo.color }}>
            {hoverInfo.title}
          </div>
          {hoverInfo.subtitle && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              {hoverInfo.subtitle}
            </div>
          )}
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          fontSize: '0.72rem',
          color: 'var(--text-muted)',
          background: 'var(--bg-surface-glass)',
          backdropFilter: 'blur(8px)',
          padding: '5px 12px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          zIndex: 5,
        }}
      >
        Drag to orbit. Scroll to zoom. Click compass to face North. Click zone to select
      </div>
    </div>
  );
}
