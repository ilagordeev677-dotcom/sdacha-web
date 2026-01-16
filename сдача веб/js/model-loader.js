// ===== GLB/GLTF MODEL LOADER =====
// Utility class for loading custom 3D models



class ModelLoader {
  constructor() {
    this.loader = null
    this.loadingManager = new THREE.LoadingManager()
    this.cache = new Map()

    // Setup loading manager callbacks
    this.loadingManager.onProgress = (url, loaded, total) => {
      console.log(`Loading: ${url} (${loaded}/${total})`)
    }

    this.loadingManager.onError = (url) => {
      console.warn(`Error loading: ${url}`)
    }
  }

  // Initialize GLTFLoader (call after Three.js and GLTFLoader are loaded)
  init() {
    if (typeof THREE !== "undefined" && typeof THREE.GLTFLoader !== "undefined") {
      this.loader = new THREE.GLTFLoader(this.loadingManager)

      // Add Draco decoder for compressed models (optional)
      if (typeof THREE.DRACOLoader !== "undefined") {
        const dracoLoader = new THREE.DRACOLoader()
        dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/")
        this.loader.setDRACOLoader(dracoLoader)
      }

      console.log("ModelLoader initialized successfully")
      return true
    }
    console.warn("GLTFLoader not available")
    return false
  }

  // Load a GLB/GLTF model
  async load(path, options = {}) {
    const {
      scale = 1,
      position = { x: 0, y: 0, z: 0 },
      rotation = { x: 0, y: 0, z: 0 },
      color = 0x00ff40,
      applyMaterial = true,
    } = options

    // Check cache
    if (this.cache.has(path)) {
      const cached = this.cache.get(path).clone()
      this.applyTransforms(cached, scale, position, rotation)
      return cached
    }

    return new Promise((resolve, reject) => {
      if (!this.loader) {
        reject(new Error("GLTFLoader not initialized"))
        return
      }

      this.loader.load(
        path,
        (gltf) => {
          const model = gltf.scene

          // Apply custom material to all meshes
          if (applyMaterial) {
            model.traverse((child) => {
              if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({
                  color: color,
                  metalness: 0.6,
                  roughness: 0.4,
                  flatShading: true,
                })
              }
            })
          }

          // Apply transforms
          this.applyTransforms(model, scale, position, rotation)

          // Cache the model
          this.cache.set(path, model.clone())

          resolve(model)
        },
        // Progress callback
        (xhr) => {
          if (xhr.lengthComputable) {
            const progress = (xhr.loaded / xhr.total) * 100
            console.log(`${path}: ${progress.toFixed(0)}% loaded`)
          }
        },
        // Error callback
        (error) => {
          console.warn(`Failed to load model: ${path}`, error)
          reject(error)
        },
      )
    })
  }

  applyTransforms(model, scale, position, rotation) {
    if (typeof scale === "number") {
      model.scale.set(scale, scale, scale)
    } else {
      model.scale.set(scale.x || 1, scale.y || 1, scale.z || 1)
    }
    model.position.set(position.x, position.y, position.z)
    model.rotation.set(rotation.x, rotation.y, rotation.z)
  }

  // Create fallback procedural geometry
  createFallback(type, color = 0x00ff40) {
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
      case "sphere":
        geometry = new THREE.SphereGeometry(1, 16, 12)
        break
      case "cylinder":
        geometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 16)
        break
      case "cone":
        geometry = new THREE.ConeGeometry(1, 2, 8)
        break
      default:
        geometry = new THREE.SphereGeometry(1, 8, 6)
    }

    const material = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.6,
      roughness: 0.4,
      flatShading: true,
    })

    return new THREE.Mesh(geometry, material)
  }

  // Load model with fallback
  async loadWithFallback(path, fallbackType, options = {}) {
    try {
      return await this.load(path, options)
    } catch (error) {
      console.log(`Using fallback for: ${path}`)
      const fallback = this.createFallback(fallbackType, options.color)
      this.applyTransforms(
        fallback,
        options.scale || 1,
        options.position || { x: 0, y: 0, z: 0 },
        options.rotation || { x: 0, y: 0, z: 0 },
      )
      return fallback
    }
  }

  // Clear cache
  clearCache() {
    this.cache.clear()
  }
}

// Global instance
window.modelLoader = new ModelLoader()
