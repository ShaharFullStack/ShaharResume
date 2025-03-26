// יבוא המודולים של Three.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

/**
 * Constants and Configuration
 */

// Define color scheme by category
const CategoryColors = {
  frontend: new THREE.Color(0x61dafb),    // React blue
  backend: new THREE.Color(0x68a063),     // Node.js green
  database: new THREE.Color(0x13aa52),    // MongoDB green
  devops: new THREE.Color(0x2496ed),      // Docker blue
  skill: new THREE.Color(0xff6b6b),       // Soft skills red
  highlight: new THREE.Color(0xffffff)    // White for highlights
};

// Skills data with categories
const SkillsData = [
  { name: "JavaScript", category: "frontend", level: 0.9, icon: "🔥" },
  { name: "TypeScript", category: "frontend", level: 0.85, icon: "🔥" },
  { name: "React", category: "frontend", level: 0.85, icon: "🔥" },
  { name: "Angular", category: "frontend", level: 0.8, icon: "⚡" },
  { name: "HTML", category: "frontend", level: 0.95, icon: "🔥" },
  { name: "CSS", category: "frontend", level: 0.9, icon: "🔥" },
  { name: "Node.js", category: "backend", level: 0.85, icon: "⚡" },
  { name: "Python", category: "backend", level: 0.8, icon: "🐍" },
  { name: "SQL", category: "database", level: 0.8, icon: "💾" },
  { name: "MongoDB", category: "database", level: 0.8, icon: "💾" },
  { name: "MySQL", category: "database", level: 0.8, icon: "💾" },
  { name: "Mongoose", category: "database", level: 0.75, icon: "💾" },
  { name: "Docker", category: "devops", level: 0.7, icon: "🐳" },
  { name: "AWS", category: "devops", level: 0.65, icon: "☁️" },
  { name: "Git", category: "devops", level: 0.85, icon: "🔄" },
  { name: "Teaching", category: "skill", level: 0.95, icon: "🎓" },
  { name: "Music", category: "skill", level: 0.95, icon: "🎵" },
];

// Category translation dictionary
const CategoryTranslations = {
  frontend: { en: 'Frontend', he: 'פיתוח צד לקוח' },
  backend: { en: 'Backend', he: 'פיתוח צד שרת' },
  database: { en: 'Database', he: 'בסיסי נתונים' },
  devops: { en: 'DevOps', he: 'דבאופס' },
  skill: { en: 'Soft Skill', he: 'כישור רך' }
};

/**
 * Main application class for 3D resume visualization
 */
class ResumeVisualization {
  constructor() {
    // Three.js core components
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.raycaster = null;
    this.mouse = null;
    this.clock = new THREE.Clock();
    this.controls = null;
    this.composer = null;
    this.bloomPass = null;
    
    // Scene elements
    this.hoverGroup = null;
    this.skills = [];
    this.codeBlocks = [];
    this.musicalNotes = [];
    this.activeExplosions = [];
    
    // State
    this.isHovering = false;
    this.defaultFont = null;
    this.particleTexture = null;
    
    // DOM Elements
    this.threeContainer = document.getElementById('three-container');
    this.skillTooltip = document.getElementById('skill-tooltip');
    this.skillName = document.getElementById('skill-name');
    this.skillLevel = document.getElementById('skill-level');
    this.skillCategory = document.getElementById('skill-category');
    
    // Bind methods to ensure 'this' context is preserved
    this.onWindowResize = this.onWindowResize.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseClick = this.onMouseClick.bind(this);
    this.animate = this.animate.bind(this);
    
    // Initialize event listeners for UI
    this.initUIControls();
  }
  
  /**
   * Initialize UI controls (language and export)
   */
  initUIControls() {
    const enBtn = document.getElementById('en-btn');
    const heBtn = document.getElementById('he-btn');
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    const exportPdfBtnHe = document.getElementById('export-pdf-btn-he');
    
    if (enBtn && heBtn) {
      // Language toggle
      enBtn.addEventListener('click', () => this.setLanguage('en'));
      heBtn.addEventListener('click', () => this.setLanguage('he'));
    }
    
    if (exportPdfBtn && exportPdfBtnHe) {
      // PDF export
      exportPdfBtn.addEventListener('click', () => this.exportPDF());
      exportPdfBtnHe.addEventListener('click', () => this.exportPDF());
    }
  }
  
  /**
   * Set language (English or Hebrew)
   * @param {string} lang - Language code ('en' or 'he')
   */
  setLanguage(lang) {
    const body = document.body;
    const enBtn = document.getElementById('en-btn');
    const heBtn = document.getElementById('he-btn');
    
    if (lang === 'en') {
      body.classList.remove('rtl');
      enBtn.classList.add('active');
      heBtn.classList.remove('active');
      
      document.querySelectorAll('.en').forEach(el => el.classList.remove('hidden'));
      document.querySelectorAll('.he').forEach(el => el.classList.add('hidden'));
    } else {
      body.classList.add('rtl');
      heBtn.classList.add('active');
      enBtn.classList.remove('active');
      
      document.querySelectorAll('.he').forEach(el => el.classList.remove('hidden'));
      document.querySelectorAll('.en').forEach(el => el.classList.add('hidden'));
    }
    
    // Update any visible tooltips
    if (this.skillTooltip && !this.skillTooltip.classList.contains('hidden')) {
      const skill = this.skills.find(s => s.particles.material.opacity > 0.8);
      if (skill) {
        const category = skill.particles.userData.category;
        const lang = document.body.classList.contains('rtl') ? 'he' : 'en';
        this.skillCategory.textContent = CategoryTranslations[category][lang];
      }
    }
  }
  
