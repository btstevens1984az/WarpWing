import * as THREE from 'three'

/** Original fighter: the Nova Dart — low-poly N64-era silhouette, not an Arwing copy. */
export function createNovaDart(): THREE.Group {
  const ship = new THREE.Group()

  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xd8dde8 })
  const accentMat = new THREE.MeshLambertMaterial({ color: 0xff9f1c })
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x2a3348 })
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x4fd1c5 })
  const engineMat = new THREE.MeshLambertMaterial({ color: 0x66ffe0, emissive: 0x228877 })

  const fuselage = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.28, 1.4), bodyMat)
  fuselage.position.z = 0.1
  ship.add(fuselage)

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.7, 4), accentMat)
  nose.rotation.x = Math.PI / 2
  nose.position.z = -0.85
  ship.add(nose)

  const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.35), glassMat)
  canopy.position.set(0, 0.2, -0.15)
  ship.add(canopy)

  const wingGeo = new THREE.BoxGeometry(1.7, 0.08, 0.55)
  const wing = new THREE.Mesh(wingGeo, bodyMat)
  wing.position.set(0, -0.02, 0.15)
  ship.add(wing)

  const tipL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.7), accentMat)
  tipL.position.set(-0.95, 0, 0.05)
  ship.add(tipL)
  const tipR = tipL.clone()
  tipR.position.x = 0.95
  ship.add(tipR)

  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.35), darkMat)
  fin.position.set(0, 0.28, 0.35)
  ship.add(fin)

  const engL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.25, 6), engineMat)
  engL.rotation.x = Math.PI / 2
  engL.position.set(-0.28, -0.05, 0.75)
  ship.add(engL)
  const engR = engL.clone()
  engR.position.x = 0.28
  ship.add(engR)

  ship.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh) {
      m.castShadow = false
      m.receiveShadow = false
    }
  })

  return ship
}

export function createEnemyFighter(): THREE.Group {
  const g = new THREE.Group()
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.25, 0.9),
    new THREE.MeshLambertMaterial({ color: 0x8b3a4a }),
  )
  const wing = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.06, 0.35),
    new THREE.MeshLambertMaterial({ color: 0xc45c6a }),
  )
  wing.position.y = 0.05
  const eye = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.12, 0.12),
    new THREE.MeshLambertMaterial({ color: 0xffee66, emissive: 0xaa8800 }),
  )
  eye.position.set(0, 0.08, -0.4)
  g.add(hull, wing, eye)
  return g
}

export function createRing(): THREE.Mesh {
  const geo = new THREE.TorusGeometry(1.1, 0.08, 6, 12)
  const mat = new THREE.MeshLambertMaterial({ color: 0x4fd1c5, emissive: 0x114433 })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.rotation.y = Math.PI / 2
  return mesh
}

export function createTurret(): THREE.Group {
  const g = new THREE.Group()
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.55, 0.35, 6),
    new THREE.MeshLambertMaterial({ color: 0x5a6478 }),
  )
  const gun = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.18, 0.7),
    new THREE.MeshLambertMaterial({ color: 0xffb347 }),
  )
  gun.position.y = 0.35
  gun.position.z = -0.15
  g.add(base, gun)
  return g
}
