// ===== GAME DATA =====
let gamesData = []

// ===== THREE.JS GAME CARDS =====
const THREE = window.THREE // Declare the THREE variable

class GameCard3D {
  constructor(canvas, modelConfig) {
    this.canvas = canvas
    this.modelConfig = modelConfig
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 1000)
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
    })
    this.model = null
    this.isHovered = false

    this.init()
  }

  init() {
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setClearColor(0x000000, 0)

    this.camera.position.z = 4

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 1)
    this.scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0x00ff40, 0.8)
    directionalLight.position.set(2, 2, 2)
    this.scene.add(directionalLight)

    const backLight = new THREE.DirectionalLight(0xff0040, 0.3)
    backLight.position.set(-2, -2, -2)
    this.scene.add(backLight)

    this.loadModel()

    // Events
    this.canvas.addEventListener("mouseenter", () => (this.isHovered = true))
    this.canvas.addEventListener("mouseleave", () => (this.isHovered = false))

    // Animate
    this.animate()
  }

  async loadModel() {
    const { path, fallbackType } = this.modelConfig

    // Try to load GLB/GLTF model, fall back to procedural geometry
    if (window.modelLoader && window.modelLoader.loader) {
      try {
        this.model = await window.modelLoader.loadWithFallback(path, fallbackType, {
          scale: 1.2,
          color: 0x00ff40,
        })
        this.scene.add(this.model)
      } catch (e) {
        this.createFallbackModel()
      }
    } else {
      this.createFallbackModel()
    }
  }

  createFallbackModel() {
    let geometry
    const type = this.modelConfig.fallbackType

    switch (type) {
      case "skull":
        geometry = new THREE.IcosahedronGeometry(1.2, 0)
        break
      case "cube":
        geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5)
        break
      case "torus":
        geometry = new THREE.TorusKnotGeometry(0.8, 0.3, 64, 8)
        break
      default:
        geometry = new THREE.SphereGeometry(1, 8, 6)
    }

    const material = new THREE.MeshStandardMaterial({
      color: 0x00ff40,
      metalness: 0.7,
      roughness: 0.3,
      wireframe: false,
      flatShading: true,
    })

    this.model = new THREE.Mesh(geometry, material)
    this.scene.add(this.model)
  }

  animate() {
    requestAnimationFrame(() => this.animate())

    if (this.model) {
      // Only scale on hover
      const scale = this.isHovered ? 1.1 : 1
      this.model.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1)
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
    console.warn("Could not load games.json, using inline data")
    // Fallback inline data
    gamesData = [
      {
        id: 1,
        slug: "nightmare-slasher",
        title: "NIGHTMARE SLASHER",
        genre: "SLASHER",
        description: "A brutal slasher game with authentic PS2 graphics.",
        logoModel: { path: "models/nightmare-slasher/logo.glb", fallbackType: "skull" },
      },
      {
        id: 2,
        slug: "fear-factory",
        title: "FEAR FACTORY",
        genre: "SURVIVAL HORROR",
        description: "Survive the night in an abandoned factory.",
        logoModel: { path: "models/fear-factory/logo.glb", fallbackType: "cube" },
      },
      {
        id: 3,
        slug: "chainsaw-massacre",
        title: "CHAINSAW MASSACRE",
        genre: "ACTION HORROR",
        description: "Classic slasher action with modern twists.",
        logoModel: { path: "models/chainsaw-massacre/logo.glb", fallbackType: "torus" },
      },
    ]
    return gamesData
  }
}

// ===== RENDER GAMES =====
function renderGames() {
  const container = document.getElementById("games-grid")
  if (!container) return

  container.innerHTML = gamesData
    .map(
      (game) => `
        <article class="game-card" onclick="window.location.href='game.html?id=${game.id}'">
            <canvas class="game-card-canvas" data-game-id="${game.id}"></canvas>
            <div class="game-card-content">
                <span class="game-card-genre">[ ${game.genre} ]</span>
                <h3 class="game-card-title">${game.title}</h3>
                <p class="game-card-description">${game.description}</p>
            </div>
            <div class="game-card-footer">
                <span class="game-card-link">EXPLORE GAME</span>
                <span class="game-card-arrow">→</span>
            </div>
        </article>
    `,
    )
    .join("")

  // Initialize 3D for each card
  const canvases = container.querySelectorAll(".game-card-canvas")
  canvases.forEach((canvas) => {
    const gameId = Number.parseInt(canvas.dataset.gameId)
    const game = gamesData.find((g) => g.id === gameId)
    if (game && game.logoModel) {
      new GameCard3D(canvas, game.logoModel)
    }
  })
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", async () => {
  // Initialize model loader if GLTFLoader is available
  if (window.modelLoader) {
    window.modelLoader.init()
  }

  await loadGamesData()
  renderGames()
})
