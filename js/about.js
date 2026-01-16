// Import THREE.js library


// ===== TEAM DATA =====
const teamData = [
  {
    "name": "Илюха",
    "role": "LEAD DEVELOPER",
    "bio": "это я",
    "avatar": "images/team/JOHN.jpg"
  },
  {
    "name": "сашка",
    "role": "3D ARTIST",
    "bio": "рисует круто",
    "avatar": "images/team/jane.jpg"
  },
  {
    "name": "карамелька",
    "role": "SOUND DESIGNER",
    "bio": "Вообще это моя собака",
    "avatar": "images/team/alex.jpg"
  }
]


// ===== THREE.JS TEAM AVATAR =====
class TeamAvatar3D {
  constructor(canvas, avatarType) {
    this.canvas = canvas
    this.avatarType = avatarType
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
    this.renderer.setClearColor(0x0a0a0a, 1)

    this.camera.position.z = 3.5

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 1)
    this.scene.add(ambientLight)

    const mainLight = new THREE.DirectionalLight(0x00ff40, 1)
    mainLight.position.set(2, 2, 2)
    this.scene.add(mainLight)

    // Create avatar
    this.createAvatar()

    // Events
    this.canvas.addEventListener("mouseenter", () => (this.isHovered = true))
    this.canvas.addEventListener("mouseleave", () => (this.isHovered = false))

    // Animate
    this.animate()
  }

  createAvatar() {
    let geometry

    switch (this.avatarType) {
      case "skull":
        geometry = new THREE.IcosahedronGeometry(1, 0)
        break
      case "cube":
        geometry = new THREE.BoxGeometry(1.2, 1.2, 1.2)
        break
      case "torus":
        geometry = new THREE.TorusKnotGeometry(0.6, 0.2, 64, 8)
        break
      default:
        geometry = new THREE.SphereGeometry(1, 8, 6)
    }

    const material = new THREE.MeshStandardMaterial({
      color: 0x00ff40,
      metalness: 0.6,
      roughness: 0.4,
      flatShading: true,
    })

    this.model = new THREE.Mesh(geometry, material)
    this.scene.add(this.model)
  }

  animate() {
    requestAnimationFrame(() => this.animate())

    if (this.model) {
      const speed = this.isHovered ? 0.03 : 0.01
      this.model.rotation.y += speed
      this.model.rotation.x += speed * 0.3
    }

    this.renderer.render(this.scene, this.camera)
  }
}

// ===== RENDER TEAM =====
function renderTeam() {
  const container = document.getElementById("team-grid")
  if (!container) return

  container.innerHTML = teamData
    .map(
      (member) => `
        <article class="team-card">
            
            <div class="team-card-content">
                <img src="${member.avatar}" alt="${member.name}" class="team-photo"/>
                <span class="team-card-role">[ ${member.role} ]</span>
                <h3 class="team-card-name">${member.name}</h3>
                <p class="team-card-bio">${member.bio}</p>
            </div>
        </article>
    `,
    )
    .join("")

  // Initialize 3D avatars
  const canvases = container.querySelectorAll(".team-card-canvas")
  canvases.forEach((canvas) => {
    const avatarType = canvas.dataset.avatar
    new TeamAvatar3D(canvas, avatarType)
  })
}

// ===== CONTACT FORM =====
function initContactForm() {
  const form = document.getElementById("contact-form")
  if (!form) return

  form.addEventListener("submit", (e) => {
    e.preventDefault()

    const name = document.getElementById("name").value.trim()
    const email = document.getElementById("email").value.trim()
    const subject = document.getElementById("subject").value
    const message = document.getElementById("message").value.trim()

    // Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!name) {
      alert("Please enter your name")
      return
    }

    if (!emailRegex.test(email)) {
      alert("Please enter a valid email address")
      return
    }

    if (!message) {
      alert("Please enter your message")
      return
    }

    // Success simulation
    alert("Message sent successfully! We will get back to you soon.")
    form.reset()
  })
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  renderTeam()
  initContactForm()
})
