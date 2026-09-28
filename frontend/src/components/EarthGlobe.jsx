'use client';
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function EarthGlobe({
  width = 400,
  height = 400,
  autoRotate = true,
  markers = [] // Array of { lat, lng, color, label }
}) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const globeRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      width / height,
      0.1,
      1000
    );
    camera.position.z = 3;

    // Renderer with transparency
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Directional light (simulating sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    // Create Earth sphere
    const geometry = new THREE.SphereGeometry(1, 64, 64);

    // Earth material with color (no texture needed)
    const material = new THREE.MeshPhongMaterial({
      color: 0x2a5a7a, // Deep blue-green for ocean
      emissive: 0x0a1a2a,
      shininess: 25,
      specular: 0x333333,
    });

    const globe = new THREE.Mesh(geometry, material);
    scene.add(globe);
    globeRef.current = globe;

    // Add subtle atmosphere glow
    const atmosphereGeometry = new THREE.SphereGeometry(1.05, 64, 64);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x4a9fd8,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphere);

    // Add land masses as darker green patches (simplified continents)
    const continentGeometry = new THREE.SphereGeometry(1.005, 64, 64);
    const continentMaterial = new THREE.MeshPhongMaterial({
      color: 0x3a6a4a, // Forest green for land
      transparent: true,
      opacity: 0.9,
    });
    const continents = new THREE.Mesh(continentGeometry, continentMaterial);
    scene.add(continents);

    // Add grid lines (latitude/longitude)
    const gridMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.1,
    });

    // Create latitude lines
    for (let i = -80; i <= 80; i += 20) {
      const latGeometry = new THREE.BufferGeometry();
      const latPoints = [];
      const lat = (i * Math.PI) / 180;
      const radius = Math.cos(lat);
      for (let j = 0; j <= 360; j += 5) {
        const lng = (j * Math.PI) / 180;
        latPoints.push(
          radius * Math.cos(lng),
          Math.sin(lat),
          radius * Math.sin(lng)
        );
      }
      latGeometry.setAttribute('position', new THREE.Float32BufferAttribute(latPoints, 3));
      const latLine = new THREE.Line(latGeometry, gridMaterial);
      scene.add(latLine);
    }

    // Create longitude lines
    for (let i = 0; i < 360; i += 20) {
      const lngGeometry = new THREE.BufferGeometry();
      const lngPoints = [];
      const lng = (i * Math.PI) / 180;
      for (let j = -90; j <= 90; j += 5) {
        const lat = (j * Math.PI) / 180;
        lngPoints.push(
          Math.cos(lat) * Math.cos(lng),
          Math.sin(lat),
          Math.cos(lat) * Math.sin(lng)
        );
      }
      lngGeometry.setAttribute('position', new THREE.Float32BufferAttribute(lngPoints, 3));
      const lngLine = new THREE.Line(lngGeometry, gridMaterial);
      scene.add(lngLine);
    }

    // Add markers for flood zones
    if (markers && markers.length > 0) {
      markers.forEach(marker => {
        const { lat, lng, color = 0xef4444 } = marker;
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lng + 180) * (Math.PI / 180);

        const markerGeometry = new THREE.SphereGeometry(0.02, 16, 16);
        const markerMaterial = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.9,
        });
        const markerMesh = new THREE.Mesh(markerGeometry, markerMaterial);

        markerMesh.position.set(
          Math.sin(phi) * Math.cos(theta),
          Math.cos(phi),
          Math.sin(phi) * Math.sin(theta)
        );

        // Add glow ring around marker
        const ringGeometry = new THREE.RingGeometry(0.025, 0.035, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(markerMesh.position);
        ring.lookAt(0, 0, 0);

        scene.add(markerMesh);
        scene.add(ring);
      });
    }

    // Animation loop
    let rotation = 0;
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      if (autoRotate) {
        rotation += 0.001;
        globe.rotation.y = rotation;
        continents.rotation.y = rotation;
      }

      // Subtle wobble for more organic feel
      globe.rotation.x = Math.sin(rotation * 0.5) * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      geometry.dispose();
      material.dispose();
      atmosphereGeometry.dispose();
      atmosphereMaterial.dispose();
      continentGeometry.dispose();
      continentMaterial.dispose();
      renderer.dispose();
    };
  }, [width, height, autoRotate, markers]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}
    />
  );
}
