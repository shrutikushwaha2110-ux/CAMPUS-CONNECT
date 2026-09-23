import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// N4: read at mount AND on change, so turning "reduce motion" on in the OS stops the scene immediately
const reducedMotionQuery = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

interface Shape {
  mesh: THREE.Mesh;
  rotSpeed: THREE.Vector3;
  floatOffset: number;
}

export function HeroScene({ className = '' }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    // WebGL availability check — degrade gracefully (N4)
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return;
    }

    const w = el.clientWidth;
    const h = el.clientHeight;
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
    camera.position.set(0, 0, 8);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(5, 8, 5);
    scene.add(dir);

    const primaryColor = new THREE.Color('#4637D2');
    const darkColor = new THREE.Color('#1C1750');
    const lightColor = new THREE.Color('#8b7ff5');

    // Geometries representing campus elements
    const geometries = [
      new THREE.OctahedronGeometry(0.7),
      new THREE.TetrahedronGeometry(0.8),
      new THREE.TorusGeometry(0.5, 0.18, 12, 40),
      new THREE.IcosahedronGeometry(0.6),
      new THREE.OctahedronGeometry(0.45),
      new THREE.TorusGeometry(0.35, 0.12, 10, 32),
      new THREE.TetrahedronGeometry(0.5),
      new THREE.SphereGeometry(0.3, 12, 10),
    ];

    const colors = [primaryColor, lightColor, darkColor, primaryColor, lightColor, darkColor, primaryColor, lightColor];

    // On mobile use fewer shapes (N3 mobile lighter scene)
    const isMobile = w < 600;
    const count = isMobile ? 4 : geometries.length;

    const positions = [
      [-3.5, 1.5, -2], [3.2, 1.8, -1.5], [-2.8, -1.2, -1],
      [3.8, -1.0, -2], [-4.2, 0.2, -3], [2.0, -2.2, -1],
      [-1.5, 2.4, -2.5], [4.5, 0.8, -3],
    ];

    const shapes: Shape[] = [];
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: colors[i],
        roughness: 0.3,
        metalness: 0.6,
        transparent: true,
        opacity: 0.85,
      });
      const mesh = new THREE.Mesh(geometries[i], mat);
      const [x, y, z] = positions[i] as [number, number, number];
      mesh.position.set(x, y, z);
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      );
      scene.add(mesh);
      shapes.push({
        mesh,
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.008,
          (Math.random() - 0.5) * 0.012,
          (Math.random() - 0.5) * 0.006,
        ),
        floatOffset: Math.random() * Math.PI * 2,
      });
    }

    // Particle field
    if (!isMobile) {
      const particleCount = 200;
      const positions2 = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount; i++) {
        positions2[i * 3] = (Math.random() - 0.5) * 20;
        positions2[i * 3 + 1] = (Math.random() - 0.5) * 12;
        positions2[i * 3 + 2] = (Math.random() - 0.5) * 8 - 4;
      }
      const pbg = new THREE.BufferGeometry();
      pbg.setAttribute('position', new THREE.BufferAttribute(positions2, 3));
      const pmat = new THREE.PointsMaterial({ color: '#8b7ff5', size: 0.04, transparent: true, opacity: 0.5 });
      scene.add(new THREE.Points(pbg, pmat));
    }

    // Mouse parallax
    const mouse = { x: 0, y: 0 };
    const onMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMouseMove);

    // Animation loop. With reduced motion we draw ONE static frame and stop the loop entirely.
    // data-motion / data-frames on the container let tests (and you, in DevTools) verify this.
    let rafId = 0;
    let frames = 0;
    let elapsed = 0;
    let lastTime = performance.now();
    const mq = reducedMotionQuery();
    let reduced = !!mq?.matches;

    const renderFrame = () => {
      renderer.render(scene, camera);
      frames++;
      el.dataset.frames = String(frames);
    };

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const now = performance.now();
      elapsed += (now - lastTime) / 1000;
      lastTime = now;
      const t = elapsed;
      shapes.forEach(s => {
        s.mesh.rotation.x += s.rotSpeed.x;
        s.mesh.rotation.y += s.rotSpeed.y;
        s.mesh.rotation.z += s.rotSpeed.z;
        // gentle float
        s.mesh.position.y += Math.sin(t + s.floatOffset) * 0.0015;
      });
      // camera parallax
      camera.position.x += (mouse.x * 0.8 - camera.position.x) * 0.03;
      camera.position.y += (mouse.y * 0.5 - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);
      renderFrame();
    };

    const applyMotionSetting = () => {
      cancelAnimationFrame(rafId);
      el.dataset.motion = reduced ? 'reduced' : 'full';
      if (reduced) {
        camera.position.set(0, 0, 8);
        camera.lookAt(0, 0, 0);
        renderFrame(); // static equivalent
      } else {
        lastTime = performance.now();
        animate();
      }
    };
    const onMotionChange = (e: MediaQueryListEvent) => { reduced = e.matches; applyMotionSetting(); };
    mq?.addEventListener?.('change', onMotionChange);
    applyMotionSetting();

    // Resize handler
    const onResize = () => {
      const nw = el.clientWidth;
      const nh = el.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
      if (reduced) renderFrame(); // keep the static frame sharp after a resize
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(rafId);
      mq?.removeEventListener?.('change', onMotionChange);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      geometries.forEach(g => g.dispose());
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className={`absolute inset-0 ${className}`} aria-hidden="true" />;
}
