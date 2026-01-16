// ===== GAME DATA =====
let gamesData = []



// ===== THREE.JS GAME VIEWER =====
class GameViewer3D {
  constructor(canvas) {
    this.canvas = canvas
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 1000)
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
    })
    this.models = []
    this.activeModel = null
    this.viewMode = "all"
    this.autoRotate = true
    this.wireframeMode = false
    this.isDragging = false
    this.previousMousePosition = { x: 0, y: 0 }
    this.hoveredModel = null

    this.init()
  }

  init() {
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setClearColor(0x0a0a0a, 1)

    this.camera.position.z = 8

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 1)
    this.scene.add(ambientLight)

    const mainLight = new THREE.DirectionalLight(0x00ff40, 1)
    mainLight.position.set(5, 5, 5)
    this.scene.add(mainLight)

    const backLight = new THREE.DirectionalLight(0xff0040, 0.5)
    backLight.position.set(-5, -5, -5)
    this.scene.add(backLight)

    // Grid
    const gridHelper = new THREE.GridHelper(10, 10, 0x00ff40, 0x1a1a1a)
    gridHelper.position.y = -2
    this.scene.add(gridHelper)

    this.setupEvents()
    this.animate()

    window.addEventListener("resize", () => this.onResize())
  }

  setupEvents() {
    this.canvas.addEventListener("mousedown", (e) => {
      this.isDragging = true
      this.previousMousePosition = { x: e.clientX, y: e.clientY }
    })

    document.addEventListener("mouseup", () => {
      this.isDragging = false
    })

    document.addEventListener("mousemove", (e) => {
      if (this.isDragging) {
        const deltaX = e.clientX - this.previousMousePosition.x
        const deltaY = e.clientY - this.previousMousePosition.y

        if (this.viewMode === "single" && this.activeModel) {
          this.activeModel.rotation.y += deltaX * 0.01
          this.activeModel.rotation.x += deltaY * 0.01
        } else {
          this.models.forEach((m) => {
            m.mesh.rotation.y += deltaX * 0.01
            m.mesh.rotation.x += deltaY * 0.01
          })
        }

        this.previousMousePosition = { x: e.clientX, y: e.clientY }
      }
    })

    this.canvas.addEventListener("mousemove", (e) => {
      if (this.viewMode !== "all") return

      const rect = this.canvas.getBoundingClientRect()
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      )

      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(mouse, this.camera)

      const meshes = this.models.map((m) => m.mesh).filter((m) => m.isMesh)
      // Also check children for loaded GLTF models
      const allMeshes = []
      this.models.forEach((m) => {
        if (m.mesh.isMesh) {
          allMeshes.push(m.mesh)
        } else {
          m.mesh.traverse((child) => {
            if (child.isMesh) allMeshes.push(child)
          })
        }
      })

      const intersects = raycaster.intersectObjects(allMeshes, true)

      // Reset all materials
      this.models.forEach((m) => {
        this.setWireframe(m.mesh, this.wireframeMode)
      })

      if (intersects.length > 0) {
        // Find parent model
        const hitObject = intersects[0].object
        this.models.forEach((m) => {
          let isChild = false
          m.mesh.traverse((child) => {
            if (child === hitObject) isChild = true
          })
          if (isChild || m.mesh === hitObject) {
            this.setWireframe(m.mesh, true)
          }
        })
        this.canvas.style.cursor = "pointer"
      } else {
        this.canvas.style.cursor = "grab"
      }
    })

    this.canvas.addEventListener("wheel", (e) => {
      e.preventDefault()
      this.camera.position.z += e.deltaY * 0.01
      this.camera.position.z = Math.max(3, Math.min(15, this.camera.position.z))
    })
  }

  setWireframe(object, value) {
    if (object.isMesh && object.material) {
      object.material.wireframe = value
    }
    object.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.wireframe = value
      }
    })
  }

  async addModel(name, modelConfig, position = { x: 0, y: 0, z: 0 }) {
    let mesh

    if (window.modelLoader && window.modelLoader.loader && modelConfig.path) {
      try {
        mesh = await window.modelLoader.loadWithFallback(modelConfig.path, modelConfig.fallbackType, {
          scale: 1,
          position,
          color: 0x00ff40,
        })
      } catch (e) {
        mesh = this.createFallbackMesh(modelConfig.fallbackType)
        mesh.position.set(position.x, position.y, position.z)
      }
    } else {
      mesh = this.createFallbackMesh(modelConfig.fallbackType)
      mesh.position.set(position.x, position.y, position.z)
    }

    mesh.userData = { name, type: modelConfig.fallbackType }
    this.scene.add(mesh)
    this.models.push({ name, mesh, originalPosition: { ...position } })

    return mesh
  }

  createFallbackMesh(type) {
    let geometry

    switch (type) {
      case "skull":
        geometry = new THREE.IcosahedronGeometry(1, 0)
        break
      case "cube":
        geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5)
        break
      case "torus":
        geometry = new THREE.TorusKnotGeometry(0.7, 0.25, 64, 8)
        break
      default:
        geometry = new THREE.SphereGeometry(1, 8, 6)
    }

    const material = new THREE.MeshStandardMaterial({
      color: 0x00ff40,
      metalness: 0.6,
      roughness: 0.4,
      wireframe: this.wireframeMode,
      flatShading: true,
    })

    return new THREE.Mesh(geometry, material)
  }

  setViewMode(mode, modelName = null) {
    this.viewMode = mode
    const hint = document.querySelector(".viewer-hint")

    if (mode === "all") {
      this.models.forEach((m) => {
        m.mesh.visible = true
        m.mesh.position.set(m.originalPosition.x, m.originalPosition.y, m.originalPosition.z)
      })
      this.activeModel = null
      if (hint) hint.textContent = "HOVER TO HIGHLIGHT • DRAG TO ROTATE • SCROLL TO ZOOM"
    } else if (mode === "single" && modelName) {
      this.models.forEach((m) => {
        if (m.name === modelName) {
          m.mesh.visible = true
          m.mesh.position.set(0, 0, 0)
          this.activeModel = m.mesh
        } else {
          m.mesh.visible = false
        }
      })
      if (hint) hint.textContent = "DRAG TO ROTATE • SCROLL TO ZOOM"
    }
  }

  toggleAutoRotate() {
    this.autoRotate = !this.autoRotate
    return this.autoRotate
  }

  toggleWireframe() {
    this.wireframeMode = !this.wireframeMode
    this.models.forEach((m) => {
      this.setWireframe(m.mesh, this.wireframeMode)
    })
    return this.wireframeMode
  }

  reset() {
    this.camera.position.set(0, 0, 8)
    this.models.forEach((m) => {
      m.mesh.rotation.set(0, 0, 0)
    })
  }

  onResize() {
    this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight)
  }

  animate() {
    requestAnimationFrame(() => this.animate())

    if (this.autoRotate && !this.isDragging) {
      if (this.viewMode === "single" && this.activeModel) {
        this.activeModel.rotation.y += 0.01
      } else {
        this.models.forEach((m) => {
          m.mesh.rotation.y += 0.005
        })
      }
    }

    this.renderer.render(this.scene, this.camera)
  }
}

