import * as THREE from 'three'
import { Input } from './input'
import { Sfx } from './sfx'
import { createEnemyFighter, createNovaDart, createRing, createTurret } from './models'

type Phase = 'title' | 'playing' | 'won' | 'lost'

type Bullet = {
  mesh: THREE.Mesh
  vel: THREE.Vector3
  life: number
  fromPlayer: boolean
}

type Enemy = {
  mesh: THREE.Object3D
  kind: 'fighter' | 'turret'
  hp: number
  t: number
  fireCd: number
  baseX: number
}

type Ring = {
  mesh: THREE.Object3D
  taken: boolean
}

export class Game {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(58, 1, 0.1, 400)
  private clock = new THREE.Clock()
  private input = new Input()
  private sfx = new Sfx()

  private world = new THREE.Group()
  private ship = createNovaDart()
  private shipX = 0
  private shipY = 0
  private roll = 0
  private rollTimer = 0
  private invuln = 0
  private speedMul = 1
  private progress = 0
  private readonly missionLength = 260

  private bullets: Bullet[] = []
  private enemies: Enemy[] = []
  private rings: Ring[] = []
  private fireCd = 0

  private score = 0
  private shields = 3
  private combo = 0
  private phase: Phase = 'title'
  private flash = 0

  private stars!: THREE.Points

