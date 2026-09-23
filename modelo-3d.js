// Isolated M1 viewer. No imports or writes to the landing's scripts or styles.
const viewport = document.querySelector('#viewport');
const canvas = document.querySelector('#body-canvas');
const status = document.querySelector('#status');
const loading = document.querySelector('#loading');
const controlsField = document.querySelector('#viewer-controls');
const retry = document.querySelector('#retry');
retry.addEventListener('click', () => location.reload());

function fail(message, error) {
  console.error('[GFIT 3D]', error);
  viewport.dataset.state = 'error';
  viewport.setAttribute('aria-busy', 'false');
  loading.hidden = true;
  controlsField.disabled = true;
  status.textContent = message;
  retry.hidden = false;
}

async function start() {
  // Dynamic imports ensure missing modules also produce an actionable error.
  const [THREE, { OrbitControls }, { GLTFLoader }] = await Promise.all([
    import('three'), import('three/addons/controls/OrbitControls.js'),
    import('three/addons/loaders/GLTFLoader.js')
  ]);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch (error) {
    fail('No se pudo iniciar la vista 3D. Prueba un navegador con WebGL 2 activado.', error);
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0xffffff, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.01, 40);
  const controls = new OrbitControls(camera, canvas);
  controls.enabled = false;
  controls.enablePan = false;
  controls.enableDamping = false; // Render on demand: zero animation loop when idle.
  controls.rotateSpeed = 0.7;
  controls.zoomSpeed = 0.8;
  controls.minPolarAngle = Math.PI * 0.18;
  controls.maxPolarAngle = Math.PI * 0.82;
  controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x858581, 2.5));
  const key = new THREE.DirectionalLight(0xffffff, 3);
  key.position.set(-3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 2);
  rim.position.set(3, 3, -3);
  scene.add(rim);
  let contextLost = false;
  function render() {
    if (!contextLost && !document.hidden) renderer.render(scene, camera);
  }
  controls.addEventListener('change', render);
  let fitDistance = 3;
  let bodySize;
  function fit() {
    if (!bodySize) return;
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
    fitDistance = Math.max(bodySize.y / (2 * Math.tan(halfFov)),
      bodySize.x / (2 * Math.tan(halfFov) * camera.aspect)) * 1.18 + bodySize.z / 2;
    controls.minDistance = fitDistance * 0.55;
    controls.maxDistance = fitDistance * 1.6;
  }
  function setView(angle, resetDistance = false) {
    const distance = resetDistance ? fitDistance : camera.position.distanceTo(controls.target);
    camera.position.set(Math.sin(angle) * distance, controls.target.y, Math.cos(angle) * distance);
    controls.update();
    render();
  }
  function resize() {
    const { width, height } = viewport.getBoundingClientRect();
    if (!width || !height) return;
    const oldFit = fitDistance;
    const offset = camera.position.clone().sub(controls.target);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height, false);
    fit();
    if (bodySize && offset.lengthSq()) camera.position.copy(controls.target).add(offset.multiplyScalar(fitDistance / oldFit));
    controls.update();
    render();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(viewport);
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    contextLost = true;
    controls.enabled = false;
    fail('La vista 3D se ha interrumpido. Pulsa «Volver a intentar» para recuperarla.', 'WebGL context lost');
  });
  document.addEventListener('visibilitychange', render);
  resize();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  let gltf;
  try {
    const response = await fetch(new URL('./models/body-male.glb', import.meta.url), { signal: controller.signal });
    if (!response.ok) throw new Error(`Model HTTP ${response.status}`);
    const data = await response.arrayBuffer();
    gltf = await new GLTFLoader().parseAsync(data, '');
  } finally {
    clearTimeout(timeout);
  }
  if (contextLost) return;
  const body = gltf.scene;
  const box = new THREE.Box3().setFromObject(body);
  bodySize = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  body.position.set(-center.x, -box.min.y, -center.z);
  scene.add(body);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(0.48, 64),
    new THREE.MeshBasicMaterial({ color: 0xc8c8c4, transparent: true, opacity: 0.3, depthWrite: false }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.008;
  scene.add(ground);
  controls.target.set(0, bodySize.y / 2, 0);
  fit();
  setView(0, true);
  controls.enabled = true;
  controlsField.disabled = false;
  loading.hidden = true;
  viewport.setAttribute('aria-busy', 'false');
  viewport.dataset.state = 'ready';
  status.textContent = 'Modelo de prueba · Listo para explorar';

  const spherical = new THREE.Spherical();
  function rotate(horizontal, vertical = 0) {
    spherical.setFromVector3(camera.position.clone().sub(controls.target));
    spherical.theta += horizontal;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi + vertical, controls.minPolarAngle, controls.maxPolarAngle);
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
    controls.update();
  }
  function zoom(factor) {
    const offset = camera.position.clone().sub(controls.target);
    offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance));
    camera.position.copy(controls.target).add(offset);
    controls.update();
  }
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
    setView({ front: 0, side: Math.PI / 2, back: Math.PI }[button.dataset.view]);
  }));
  document.querySelector('#rotate-left').addEventListener('click', () => rotate(-Math.PI / 8));
  document.querySelector('#rotate-right').addEventListener('click', () => rotate(Math.PI / 8));
  document.querySelector('#zoom-in').addEventListener('click', () => zoom(0.85));
  document.querySelector('#zoom-out').addEventListener('click', () => zoom(1 / 0.85));
  document.querySelector('#reset').addEventListener('click', () => setView(0, true));
  canvas.addEventListener('keydown', event => {
    const actions = {
      ArrowLeft: () => rotate(-Math.PI / 16), ArrowRight: () => rotate(Math.PI / 16),
      ArrowUp: () => rotate(0, -Math.PI / 32), ArrowDown: () => rotate(0, Math.PI / 32),
      '+': () => zoom(0.9), '=': () => zoom(0.9), '-': () => zoom(1 / 0.9),
      Home: () => setView(0, true)
    };
    if (!controls.enabled || !actions[event.key]) return;
    event.preventDefault();
    actions[event.key]();
  });
}
start().catch(error => fail('No pudimos cargar el modelo. Comprueba tu conexión y vuelve a intentar.', error));