// ===== LOAD GAMES DATA =====
async function loadGamesData() {
  try {
    const response = await fetch("data/games.json")
    gamesData = await response.json()
    return gamesData
  } catch (e) {
    console.warn("Could not load games.json")
    return []
  }
}

// ===== RENDER GAME PAGE =====
let viewer = null

async function renderGamePage() {
  await loadGamesData()

  const urlParams = new URLSearchParams(window.location.search)
  const gameId = Number.parseInt(urlParams.get("id")) || 1

  const game = gamesData.find((g) => g.id === gameId) || gamesData[0]

  if (!game) {
    document.body.innerHTML = '<h1 style="color:#00ff40;text-align:center;margin-top:100px;">GAME NOT FOUND</h1>'
    return
  }

  // Update page content
  document.title = `${game.title} - DENEN STUDIO`
  document.getElementById("game-title").textContent = game.title
  document.getElementById("game-title").dataset.text = game.title
  document.getElementById("game-genre").textContent = `[ ${game.genre} ]`
  document.getElementById("game-tagline").textContent = game.tagline || ""
  document.getElementById("game-description").textContent = game.description

  // Features
  const featuresList = document.getElementById("game-features")
  if (game.features) {
    featuresList.innerHTML = game.features.map((f) => `<li>${f}</li>`).join("")
  }

  // Specs
  const specsGrid = document.getElementById("game-specs")
  if (game.specs) {
    specsGrid.innerHTML = Object.entries(game.specs)
      .map(
        ([key, value]) => `
        <div class="spec-item">
            <span class="spec-label">${key}</span>
            <span class="spec-value">${value}</span>
        </div>
      `,
      )
      .join("")
  }

  // Screenshots
  const screenshotsGrid = document.getElementById("screenshots-grid")
  if (game.screenshots) {
    screenshotsGrid.innerHTML = game.screenshots
      .map(
        (src) => `
      <div class="screenshot-item">
          <img src="${src}" alt="Screenshot">
      </div>
    `,
      )
      .join("")
  }

  // Model buttons
  const modelButtons = document.getElementById("model-buttons")
  if (game.models) {
    modelButtons.innerHTML = `
      <button class="model-btn active" data-model="all">ALL</button>
      ${game.models
        .map(
          (m) => `
        <button class="model-btn" data-model="${m.name}">${m.name}</button>
      `,
        )
        .join("")}
    `
  }

  // Initialize 3D viewer
  const canvas = document.getElementById("game-3d-canvas")
  viewer = new GameViewer3D(canvas)

  if (game.models) {
    const spacing = 3
    const offset = ((game.models.length - 1) * spacing) / 2

    for (let i = 0; i < game.models.length; i++) {
      const m = game.models[i]
      await viewer.addModel(
        m.name,
        { path: m.path, fallbackType: m.fallbackType },
        {
          x: i * spacing - offset,
          y: 0,
          z: 0,
        },
      )
    }
  }

  // Model button events
  modelButtons.querySelectorAll(".model-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      modelButtons.querySelectorAll(".model-btn").forEach((b) => b.classList.remove("active"))
      btn.classList.add("active")

      const model = btn.dataset.model
      if (model === "all") {
        viewer.setViewMode("all")
      } else {
        viewer.setViewMode("single", model)
      }
    })
  })

  // Control buttons
  document.getElementById("btn-reset").addEventListener("click", () => viewer.reset())

  document.getElementById("btn-auto-rotate").addEventListener("click", function () {
    const active = viewer.toggleAutoRotate()
    this.classList.toggle("active", active)
  })

  document.getElementById("btn-wireframe").addEventListener("click", function () {
    const active = viewer.toggleWireframe()
    this.classList.toggle("active", active)
  })

  document.getElementById("btn-auto-rotate").classList.add("active")
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", async () => {
  if (window.modelLoader) {
    window.modelLoader.init()
  }

  await renderGamePage()
})
