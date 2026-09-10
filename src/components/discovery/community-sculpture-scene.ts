import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { gsap } from 'gsap';

/** One canvas, finite entrance, then demand rendering. Wave profile adapted from
 * Vanta Waves by Teng Bao (MIT), see docs/vendor/vanta-LICENSE.md. */
export function mountCommunitySculpture(host: HTMLDivElement): () => void {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch { return () => {}; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 30);
  camera.position.set(0, 0.2, 7.6);
  camera.lookAt(0, -0.1, 0);
  const environment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(environment, 0.04);
  scene.environment = envMap.texture;
  environment.dispose();
  pmrem.dispose();

  const sculpture = new THREE.Group();
  scene.add(sculpture);
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.95);
  shape.bezierCurveTo(-0.2, -0.75, -1.05, -0.12, -1.05, 0.45);
  shape.bezierCurveTo(-1.05, 1.2, -0.3, 1.35, 0, 0.72);
  shape.bezierCurveTo(0.3, 1.35, 1.05, 1.2, 1.05, 0.45);
  shape.bezierCurveTo(1.05, -0.12, 0.2, -0.75, 0, -0.95);
  const heartGeometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.32, bevelEnabled: true, bevelSegments: 5,
    steps: 1, bevelSize: 0.15, bevelThickness: 0.18, curveSegments: 28,
  });
  heartGeometry.center();
  const blue = new THREE.MeshPhysicalMaterial({
    color: '#38b6ff', roughness: 0.24, metalness: 0.18, clearcoat: 1,
    clearcoatRoughness: 0.2,
  });
  const heart = new THREE.Mesh(heartGeometry, blue);
  heart.rotation.set(-0.09, -0.28, -0.08);
  sculpture.add(heart);
  const ringGeometry = new THREE.TorusGeometry(1.55, 0.045, 12, 100);
  const gold = new THREE.MeshStandardMaterial({ color: '#ffde59', metalness: 0.45, roughness: 0.28 });
  const ring = new THREE.Mesh(ringGeometry, gold);
  ring.rotation.set(1.15, 0.25, -0.3);
  ring.position.y = -0.15;
  sculpture.add(ring);

  const wavesGeometry = new THREE.PlaneGeometry(6, 3, 40, 20);
  wavesGeometry.rotateX(-Math.PI / 2);
  const waveVertices = wavesGeometry.attributes.position;
  const waveMaterial = new THREE.MeshStandardMaterial({
    color: '#8bd7f6', transparent: true, opacity: 0.42,
    roughness: 0.5, metalness: 0.08, side: THREE.DoubleSide,
  });
  const waves = new THREE.Mesh(wavesGeometry, waveMaterial);
  waves.position.set(0, -1.75, -0.6);
  scene.add(waves);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8ebcda, 1));
  const light = new THREE.DirectionalLight(0xffffff, 1.8);
  light.position.set(-3, 5, 4);
  scene.add(light);

  let frame = 0;
  let visible = true;
  let dead = false;
  const state = { intro: 0, x: 0, y: 0, wave: 0 };
  const render = () => {
    frame = 0;
    if (dead || !visible || document.hidden) return;
    sculpture.scale.setScalar(0.86 + state.intro * 0.14);
    sculpture.rotation.set(state.x, state.y, 0);
    sculpture.position.y = (1 - state.intro) * -0.2;
    for (let i = 0; i < waveVertices.count; i++) {
      const x = waveVertices.getX(i);
      const z = waveVertices.getZ(i);
      const crossChop = Math.cos(-x - z * 0.7);
      const delta = Math.sin(state.wave - x * 1.1 + z * 0.65 + crossChop);
      waveVertices.setY(i, ((delta + 1) ** 2 / 4) * 0.18);
    }
    waveVertices.needsUpdate = true;
    wavesGeometry.computeVertexNormals();
    renderer.render(scene, camera);
    host.dataset.ready = 'true';
  };
  const requestRender = () => {
    if (!frame && !dead && visible && !document.hidden) frame = requestAnimationFrame(render);
  };
  const context = gsap.context(() => {
    gsap.timeline({ onUpdate: requestRender })
      .to(state, { intro: 1, duration: 0.8, ease: 'power3.out' }, 0)
      .to(state, { wave: 1.5, duration: 2.4, ease: 'power2.out' }, 0);
  });
  const moveX = gsap.quickTo(state, 'x', { duration: 0.7, ease: 'power3.out', onUpdate: requestRender });
  const moveY = gsap.quickTo(state, 'y', { duration: 0.7, ease: 'power3.out', onUpdate: requestRender });
  const surface = host.parentElement!;
  const pointer = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || !window.matchMedia('(pointer: fine)').matches) return;
    const bounds = surface.getBoundingClientRect();
    moveY(((event.clientX - bounds.left) / bounds.width - 0.5) * 0.3);
    moveX(((event.clientY - bounds.top) / bounds.height - 0.5) * 0.16);
  };
  const reset = () => { moveX(0); moveY(0); };
  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    requestRender();
  };
  const visibility = () => {
    if (!visible || document.hidden) {
      context.getTweens().forEach(tween => tween.pause());
      moveX.tween.pause(); moveY.tween.pause();
      cancelAnimationFrame(frame); frame = 0;
    } else {
      context.getTweens().forEach(tween => tween.resume());
      moveX.tween.resume(); moveY.tween.resume();
      requestRender();
    }
  };
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; visibility(); });
  const resizeObserver = new ResizeObserver(resize);
  const lost = () => { cleanup(); };
  const cleanup = () => {
    if (dead) return;
    dead = true;
    cancelAnimationFrame(frame);
    context.revert(); moveX.tween.kill(); moveY.tween.kill();
    observer.disconnect(); resizeObserver.disconnect();
    document.removeEventListener('visibilitychange', visibility);
    surface.removeEventListener('pointermove', pointer);
    surface.removeEventListener('pointerleave', reset);
    renderer.domElement.removeEventListener('webglcontextlost', lost);
    heartGeometry.dispose(); ringGeometry.dispose(); wavesGeometry.dispose();
    blue.dispose(); gold.dispose(); waveMaterial.dispose(); envMap.dispose();
    renderer.dispose(); renderer.domElement.remove();
    delete host.dataset.ready;
  };
  host.appendChild(renderer.domElement);
  renderer.domElement.addEventListener('webglcontextlost', lost);
  surface.addEventListener('pointermove', pointer, { passive: true });
  surface.addEventListener('pointerleave', reset);
  document.addEventListener('visibilitychange', visibility);
  resizeObserver.observe(host); observer.observe(host); resize();
  return cleanup;
}