  /**
   * Export resume as PDF
   */
  exportPDF() {
    // Hide Three.js container before export
    this.threeContainer.style.display = 'none';
    
    const resumeContent = document.getElementById('resume-content');
    const opt = {
      margin: 10,
      filename: 'shahar_maoz_resume.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    // Use html2pdf to generate PDF
    html2pdf().set(opt).from(resumeContent).save().then(() => {
      // Show Three.js container after export
      this.threeContainer.style.display = 'block';
    }).catch(error => {
      console.error('Error exporting PDF:', error);
      this.threeContainer.style.display = 'block';
      alert('Failed to export PDF. Please try again.');
    });
  }
  
  /**
   * Initialize the 3D scene
   */
  async init() {
    // Show loading indicator
    const loadingElement = this.showLoading();
    
    try {
      // Create scene with fog
      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.FogExp2(0x050505, 0.001);
      
      // Create camera with improved perspective
      this.camera = new THREE.PerspectiveCamera(
        60, 
        window.innerWidth / window.innerHeight, 
        1, 
        1000
      );
      this.camera.position.z = 40;
      this.camera.position.y = 10;
      
      // Create WebGL renderer with enhanced settings
      this.renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1;
      this.threeContainer.appendChild(this.renderer.domElement);
      
      // Setup raycaster for interaction
      this.raycaster = new THREE.Raycaster();
      this.raycaster.params.Points.threshold = 0.1;
      this.mouse = new THREE.Vector2();
      
      // Create a group for hover effects
      this.hoverGroup = new THREE.Group();
      this.scene.add(this.hoverGroup);
      
      // Add lighting
      this.setupLighting();
      
      // Create orbital controls
      this.setupControls();
      
      // Load assets (texture and font)
      await Promise.all([
        this.loadParticleTexture(),
        this.loadFont().then(font => { this.defaultFont = font; })
      ]);
      
      // Create 3D scene elements
      await Promise.all([
        this.createSkillsGalaxy(),
        this.createCodeEnvironment(),
        this.createMusicVisualization()
      ]);
      
      // Setup post-processing
      this.setupPostProcessing();
      
      // Setup event listeners for interaction
      this.setupEventListeners();
      
      // Start intro animation
      this.startIntroAnimation();
      
      // Start animation loop
      this.animate();
      
    } catch (error) {
      console.error('Error initializing 3D scene:', error);
      // Create fallback experience
      this.createFallbackExperience();
    } finally {
      // Hide loading indicator
      this.hideLoading(loadingElement);
    }
  }
  
  /**
   * Create a fallback experience if 3D fails to initialize
   */
  createFallbackExperience() {
    if (this.threeContainer) {
      const fallbackMessage = document.createElement('div');
      fallbackMessage.style.position = 'absolute';
      fallbackMessage.style.top = '50%';
      fallbackMessage.style.left = '50%';
      fallbackMessage.style.transform = 'translate(-50%, -50%)';
      fallbackMessage.style.color = '#fff';
      fallbackMessage.style.textAlign = 'center';
      fallbackMessage.style.padding = '20px';
      fallbackMessage.style.background = 'rgba(0,0,0,0.7)';
      fallbackMessage.style.borderRadius = '10px';
      fallbackMessage.style.maxWidth = '80%';
      
      const lang = document.body.classList.contains('rtl') ? 'he' : 'en';
      fallbackMessage.innerHTML = lang === 'en' 
        ? 'Interactive 3D experience could not be loaded.<br>You can still view and download the resume.'
        : 'לא ניתן לטעון את החוויה האינטראקטיבית בתלת מימד.<br>עדיין ניתן לצפות ולהוריד את קורות החיים.';
      
      this.threeContainer.appendChild(fallbackMessage);
    }
  }
  
  /**
   * Setup lighting for the scene
   */
  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7);
    this.scene.add(directionalLight);
  }
  
  /**
   * Setup camera controls
   */
  setupControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = 0.8;
    this.controls.enableZoom = true;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 1.5;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 100;
    
    // Limit vertical rotation to avoid disorientation
    this.controls.minPolarAngle = Math.PI * 0.1;
    this.controls.maxPolarAngle = Math.PI * 0.9;
  }
  
  /**
   * Load particle texture
   * @returns {Promise<THREE.Texture>} The loaded texture
   */
  async loadParticleTexture() {
    return new Promise((resolve) => {
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(
        'screenShot5.png',
        (texture) => {
          this.particleTexture = texture;
          resolve(texture);
        },
        undefined,
        (error) => {
          console.warn('Failed to load particle texture, using fallback:', error);
          resolve(null); // Continue without texture
        }
      );
    });
  }
  
  /**
   * Load font for text
   * @returns {Promise<Font>} The loaded font
   */
  async loadFont() {
    return new Promise((resolve) => {
      const fontLoader = new FontLoader();
      fontLoader.load(
        'https://unpkg.com/three@0.160.0/examples/fonts/helvetiker_regular.typeface.json', 
        (font) => {
          resolve(font);
        }, 
        (xhr) => {
          console.log((xhr.loaded / xhr.total * 100) + '% of font loaded');
        },
        (error) => {
          console.warn('Error loading font:', error);
          resolve(null); // Continue without font
        }
      );
    });
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Window resize handler
    window.addEventListener('resize', this.onWindowResize);
    
    // Mouse interaction
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('click', this.onMouseClick);
    
    // Add listeners to skill elements in HTML
    document.querySelectorAll('.skill').forEach(skillElement => {
      skillElement.addEventListener('click', (event) => {
        const skillName = event.target.textContent.trim();
        const skillData = SkillsData.find(skill => skill.name === skillName);
        
        if (skillData) {
          this.createBigExplosion(skillData.category);
          this.playSkillSound(skillData.category);
        } else {
          this.createBigExplosion('highlight');
        }
      });
    });
  }
  
  /**
   * Create skills galaxy visualization
   */
  async createSkillsGalaxy() {
    const skillsGroup = new THREE.Group();
    this.scene.add(skillsGroup);
    
    // Galaxy parameters
    const radius = 18;
    const branches = 3;
    const spin = 1.5;
    
    // Create skills as particles
    SkillsData.forEach((skill, i) => {
      // Calculate position on spiral
      const branchIndex = ["frontend", "backend", "database"].includes(skill.category) ? 0 : 
                         skill.category === "devops" ? 1 : 2;
      
      const angle = (i / SkillsData.length) * Math.PI * 2;
      const branchAngle = (branchIndex / branches) * Math.PI * 2;
      
      const distance = Math.random() * radius * 0.6 + (radius * 0.3);
      const spinAngle = distance * spin;
      
      // Create particle system for skill
      const skillGeometry = new THREE.BufferGeometry();
      const particleCount = Math.floor(skill.level * 120) + 30;
      
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount);
      
      const skillColor = CategoryColors[skill.category];
      
      // Create cluster of particles for each skill
      for (let j = 0; j < particleCount; j++) {
        const particleDistance = Math.pow(Math.random(), 2) * 0.7 + 0.1;
        const particleOffsetX = (Math.random() - 0.5) * particleDistance;
        const particleOffsetY = (Math.random() - 0.5) * particleDistance;
        const particleOffsetZ = (Math.random() - 0.5) * particleDistance;
        
        const x = Math.cos(angle + spinAngle) * distance + particleOffsetX;
        const y = Math.sin(angle + spinAngle) * distance + particleOffsetY;
        const z = (Math.random() - 0.5) * 2 + particleOffsetZ;
        
        positions[j * 3] = x * Math.cos(branchAngle) - z * Math.sin(branchAngle);
        positions[j * 3 + 1] = y;
        positions[j * 3 + 2] = x * Math.sin(branchAngle) + z * Math.cos(branchAngle);
        
        // Varied particle colors
        const hueShift = Math.random() * 0.15 - 0.075;
        const colorTemp = skillColor.clone();
        
        if (j % 3 === 0) {
          colorTemp.offsetHSL(hueShift, 0.1, 0.1);
        }
        
        colors[j * 3] = colorTemp.r;
        colors[j * 3 + 1] = colorTemp.g;
        colors[j * 3 + 2] = colorTemp.b;
        
        // Varied particle sizes
        sizes[j] = Math.random() * 0.2 + 0.1;
      }
      
      skillGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      skillGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      skillGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      
      // Create material for skill particles
      const skillMaterial = new THREE.PointsMaterial({
        size: 0.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
        map: this.particleTexture
      });
      
      // Create points system
      const skillParticles = new THREE.Points(skillGeometry, skillMaterial);
      skillParticles.userData = { 
        type: 'skill', 
        name: skill.name, 
        category: skill.category,
        level: skill.level,
        icon: skill.icon
      };
      
      // Create 3D text for skill name (visible on hover)
      let textMesh = null;
      let textMaterial = null;
      
      if (this.defaultFont) {
        const textGeometry = new TextGeometry(skill.name, {
          font: this.defaultFont,
          size: 0.5,
          height: 0.1
        });
        textGeometry.computeBoundingBox();
        
        // Center the text geometry
        const textWidth = textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x;
        textGeometry.translate(-textWidth / 2, 0, 0);
        
        textMaterial = new THREE.MeshBasicMaterial({ 
          color: CategoryColors[skill.category],
          transparent: true,
          opacity: 0
        });
        
        textMesh = new THREE.Mesh(textGeometry, textMaterial);
        
        // Position text near the skill particles
        const centerX = (positions[0] + positions[3] + positions[6]) / 3;
        const centerY = (positions[1] + positions[4] + positions[7]) / 3;
        const centerZ = (positions[2] + positions[5] + positions[8]) / 3;
        
        textMesh.position.set(centerX, centerY + 1, centerZ);
        textMesh.lookAt(this.camera.position);
        
        this.hoverGroup.add(textMesh);
      }
      
      // Store skill data for animations
      this.skills.push({
        particles: skillParticles,
        text: textMesh,
        originalPositions: positions.slice(),
        originalScale: skillParticles.scale.clone(),
        originalOpacity: textMesh ? textMaterial.opacity : skillMaterial.opacity,
        creationTime: Math.random() * 1000
      });
      
      // Add to scene
      skillsGroup.add(skillParticles);
    });
  }
  
  /**
   * Create code environment visualization
   */
  createCodeEnvironment() {
    const codeGroup = new THREE.Group();
    this.scene.add(codeGroup);
    
    // If no font is available, create particle cloud instead
    if (!this.defaultFont) {
      const particles = this.createParticleCloud(500, [-15, 10, -20], 10, 0x61dafb);
      codeGroup.add(particles);
      return;
    }
    
    // Code snippets as floating 3D elements
    const codeSnippets = [
      "function optimizeWorkflow() {",
      "  const creativity = new Creativity();",
      "  return creativity.combine(tech, music, teaching);",
      "}",
      "// Skills integration",
      "class Developer extends Musician {",
      "  constructor() {",
      "    super(passion, creativity);",
      "    this.teach(complex_concepts);",
      "  }",
      "}"
    ];
    
    // Create floating code lines
    codeSnippets.forEach((line, i) => {
      const textGeometry = new TextGeometry(line, {
        font: this.defaultFont,
        size: 0.3,
        height: 0.01
      });
      
      const textMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x61dafb,
        transparent: true,
        opacity: 0.7
      });
      
      const codeMesh = new THREE.Mesh(textGeometry, textMaterial);
      
      // Position code blocks in an interesting layout
      codeMesh.position.set(-15, 10 - (i * 0.8), -20 + Math.sin(i) * 2);
      codeMesh.rotation.y = Math.PI * 0.1;
      
      codeGroup.add(codeMesh);
      this.codeBlocks.push({
        mesh: codeMesh,
        originalY: codeMesh.position.y,
        originalOpacity: textMaterial.opacity
      });
    });
    
    // Add floating brackets and symbols to represent code structure
    const symbols = ['{', '}', '()', '=>', '[]', '//'];
    for (let i = 0; i < 20; i++) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      
      const symbolGeometry = new TextGeometry(symbol, {
        font: this.defaultFont,
        size: 0.4,
        height: 0.05
      });
      
      const symbolMaterial = new THREE.MeshBasicMaterial({
        color: 0x4ec9b0,
        transparent: true,
        opacity: 0.4
      });
      
      const symbolMesh = new THREE.Mesh(symbolGeometry, symbolMaterial);
      
      // Position randomly in 3D space, concentrated around code area
      symbolMesh.position.set(
        -20 + Math.random() * 15,
        0 + Math.random() * 15,
        -25 + Math.random() * 15
      );
      
      symbolMesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      codeGroup.add(symbolMesh);
    }
  }
  
  /**
   * Create a particle cloud when text rendering isn't available
   * @param {number} count - Number of particles
   * @param {Array<number>} center - [x, y, z] position
   * @param {number} radius - Radius of particle cloud
   * @param {number} color - Base color (optional)
   * @returns {THREE.Points} Particle system
   */
  createParticleCloud(count, center, radius, baseColor) {
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    
    // Define base color (default to blue for code)
    const colorObj = baseColor ? new THREE.Color(baseColor) : new THREE.Color(0x4285f4);
    
    for (let i = 0; i < count; i++) {
      // Random position within radius
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * radius;
      
      positions[i * 3] = center[0] + Math.cos(angle) * distance;
      positions[i * 3 + 1] = center[1] + (Math.random() - 0.5) * radius;
      positions[i * 3 + 2] = center[2] + Math.sin(angle) * distance;
      
      // Color variation
      const colorVariation = colorObj.clone();
      colorVariation.offsetHSL(Math.random() * 0.1 - 0.05, 0, Math.random() * 0.2);
      
      colors[i * 3] = colorVariation.r;
      colors[i * 3 + 1] = colorVariation.g;
      colors[i * 3 + 2] = colorVariation.b;
      
      // Varied particle sizes
      sizes[i] = Math.random() * 0.2 + 0.1;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      map: this.particleTexture
    });
    
    return new THREE.Points(particleGeometry, particleMaterial);
  }
  
  /**
   * Create music visualization
   */
  createMusicVisualization() {
    const musicGroup = new THREE.Group();
    this.scene.add(musicGroup);
    
    // Create a floating musical staff
    const staffGeometry = new THREE.PlaneGeometry(20, 5);
    const staffMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide
    });
    
    const staff = new THREE.Mesh(staffGeometry, staffMaterial);
    staff.position.set(10, 0, 0);
    staff.rotation.y = Math.PI * 0.3;
    musicGroup.add(staff);
    
    // Create staff lines
    for (let i = 0; i < 5; i++) {
      const lineGeometry = new THREE.PlaneGeometry(20, 0.05);
      const lineMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      });
      
      const line = new THREE.Mesh(lineGeometry, lineMaterial);
      line.position.set(10, -2 + i, 0.01);
      line.rotation.y = Math.PI * 0.3;
      musicGroup.add(line);
    }
    
    // Create musical notes
    const noteCount = 30;
    for (let i = 0; i < noteCount; i++) {
      const noteType = Math.random() > 0.5 ? 'quarter' : 'eighth';
      
      // Create note group
      const noteGroup = new THREE.Group();
      
      // Create note head
      const headGeometry = new THREE.SphereGeometry(0.15, 16, 16);
      const headMaterial = new THREE.MeshBasicMaterial({
        color: 0xff6b6b,
        transparent: true,
        opacity: 0.8
      });
      
      const noteHead = new THREE.Mesh(headGeometry, headMaterial);
      noteGroup.add(noteHead);
      
      // Create note stem
      const stemGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8);
      const stemMaterial = new THREE.MeshBasicMaterial({
        color: 0xff6b6b,
        transparent: true,
        opacity: 0.8
      });
      
      const noteStem = new THREE.Mesh(stemGeometry, stemMaterial);
      noteStem.position.set(0, 0.4, 0);
      noteGroup.add(noteStem);
      
      // Create flag for eighth notes
      if (noteType === 'eighth') {
        const flagGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.02);
        const flagMaterial = new THREE.MeshBasicMaterial({
          color: 0xff6b6b,
          transparent: true,
          opacity: 0.8
        });
        
        const noteFlag = new THREE.Mesh(flagGeometry, flagMaterial);
        noteFlag.position.set(0.15, 0.7, 0);
        noteFlag.rotation.z = Math.PI * 0.1;
        noteGroup.add(noteFlag);
      }
      
      // Position note randomly on or near the staff
      noteGroup.position.set(
        10 + (Math.random() - 0.5) * 15,
        -2 + Math.floor(Math.random() * 9) * 0.5,
        Math.random() * 5
      );
      
      noteGroup.rotation.y = Math.PI * 0.3;
      
      musicGroup.add(noteGroup);
      
      // Store for animation
      this.musicalNotes.push({
        group: noteGroup,
        originalY: noteGroup.position.y,
        speed: 0.01 + Math.random() * 0.02,
        phase: Math.random() * Math.PI * 2
      });
    }
  }
  
  /**
   * Setup post-processing for visual effects
   */
  setupPostProcessing() {
    try {
      this.composer = new EffectComposer(this.renderer);
      
      const renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(renderPass);
      
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.5,    // strength
        0.4,    // radius
        0.85    // threshold
      );
      this.composer.addPass(this.bloomPass);
      
      return true;
    } catch (error) {
      console.error('Error creating post-processing effects:', error);
      return false;
    }
  }
  
  /**
   * Handle mouse movement for interactive hover effects
   */
  onMouseMove(event) {
    // Calculate mouse position in normalized device coordinates
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Update raycaster
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // Check for intersections with skill particles
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);
    
    let hoveredSkill = null;
    
    if (intersects.length > 0) {
      // Find the first intersected object that is a skill
      for (let i = 0; i < intersects.length; i++) {
        const object = intersects[i].object;
        if (object.userData && object.userData.type === 'skill') {
          hoveredSkill = object;
          break;
        }
      }
    }
    
    // Update hover states
    this.isHovering = hoveredSkill !== null;
    
    // Reset all skill visualizations
    this.skills.forEach(skill => {
      // Return particle sizes to normal
      skill.particles.material.size = 0.15;
      
      // Hide text if available
      if (skill.text) {
        skill.text.material.opacity = 0;
      }
    });
    
    // Hide tooltip if not hovering on skill
    if (!hoveredSkill) {
      this.skillTooltip.classList.add('hidden');
      return;
    }
    
    // If hovering over a skill, highlight it
    if (hoveredSkill) {
      const skillIndex = this.skills.findIndex(s => s.particles === hoveredSkill);
      if (skillIndex >= 0) {
        // Make particles bigger
        this.skills[skillIndex].particles.material.size = 0.3;
        
        // Show skill name in 3D space if text is available
        if (this.skills[skillIndex].text) {
          this.skills[skillIndex].text.material.opacity = 1;
          
          // Update text position to always face camera
          this.skills[skillIndex].text.lookAt(this.camera.position);
        }
        
        // Get skill data for HTML tooltip
        const skillData = hoveredSkill.userData;
        
        // Update tooltip content
        this.skillName.textContent = skillData.name + ' ' + skillData.icon;
        this.skillLevel.style.setProperty('--level', (skillData.level * 100) + '%');
        this.skillLevel.innerHTML = `<span style="width: ${skillData.level * 100}%"></span>`;
        
        // Get current language for category translation
        const lang = document.body.classList.contains('rtl') ? 'he' : 'en';
        this.skillCategory.textContent = CategoryTranslations[skillData.category][lang];
        
        // Show and position tooltip
        this.skillTooltip.classList.remove('hidden');
        
        // Set class for category-specific styling
        this.skillTooltip.className = ''; // Reset classes
        this.skillTooltip.classList.add(skillData.category);
      }
    }
  }
  
  /**
   * Handle mouse clicks for interaction
   */
  onMouseClick(event) {
    // Use same raycaster setup as mousemove
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);
    
    if (intersects.length > 0) {
      // Find clicked skill
      for (let i = 0; i < intersects.length; i++) {
        const object = intersects[i].object;
        if (object.userData && object.userData.type === 'skill') {
          // Get skill data
          const skillData = object.userData;
          
          // Zoom to clicked skill
          this.zoomToSkill(object);
          
          // Trigger special effects
          this.highlightSkillCategory(skillData.category);
          
          // Play sound feedback
          this.playSkillSound(skillData.category);
          
          break;
        }
      }
    }
  }
  
  /**
   * Zoom camera to a skill
   * @param {THREE.Object3D} skillObject - The skill object to zoom to
   */
  zoomToSkill(skillObject) {
    // Get skill position
    const position = new THREE.Vector3();
    skillObject.getWorldPosition(position);
    
    // Save current camera position and rotation
    const startPosition = this.camera.position.clone();
    const startRotation = this.camera.quaternion.clone();
    
    // Set target position closer to skill
    const targetPosition = position.clone().add(new THREE.Vector3(0, 0, 15));
    
    // Disable auto-rotation temporarily
    const originalAutoRotate = this.controls.autoRotate;
    this.controls.autoRotate = false;
    
    // Create animation
    const duration = 1000; // 1 second
    const startTime = Date.now();
    
    const animateCamera = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth motion
      const easedProgress = this.easeInOutCubic(progress);
      
      // Update camera position
      this.camera.position.lerpVectors(startPosition, targetPosition, easedProgress);
      
      // Look at skill
      const lookAtPosition = position.clone();
      this.camera.lookAt(lookAtPosition);
      
      if (progress < 1) {
        requestAnimationFrame(animateCamera);
      } else {
        // Return to auto-rotate after 3 seconds
        setTimeout(() => {
          this.controls.autoRotate = originalAutoRotate;
        }, 3000);
      }
    };
    
    animateCamera();
  }
  
  /**
   * Highlight a category of skills with special effects
   * @param {string} category - The category to highlight
   */
  highlightSkillCategory(category) {
    // Create a flash effect
    this.createFlashEffect(category);
    
    // Dim all skills slightly
    this.skills.forEach(skill => {
      if (skill.particles.userData.category !== category) {
        // Dim skills in other categories
        skill.particles.material.opacity = 0.3;
      } else {
        // Highlight skills in this category
        skill.particles.material.opacity = 1;
        
        // Create a pulse animation
        const scaleFactor = 1.8;
        skill.particles.scale.set(scaleFactor, scaleFactor, scaleFactor);
        
        // Animate back to normal scale
        setTimeout(() => {
          skill.particles.scale.set(1, 1, 1);
        }, 1000);
      }
    });
    
    // Reset opacities after a delay
    setTimeout(() => {
      this.skills.forEach(skill => {
        skill.particles.material.opacity = 0.8;
      });
    }, 2000);
  }
  
  /**
   * Create a flash effect for visual feedback
   * @param {string} category - The category determining the flash color
   */
  createFlashEffect(category) {
    // Create transparent plane
    const flashGeometry = new THREE.PlaneGeometry(100, 100);
    const flashMaterial = new THREE.MeshBasicMaterial({
      color: CategoryColors[category] || new THREE.Color(0xffffff),
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.z = -50;
    flash.lookAt(this.camera.position);
    this.scene.add(flash);
    
    // Flash animation
    const flashDuration = 500; // half a second
    const startTime = Date.now();
    
    const animateFlash = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / flashDuration;
      
      if (progress < 0.5) {
        // Fade in
        flashMaterial.opacity = progress * 0.3; // max opacity 0.3
      } else if (progress < 1) {
        // Fade out
        flashMaterial.opacity = (1 - progress) * 0.6;
      } else {
        // End animation
        this.scene.remove(flash);
        return;
      }
      
      requestAnimationFrame(animateFlash);
    };
    
    animateFlash();
  }
  
  /**
   * Play a sound based on skill category
   * @param {string} category - The skill category
   */
  playSkillSound(category) {
    try {
      // Create new audio context
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      // Choose wave type by category
      const waveTypes = {
        'frontend': 'sine',
        'backend': 'square',
        'database': 'triangle',
        'devops': 'sawtooth',
        'skill': 'triangle'
      };
      
      oscillator.type = waveTypes[category] || 'sine';
      
      // Set frequency by category
      const baseFrequency = 220; // A3
      const frequencies = {
        'frontend': baseFrequency * 1,     // A
        'backend': baseFrequency * 5/4,    // C#
        'database': baseFrequency * 3/2,   // E
        'devops': baseFrequency * 9/8,     // B
        'skill': baseFrequency * 2         // A (higher octave)
      };
      
      oscillator.frequency.value = frequencies[category] || baseFrequency;
      
      // Connect oscillator to gain node and output
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Set volume and decay
      gainNode.gain.value = 0.1;
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1);
      
      // Start and stop sound
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        // Clean up
        audioContext.close().catch(e => console.error("Error closing audio context:", e));
      }, 1000);
    } catch (error) {
      console.warn("Audio playback failed:", error);
      // Continue silently if audio fails
    }
  }
  
  /**
   * Create a big explosion effect
   * @param {string} category - The category determining explosion color
   */
  createBigExplosion(category) {
    // Explosion center
    const center = new THREE.Vector3(0, 0, 0);
    
    // Particle count for explosion
    const particleCount = 300;
    
    // Create geometry for particles
    const explosionGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const velocities = [];
    
    // Color based on category
    const explosionColor = CategoryColors[category] || new THREE.Color(0xffffff);
    
    // Create particles starting at center
    for (let i = 0; i < particleCount; i++) {
      // All particles start at center
      positions[i * 3] = center.x;
      positions[i * 3 + 1] = center.y;
      positions[i * 3 + 2] = center.z;
      
      // Color variations
      const colorVariation = new THREE.Color(explosionColor.clone());
      colorVariation.offsetHSL(Math.random() * 0.2 - 0.1, 0, Math.random() * 0.2);
      
      colors[i * 3] = colorVariation.r;
      colors[i * 3 + 1] = colorVariation.g;
      colors[i * 3 + 2] = colorVariation.b;
      
      // Random sizes
      sizes[i] = Math.random() * 0.5 + 0.1;
      
      // Create velocity vector for each particle
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi)
      );
      
      // Random speed
      const speed = Math.random() * 0.5 + 0.2;
      velocity.multiplyScalar(speed);
      
      velocities.push(velocity);
    }
    
    // Set geometry attributes
    explosionGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    explosionGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    explosionGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    // Create material with texture if available
    const explosionMaterial = new THREE.PointsMaterial({
      size: 1.2,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      map: this.particleTexture || null
    });
    
    // Create particle system
    const explosionParticles = new THREE.Points(explosionGeometry, explosionMaterial);
    explosionParticles.userData.creationTime = Date.now();
    explosionParticles.userData.velocities = velocities;
    
    // Position explosion slightly forward to be more visible
    explosionParticles.position.z = -10;
    
    // Add to scene
    this.scene.add(explosionParticles);
    
    // Create explosion object for tracking
    const explosion = {
      particles: explosionParticles,
      velocities: velocities,
      update: (time) => {
        const elapsedTime = (Date.now() - explosionParticles.userData.creationTime) / 1000;
        const positionArray = explosionParticles.geometry.attributes.position.array;
        
        // Update particle positions based on velocities
        for (let i = 0; i < particleCount; i++) {
          positionArray[i * 3] += velocities[i].x;
          positionArray[i * 3 + 1] += velocities[i].y;
          positionArray[i * 3 + 2] += velocities[i].z;
          
          // Gradually slow down
          velocities[i].multiplyScalar(0.98);
        }
        
        explosionParticles.geometry.attributes.position.needsUpdate = true;
        
        // Gradual fade out
        explosionParticles.material.opacity = Math.max(0, 1 - elapsedTime * 0.5);
        
        // Gradually increase particle size over time
        const currentSize = 1.2 + elapsedTime * 0.5;
        explosionParticles.material.size = currentSize;
        
        // Remove explosion when complete
        if (elapsedTime > 2.0) {
          this.scene.remove(explosionParticles);
          const index = this.activeExplosions.indexOf(explosion);
          if (index !== -1) {
            this.activeExplosions.splice(index, 1);
          }
          explosionParticles.geometry.dispose();
          explosionParticles.material.dispose();
        }
      }
    };
    
    // Add to active explosions
    this.activeExplosions.push(explosion);
    
    // Create overall flash if bloom is available
    if (this.bloomPass) {
      const originalStrength = this.bloomPass.strength;
      this.bloomPass.strength = originalStrength * 2;
      
      // Reset after 300ms
      setTimeout(() => {
        this.bloomPass.strength = originalStrength;
      }, 300);
    }
  }
  
  /**
   * Animate code blocks with floating effect
   * @param {number} time - Current time
   */
  animateCodeBlocks(time) {
    this.codeBlocks.forEach((block, i) => {
      // Create floating motion
      block.mesh.position.y = block.originalY + Math.sin(time * 0.8 + i) * 0.2;
      
      // Add dynamic rotation
      block.mesh.rotation.y = Math.PI * 0.1 + Math.sin(time * 0.5) * 0.1;
    });
  }
  
  /**
   * Animate musical notes
   * @param {number} time - Current time
   */
  animateMusicalNotes(time) {
    this.musicalNotes.forEach((note, i) => {
      // Create wave motion on the staff
      note.group.position.y = note.originalY + Math.sin(time * note.speed * 1.5 + note.phase) * 0.3;
      
      // Add rotation
      note.group.rotation.z = Math.sin(time * note.speed * 0.8) * 0.15;
    });
  }
  
  /**
   * Cubic easing function for smooth animations
   * @param {number} t - Progress value (0-1)
   * @returns {number} Eased value
   */
  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  
  /**
   * Start intro animation
   */
  startIntroAnimation() {
    // Save original camera position
    const originalPosition = this.camera.position.clone();
    const targetPosition = new THREE.Vector3(0, 5, 60);
    
    // Create animation for impressive entry
    const duration = 3000; // 3 seconds
    const startTime = Date.now();
    
    // Disable auto-rotation during animation
    this.controls.autoRotate = false;
    
    const animateIntro = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing for smooth motion
      const easedProgress = this.easeInOutCubic(progress);
      
      // Camera animation - start far and move in
      this.camera.position.lerpVectors(targetPosition, originalPosition, easedProgress);
      
      if (progress < 1) {
        requestAnimationFrame(animateIntro);
      } else {
        // Enable auto-rotation when animation completes
        this.controls.autoRotate = true;
        
        // Add flash effect at end of animation
        this.createFlashEffect('highlight');
      }
    };
    
    animateIntro();
  }
  
  /**
   * Show loading indicator
   * @returns {HTMLElement} The loading element
   */
  showLoading() {
    const loadingElement = document.createElement('div');
    loadingElement.id = 'loading';
    loadingElement.style.position = 'fixed';
    loadingElement.style.top = '50%';
    loadingElement.style.left = '50%';
    loadingElement.style.transform = 'translate(-50%, -50%)';
    loadingElement.style.color = '#fff';
    loadingElement.style.fontFamily = 'Arial, sans-serif';
    loadingElement.style.fontSize = '24px';
    loadingElement.style.zIndex = '1000';
    loadingElement.style.padding = '20px';
    loadingElement.style.background = 'rgba(0,0,0,0.7)';
    loadingElement.style.borderRadius = '10px';
    
    const lang = document.body.classList.contains('rtl') ? 'he' : 'en';
    loadingElement.textContent = lang === 'en' ? 'Loading Experience...' : 'טוען חוויה...';
    
    document.body.appendChild(loadingElement);
    
    return loadingElement;
  }
  
  /**
   * Hide loading indicator
   * @param {HTMLElement} loadingElement - The loading element to remove
   */
  hideLoading(loadingElement) {
    // Fade out animation
    let opacity = 1;
    const fadeInterval = setInterval(() => {
      if (opacity <= 0.1) {
        clearInterval(fadeInterval);
        loadingElement.remove();
      }
      loadingElement.style.opacity = opacity;
      opacity -= 0.1;
    }, 40);
  }
  
  /**
   * Handle window resize
   */
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Update composer size if post-processing is active
    if (this.composer) {
      this.composer.setSize(window.innerWidth, window.innerHeight);
    }
  }
  
  /**
   * Main animation loop
   */
  animate() {
    requestAnimationFrame(this.animate);
    
    const time = this.clock.getElapsedTime();
    
    // Update skills galaxy with dynamic rotation
    this.skills.forEach((skill, i) => {
      // Different rotation for different categories
      const rotationSpeed = skill.particles.userData.category === 'frontend' ? 0.2 :
                          skill.particles.userData.category === 'backend' ? 0.15 : 0.1;
      
      // Rotate skill particles around their own center
      skill.particles.rotation.y += 0.003 * rotationSpeed;
      skill.particles.rotation.x += 0.001 * rotationSpeed;
      
      // If not being hovered, add gentle pulsing
      if (!this.isHovering) {
        const pulseFactor = 1 + Math.sin(time * 0.8 + i) * 0.08;
        skill.particles.scale.set(pulseFactor, pulseFactor, pulseFactor);
      }
    });
    
    // Animate code blocks
    if (this.codeBlocks.length > 0) {
      this.animateCodeBlocks(time);
    }
    
    // Animate musical notes
    this.animateMusicalNotes(time);
    
    // Update active explosions
    this.activeExplosions.forEach(explosion => {
      explosion.update(time);
    });
    
    // Update orbital controls
    if (this.controls) this.controls.update();
    
    // Render scene with post-processing if available, otherwise regular render
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

/**
 * Initialize the application on DOM content loaded
 */
document.addEventListener('DOMContentLoaded', () => {
  const app = new ResumeVisualization();
  app.init().catch(error => {
    console.error('Failed to initialize 3D visualization:', error);
  });
});