  private hud = {
    score: document.getElementById('score')!,
    shieldBars: document.getElementById('shieldBars')!,
    speed: document.getElementById('speedReadout')!,
    combo: document.getElementById('combo')!,
    root: document.getElementById('hud')!,
    overlay: document.getElementById('overlay')!,
    overlayTitle: document.getElementById('overlayTitle')!,
    overlayBody: document.getElementById('overlayBody')!,
    boot: document.getElementById('boot')!,
    hint: document.getElementById('hint')!,
  }

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25))
    this.renderer.setClearColor(0x0a1430)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.scene.fog = new THREE.Fog(0x0a1430, 35, 140)
    this.scene.add(this.world)

    const hemi = new THREE.HemisphereLight(0xb0d0ff, 0x334422, 1.15)
    const sun = new THREE.DirectionalLight(0xffe2b0, 1.2)
    sun.position.set(4, 10, 2)
    this.scene.add(hemi, sun)

    this.buildSky()
    this.buildTerrain()
    this.scene.add(this.ship)
    this.ship.visible = false
    this.camera.position.set(0, 2.2, 7)

    window.addEventListener('resize', () => this.resize())
    this.resize()

    document.getElementById('startBtn')?.addEventListener('click', () => this.startMission())
    document.getElementById('retryBtn')?.addEventListener('click', () => this.startMission())
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Enter') {
        if (this.phase === 'title' || this.phase === 'won' || this.phase === 'lost') this.startMission()
      }
    })

    this.renderer.setAnimationLoop(() => this.frame())
  }

  private resize() {
    const w = window.innerWidth
    const h = window.innerHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h, false)
  }

  private buildSky() {
    const count = 800
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 220
      positions[i * 3 + 1] = Math.random() * 90 + 4
      positions[i * 3 + 2] = -Math.random() * 320
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.stars = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.4, sizeAttenuation: true }),
    )
    this.scene.add(this.stars)

    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(18, 10, 10),
      new THREE.MeshLambertMaterial({ color: 0xc45a32 }),
    )
    planet.position.set(-35, 18, -120)
    this.scene.add(planet)

    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(4, 8, 8),
      new THREE.MeshLambertMaterial({ color: 0xb8c4d8 }),
    )
    moon.position.set(42, 24, -95)
    this.scene.add(moon)
  }

  private buildTerrain() {
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x3d6b3a })
    const rockMat = new THREE.MeshLambertMaterial({ color: 0x6a5a48 })
    const waterMat = new THREE.MeshLambertMaterial({ color: 0x2a6a8a })
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x4a5568 })

    for (let z = 10; z > -this.missionLength - 50; z -= 10) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(54, 1, 10), groundMat)
      strip.position.set(0, -3.2, z)
      this.world.add(strip)

      if (Math.random() > 0.4) {
        const rock = new THREE.Mesh(
          new THREE.ConeGeometry(1 + Math.random(), 2 + Math.random() * 3.5, 5),
          rockMat,
        )
        rock.position.set((Math.random() - 0.5) * 30, -1.4, z + (Math.random() - 0.5) * 3)
        this.world.add(rock)
      }
      if (Math.random() > 0.75) {
        const pool = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.5, 0.35, 6), waterMat)
        pool.position.set((Math.random() - 0.5) * 18, -2.75, z)
        this.world.add(pool)
      }
    }

    for (let z = 0; z > -this.missionLength; z -= 16) {
      for (const side of [-1, 1] as const) {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.3, 9, 1.3), metalMat)
        pillar.position.set(side * 15, 1.2, z)
        this.world.add(pillar)
        const cap = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 2.2), metalMat)
        cap.position.set(side * 15, 5.6, z)
        this.world.add(cap)
      }
    }
  }

  startMission() {
    this.clearCombat()
    this.progress = 0
    this.score = 0
    this.shields = 3
    this.combo = 0
    this.shipX = 0
    this.shipY = 0
    this.roll = 0
    this.rollTimer = 0
    this.invuln = 0
    this.speedMul = 1
    this.fireCd = 0
    this.flash = 0
    this.phase = 'playing'
    this.ship.visible = true
    this.world.position.z = 0
    this.hud.boot.classList.add('hidden')
    this.hud.overlay.classList.add('hidden')
    this.hud.root.classList.remove('hidden')
    this.hud.hint.textContent = 'Q BRAKE · E BOOST · SHIFT ROLL · SPACE FIRE'
    this.seedCourse()
    this.updateHud()
  }

  private clearCombat() {
    for (const b of this.bullets) this.scene.remove(b.mesh)
    for (const e of this.enemies) this.world.remove(e.mesh)
    for (const r of this.rings) this.world.remove(r.mesh)
    this.bullets = []
    this.enemies = []
    this.rings = []
  }

  private seedCourse() {
    for (let z = -20; z > -this.missionLength + 25; z -= 14) {
      // Rings
      if (Math.random() > 0.3) {
        const ring = createRing()
        ring.position.set((Math.random() - 0.5) * 8, 0.2 + Math.random() * 2.8, z)
        this.world.add(ring)
        this.rings.push({ mesh: ring, taken: false })
      }

      // Enemies
      const roll = Math.random()
      if (roll < 0.5) {
        const mesh = createEnemyFighter()
        const x = (Math.random() - 0.5) * 10
        mesh.position.set(x, 0.5 + Math.random() * 2.5, z - 4)
        this.world.add(mesh)
        this.enemies.push({
          mesh,
          kind: 'fighter',
          hp: 2,
          t: Math.random() * Math.PI * 2,
          fireCd: 0.8 + Math.random(),
          baseX: x,
        })
      } else if (roll < 0.8) {
        const mesh = createTurret()
        const side = Math.random() > 0.5 ? 1 : -1
        mesh.position.set(side * (9 + Math.random() * 3), -1.55, z - 2)
        this.world.add(mesh)
        this.enemies.push({
          mesh,
          kind: 'turret',
          hp: 3,
          t: 0,
          fireCd: 1.2,
          baseX: mesh.position.x,
        })
      }
    }

    // Mini "boss gate" near the end
    for (const x of [-4, 0, 4]) {
      const mesh = createEnemyFighter()
      mesh.scale.setScalar(1.35)
      mesh.position.set(x, 1.5, -this.missionLength + 35)
      this.world.add(mesh)
      this.enemies.push({ mesh, kind: 'fighter', hp: 5, t: x, fireCd: 0.6, baseX: x })
    }
  }

  private frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05)
    if (this.phase === 'playing') this.updatePlay(dt)
    else this.idleCamera(dt)
    if (this.flash > 0) {
      this.flash -= dt
      this.renderer.setClearColor(this.flash > 0 ? 0x402020 : 0x0a1430)
    }
    this.renderer.render(this.scene, this.camera)
  }

  private idleCamera(dt: number) {
    const t = this.clock.elapsedTime
    this.camera.position.set(Math.sin(t * 0.25) * 4, 2.6 + Math.sin(t * 0.5) * 0.35, 9)
    this.camera.lookAt(0, 0.4, -12)
    this.stars.rotation.y += dt * 0.02
  }

  private updatePlay(dt: number) {
    const left = this.input.down('ArrowLeft') || this.input.down('KeyA')
    const right = this.input.down('ArrowRight') || this.input.down('KeyD')
    const up = this.input.down('ArrowUp') || this.input.down('KeyW')
    const down = this.input.down('ArrowDown') || this.input.down('KeyS')
    const brake = this.input.down('KeyQ')
    const boost = this.input.down('KeyE')

    const steer = 10
    if (left) this.shipX -= steer * dt
    if (right) this.shipX += steer * dt
    if (up) this.shipY += steer * dt
    if (down) this.shipY -= steer * dt
    this.shipX = THREE.MathUtils.clamp(this.shipX, -7.5, 7.5)
    this.shipY = THREE.MathUtils.clamp(this.shipY, -2.0, 4.0)

    if (this.rollTimer <= 0 && this.input.down('ShiftLeft')) {
      this.rollTimer = 0.5
      this.invuln = 0.5
      this.sfx.roll()
    }
    if (this.rollTimer > 0) {
      this.rollTimer -= dt
      this.roll += (Math.PI * 2 * dt) / 0.5
    } else {
      this.roll *= Math.pow(0.001, dt)
    }
    if (this.invuln > 0) this.invuln -= dt

    this.speedMul = boost ? 1.6 : brake ? 0.5 : 1
    this.progress += 26 * this.speedMul * dt
    this.world.position.z = this.progress

    this.ship.position.set(this.shipX, this.shipY, 0)
    this.ship.rotation.set(this.shipY * 0.05, -this.shipX * 0.04, -this.shipX * 0.08 + this.roll)
    if (this.invuln > 0) this.ship.visible = Math.floor(this.invuln * 20) % 2 === 0
    else this.ship.visible = true

    this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, this.shipX * 0.4, 0.08)
    this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, this.shipY * 0.35 + 2.15, 0.08)
    this.camera.position.z = 6.6
    this.camera.lookAt(this.shipX * 0.25, this.shipY * 0.25 + 0.3, -14)

    this.stars.position.z = this.progress * 0.25

    this.updateEnemies(dt)
    this.updateBullets(dt)
    this.updateRings()

    this.fireCd = Math.max(0, this.fireCd - dt)
    if ((this.input.down('Space') || this.input.down('KeyZ')) && this.fireCd <= 0) {
      this.firePlayer()
      this.fireCd = 0.11
    }

    if (this.progress >= this.missionLength) this.endMission(true)
    this.updateHud()
  }

  /** Convert world-local position to scene space while scrolling. */
  private worldToScene(local: THREE.Vector3, out = new THREE.Vector3()) {
    return out.copy(local).add(this.world.position)
  }

  private firePlayer() {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.7),
      new THREE.MeshBasicMaterial({ color: 0x7cffb2 }),
    )
    mesh.position.set(this.shipX, this.shipY, -1.3)
    this.scene.add(mesh)
    this.bullets.push({
      mesh,
      vel: new THREE.Vector3(0, 0, -75),
      life: 1.1,
      fromPlayer: true,
    })
    this.sfx.shoot()
  }

  private fireEnemy(e: Enemy) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.14, 0.45),
      new THREE.MeshBasicMaterial({ color: 0xff5a6a }),
    )
    const origin = this.worldToScene(e.mesh.position)
    mesh.position.copy(origin)
    this.scene.add(mesh)
    const toPlayer = new THREE.Vector3(this.shipX - origin.x, this.shipY - origin.y, 0 - origin.z)
      .normalize()
      .multiplyScalar(34)
    this.bullets.push({ mesh, vel: toPlayer, life: 2.4, fromPlayer: false })
  }

  private updateEnemies(dt: number) {
    const keep: Enemy[] = []
    for (const e of this.enemies) {
      e.t += dt
      if (e.kind === 'fighter') {
        e.mesh.position.x = e.baseX + Math.sin(e.t * 2.4) * 1.8
        e.mesh.rotation.z = Math.sin(e.t * 2) * 0.35
        e.mesh.rotation.y = Math.PI
      }

      const scenePos = this.worldToScene(e.mesh.position)
      e.fireCd -= dt
      if (e.fireCd <= 0 && scenePos.z < 20 && scenePos.z > -40) {
        this.fireEnemy(e)
        e.fireCd = e.kind === 'turret' ? 1.55 : 1.9
      }

      const dist = scenePos.distanceTo(new THREE.Vector3(this.shipX, this.shipY, 0))
      if (dist < 1.25) {
        this.damagePlayer()
        this.world.remove(e.mesh)
        this.sfx.boom()
        continue
      }

      if (scenePos.z > 14) {
        this.world.remove(e.mesh)
        continue
      }
      keep.push(e)
    }
    this.enemies = keep
  }

  private updateBullets(dt: number) {
    const keep: Bullet[] = []
    for (const b of this.bullets) {
      b.mesh.position.addScaledVector(b.vel, dt)
      b.life -= dt

      if (b.fromPlayer) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const e = this.enemies[i]
          const ep = this.worldToScene(e.mesh.position)
          if (b.mesh.position.distanceTo(ep) < 1.2) {
            e.hp -= 1
            this.scene.remove(b.mesh)
            this.sfx.hit()
            b.life = 0
            if (e.hp <= 0) {
              this.world.remove(e.mesh)
              this.enemies.splice(i, 1)
              this.combo += 1
              this.score += 200 + this.combo * 30
              this.sfx.boom()
              this.flash = 0.05
            }
            break
          }
        }
      } else if (this.invuln <= 0) {
        if (b.mesh.position.distanceTo(new THREE.Vector3(this.shipX, this.shipY, 0)) < 0.95) {
          this.damagePlayer()
          this.scene.remove(b.mesh)
          b.life = 0
        }
      }

      if (b.life > 0 && b.mesh.position.z > -100 && b.mesh.position.z < 25) keep.push(b)
      else this.scene.remove(b.mesh)
    }
    this.bullets = keep
  }

  private updateRings() {
    for (const r of this.rings) {
      if (r.taken) continue
      r.mesh.rotation.z += 0.04
      const p = this.worldToScene(r.mesh.position)
      if (p.distanceTo(new THREE.Vector3(this.shipX, this.shipY, 0)) < 1.35) {
        r.taken = true
        r.mesh.visible = false
        this.score += 500
        this.combo += 1
        this.sfx.ring()
      }
    }
  }

  private damagePlayer() {
    if (this.invuln > 0) return
    this.shields -= 1
    this.combo = 0
    this.invuln = 1.0
    this.flash = 0.12
    this.sfx.hurt()
    if (this.shields <= 0) this.endMission(false)
  }

  private endMission(won: boolean) {
    this.phase = won ? 'won' : 'lost'
    this.ship.visible = won
    this.hud.overlay.classList.remove('hidden')
    if (won) {
      this.score += 2000
      this.sfx.win()
      this.hud.overlayTitle.textContent = 'MISSION COMPLETE'
      this.hud.overlayBody.textContent = `Emberreach corridor cleared in the Nova Dart. Score ${this.score}. Built as an original developer learning project — thank you for playing WarpWing.`
    } else {
      this.hud.overlayTitle.textContent = 'NOVA DART DOWN'
      this.hud.overlayBody.textContent = `Shields depleted · score ${this.score}. Climb back in and try the corridor again.`
    }
    this.updateHud()
  }

  private updateHud() {
    this.hud.score.textContent = String(this.score)
    this.hud.shieldBars.style.transform = `scaleX(${Math.max(0, this.shields / 3)})`
    this.hud.speed.textContent = `SPEED ${Math.round(this.speedMul * 100)}%`
    this.hud.combo.textContent = this.combo > 1 ? `COMBO x${this.combo}` : ''
  }
}
