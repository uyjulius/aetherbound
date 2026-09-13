import * as THREE from 'three';

export class Effects {
  constructor(root) {
    this.root = root;
    this.live = [];
  }

  burst(position, color = '#ffcb69', count = 18) {
    const geometry = new THREE.BufferGeometry();
    const points = new Float32Array(count * 3);
    const velocity = [];
    for (let i = 0; i < count; i += 1) {
      const offset = i * 3;
      points[offset] = (Math.random() - .5) * .35;
      points[offset + 1] = .45 + Math.random() * .7;
      points[offset + 2] = (Math.random() - .5) * .35;
      velocity.push(new THREE.Vector3((Math.random() - .5) * 4, 1.8 + Math.random() * 3.2, (Math.random() - .5) * 4));
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
    const material = new THREE.PointsMaterial({ color, size: .18, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending });
    const object = new THREE.Points(geometry, material);
    object.position.copy(position);
    this.root.add(object);
    this.live.push({ object, velocity, age: 0, life: .75, kind: 'particles' });
    return object;
  }

  ring(position, color = '#7de5ed') {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .85, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    const object = new THREE.Mesh(new THREE.RingGeometry(.25, .34, 32), material);
    object.position.copy(position);
    object.position.y += .08;
    object.rotation.x = -Math.PI / 2;
    this.root.add(object);
    this.live.push({ object, age: 0, life: .9, kind: 'ring' });
    return object;
  }

  slash(position, color = '#fff2c0') {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    const object = new THREE.Mesh(new THREE.PlaneGeometry(.12, 2.5), material);
    object.position.copy(position);
    object.position.y += 1;
    object.rotation.set(0, .4, -.85);
    this.root.add(object);
    this.live.push({ object, age: 0, life: .36, kind: 'slash' });
  }

  update(dt) {
    for (const fx of this.live) {
      fx.age += dt;
      const t = fx.age / fx.life;
      fx.object.material.opacity = 1 - t;
      if (fx.kind === 'ring') fx.object.scale.setScalar(1 + t * 5);
      if (fx.kind === 'slash') fx.object.scale.x = 1 + t * 6;
      if (fx.kind === 'particles') {
        const positions = fx.object.geometry.attributes.position;
        for (let i = 0; i < fx.velocity.length; i += 1) {
          const velocity = fx.velocity[i];
          velocity.y -= dt * 5;
          positions.setXYZ(i, positions.getX(i) + velocity.x * dt, positions.getY(i) + velocity.y * dt, positions.getZ(i) + velocity.z * dt);
        }
        positions.needsUpdate = true;
      }
      if (t >= 1) {
        fx.object.geometry.dispose();
        fx.object.material.dispose();
        fx.object.removeFromParent();
      }
    }
    this.live = this.live.filter((fx) => fx.age < fx.life);
  }

  clear() {
    for (const fx of this.live) fx.object.removeFromParent();
    this.live = [];
  }
}
