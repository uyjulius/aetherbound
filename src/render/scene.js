import * as THREE from 'three';

const SKY_VERTEX = `
  varying vec3 ray;
  void main() {
    ray = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT = `
  uniform vec3 zenith;
  uniform vec3 horizon;
  uniform vec3 glow;
  varying vec3 ray;
  void main() {
    float h = normalize(ray).y * .5 + .5;
    vec3 color = mix(horizon, zenith, smoothstep(.12, .9, h));
    float sun = pow(max(dot(normalize(ray), normalize(vec3(-.55,.38,-.72))), 0.0), 22.0);
    gl_FragColor = vec4(color + glow * sun * .45, 1.0);
  }
`;

const ENVIRONMENTS = {
  night: ['#07111f', '#26394c', '#8cc9d1'],
  cave: ['#070a10', '#161821', '#875942'],
  ruin: ['#171421', '#5b4a53', '#d3a761'],
  snow: ['#55738f', '#b7cad4', '#f4e7c2'],
  dusk: ['#202239', '#a06a66', '#f0bd78'],
  day: ['#346b8c', '#a5cad2', '#ffe3a1'],
  industrial: ['#26333c', '#81786b', '#f3cf9e'],
  interior: ['#29242a', '#65544c', '#ffd6a4'],
  aether: ['#111b39', '#566e8e', '#addfe8'],
};

export class GameRenderer {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x526a70, .012);
    this.camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, .08, 240);
    this.camera.position.set(11, 12, 15);

    this.worldRoot = new THREE.Group();
    this.worldRoot.name = 'world';
    this.battleRoot = new THREE.Group();
    this.battleRoot.name = 'battle';
    this.fxRoot = new THREE.Group();
    this.scene.add(this.worldRoot, this.battleRoot, this.fxRoot);
    this.battleRoot.visible = false;

    this.skyMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        zenith: { value: new THREE.Color('#346b8c') },
        horizon: { value: new THREE.Color('#a5cad2') },
        glow: { value: new THREE.Color('#ffe3a1') },
      },
      vertexShader: SKY_VERTEX,
      fragmentShader: SKY_FRAGMENT,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(110, 24, 16), this.skyMaterial);
    this.scene.add(this.sky);

    this.ambient = new THREE.HemisphereLight(0xc4e1ed, 0x2c2520, 1.9);
    this.sun = new THREE.DirectionalLight(0xffe7b5, 3.3);
    this.sun.position.set(-18, 28, 12);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.left = this.sun.shadow.camera.bottom = -24;
    this.sun.shadow.camera.right = this.sun.shadow.camera.top = 24;
    this.sun.shadow.camera.far = 80;
    this.scene.add(this.ambient, this.sun, this.sun.target);

    this.followTarget = new THREE.Vector3();
    this.cameraAim = new THREE.Vector3();
    this.cameraOffset = new THREE.Vector3(10, 11, 14);
    this.resize = this.resize.bind(this);
    addEventListener('resize', this.resize);
  }

  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight, false);
  }

  setEnvironment(map = {}) {
    const key = map.kind === 'Interior' ? 'interior' : map.base === 'cave' ? 'cave' : map.base === 'magitek' ? 'industrial'
      : map.base === 'aether' || map.id === 'observatory' ? 'aether' : map.light === 'night' ? 'night'
      : map.grade === 'snow' || map.base === 'snow' ? 'snow'
        : map.light === 'dusk' ? 'dusk'
          : map.grade === 'ruin' || map.kind === 'dungeon' ? 'ruin' : 'day';
    const [top, edge, sun] = ENVIRONMENTS[key] ?? ENVIRONMENTS.day;
    this.skyMaterial.uniforms.zenith.value.set(top);
    this.skyMaterial.uniforms.horizon.value.set(edge);
    this.skyMaterial.uniforms.glow.value.set(sun);
    this.scene.fog.color.set(edge);
    this.scene.fog.density = map.kind === 'dungeon' ? .026 : .011;
    this.sun.color.set(sun);
    this.sun.intensity = key === 'night' ? 1.4 : ['cave', 'interior'].includes(key) ? 1.5 : 2.8;
    this.ambient.intensity = key === 'night' ? 1.6 : 2.05;
    this.ambient.color.set(['cave', 'interior', 'industrial'].includes(key) ? '#d3d2c6' : '#c4e1ed');
    const distance = Number(map.cameraDistance) || (map.kind === 'Airship' ? 20 : 17);
    this.cameraOffset.set(distance * .58, distance * .62, distance * .78);
  }

  showBattle(visible) {
    this.worldRoot.visible = !visible;
    this.battleRoot.visible = visible;
  }

  track(position, immediate = false) {
    this.followTarget.copy(position);
    if (immediate) {
      this.cameraAim.copy(position);
      this.camera.position.copy(position).add(this.cameraOffset);
    }
  }

  update(dt) {
    const smoothing = 1 - Math.exp(-dt * 5.2);
    this.cameraAim.lerp(this.followTarget, smoothing);
    const desired = this.followTarget.clone().add(this.cameraOffset);
    this.camera.position.lerp(desired, smoothing);
    this.camera.lookAt(this.cameraAim.x, this.cameraAim.y + .9, this.cameraAim.z);
    this.sky.position.copy(this.camera.position);
    this.sun.position.copy(this.followTarget).add(new THREE.Vector3(-18, 28, 12));
    this.sun.target.position.copy(this.followTarget); this.sun.target.updateMatrixWorld();
  }

  render() { this.renderer.render(this.scene, this.camera); }

  project(position) {
    const projected = position.clone().project(this.camera);
    return { x: (projected.x * .5 + .5) * innerWidth, y: (-projected.y * .5 + .5) * innerHeight };
  }
}
