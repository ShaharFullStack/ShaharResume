// יבוא המודולים של Three.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// DOM Elements
const enBtn = document.getElementById('en-btn');
const heBtn = document.getElementById('he-btn');
const exportPdfBtn = document.getElementById('export-pdf-btn');
const exportPdfBtnHe = document.getElementById('export-pdf-btn-he');
const threeContainer = document.getElementById('three-container');
const resumeContent = document.getElementById('resume-content');
const skillTooltip = document.getElementById('skill-tooltip');
const skillName = document.getElementById('skill-name');
const skillLevel = document.getElementById('skill-level');
const skillCategory = document.getElementById('skill-category');

// Language Toggle Functionality
enBtn.addEventListener('click', () => {
    setLanguage('en');
});

heBtn.addEventListener('click', () => {
    setLanguage('he');
});

function setLanguage(lang) {
    const body = document.body;
    
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
}

// PDF Export Functionality
exportPdfBtn.addEventListener('click', () => {
    exportPDF();
});

exportPdfBtnHe.addEventListener('click', () => {
    exportPDF();
});

function exportPDF() {
    // Hide Three.js container before export
    threeContainer.style.display = 'none';
    
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
        threeContainer.style.display = 'block';
    });
}

// Three.js Animation
let scene, camera, renderer, raycaster, mouse;
let particleSystem, particlesData, hoverGroup;
let skills = [];
let codeBlocks = [];
let musicalNotes = [];
let isHovering = false;
let composer, bloomPass;
let clock = new THREE.Clock();
let controls;
let defaultFont = null;
let particleTexture; // טקסטורה לחלקיקים
let activeExplosions = []; // מערך לשמירת ההתפוצצויות הפעילות

// Skills data with categories
const skillsData = [
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

// Color scheme by category
const categoryColors = {
    frontend: new THREE.Color(0x61dafb),    // React blue
    backend: new THREE.Color(0x68a063),     // Node.js green
    database: new THREE.Color(0x13aa52),    // MongoDB green
    devops: new THREE.Color(0x2496ed),      // Docker blue
    skill: new THREE.Color(0xff6b6b),       // Soft skills red
    highlight: new THREE.Color(0xffffff)    // White for highlights
};

// Initialize the scene and everything
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050505, 0.001);
    
    // Create camera with better perspective
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.z = 40;
    camera.position.y = 10;
    
    // Create WebGL renderer with antialiasing
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true 
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    threeContainer.appendChild(renderer.domElement);
    
    // טעינת טקסטורה לחלקיקים
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
        'https://threejs.org/examples/textures/sprites/circle.png',
        (texture) => {
            particleTexture = texture;
        }
    );
    
    // Setup raycaster for interaction
    raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 0.1;
    mouse = new THREE.Vector2();
    
    // Create a group for hover effects
    hoverGroup = new THREE.Group();
    scene.add(hoverGroup);
    
    // Add ambient and directional light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);
    
    // Create orbital controls for camera movement
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.8;
    controls.enableZoom = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.5;
    
    // טעינת פונט אם אפשר
    loadFont().then(font => {
        // Create 3D Elements
        createSkillsGalaxy();
        createCodeEnvironment();
        createMusicVisualization();
        
        // Setup post-processing
        setupPostProcessing();
    });
    
    // Setup event listeners
    window.addEventListener('resize', onWindowResize);
}

// Create skills galaxy - the main 3D element
function createSkillsGalaxy() {
    const skillsGroup = new THREE.Group();
    scene.add(skillsGroup);
    
    // הגדרות אופטימיזציה לגלקסיה יותר צפופה ומרשימה
    const radius = 18;
    const branches = 3;
    const spin = 1.5;  // יותר סיבוב!
    
    // Create skills as impressive particles
    skillsData.forEach((skill, i) => {
        // Calculate position on spiral
        const branchIndex = ["frontend", "backend", "database"].includes(skill.category) ? 0 : 
                           skill.category === "devops" ? 1 : 2;
        
        const angle = (i / skillsData.length) * Math.PI * 2;
        const branchAngle = (branchIndex / branches) * Math.PI * 2;
        
        const distance = Math.random() * radius * 0.6 + (radius * 0.3); // מרחק יותר קרוב
        const spinAngle = distance * spin;
        
        // Create a unique particle system for each skill - יותר חלקיקים!
        const skillGeometry = new THREE.BufferGeometry();
        const particleCount = Math.floor(skill.level * 120) + 30; // יותר חלקיקים לכל כישור
        
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        const skillColor = categoryColors[skill.category];
        
        // Create cluster of particles for each skill - חלקיקים יותר צפופים
        for (let j = 0; j < particleCount; j++) {
            // נשתמש בגרדינט כך שהחלקיקים יהיו צפופים יותר במרכז
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
            
            // חלקיקים עם גוונים שונים לכל קטגוריה - יותר מגוון
            const hueShift = Math.random() * 0.15 - 0.075; // +-7.5% הבדל בגוון
            const colorTemp = skillColor.clone();
            
            // שינוי קל בגוון
            if (j % 3 === 0) {
                colorTemp.offsetHSL(hueShift, 0.1, 0.1);
            }
            
            colors[j * 3] = colorTemp.r;
            colors[j * 3 + 1] = colorTemp.g;
            colors[j * 3 + 2] = colorTemp.b;
            
            // גדלים שונים לחלקיקים - יוצר עומק
            sizes[j] = Math.random() * 0.2 + 0.1;
        }
        
        skillGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        skillGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        skillGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // Create skill label - שיפור חומר החלקיקים
        const skillMaterial = new THREE.PointsMaterial({
            size: 0.2,
            vertexColors: true,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });
        
        const skillParticles = new THREE.Points(skillGeometry, skillMaterial);
        skillParticles.userData = { 
            type: 'skill', 
            name: skill.name, 
            category: skill.category,
            level: skill.level,
            icon: skill.icon
        };
        
        // Create 3D text for skill name (visible on hover) - if font is available
        if (defaultFont) {
            const textGeometry = new TextGeometry(skill.name, {
                font: defaultFont,
                size: 0.5,
                height: 0.1
            });
            textGeometry.computeBoundingBox();
            
            const textMaterial = new THREE.MeshBasicMaterial({ 
                color: categoryColors[skill.category],
                transparent: true,
                opacity: 0
            });
            
            const textMesh = new THREE.Mesh(textGeometry, textMaterial);
            
            // Position text near the skill particles
            const centerX = (positions[0] + positions[3] + positions[6]) / 3;
            const centerY = (positions[1] + positions[4] + positions[7]) / 3;
            const centerZ = (positions[2] + positions[5] + positions[8]) / 3;
            
            textMesh.position.set(centerX, centerY + 1, centerZ);
            textMesh.lookAt(camera.position);
            
            hoverGroup.add(textMesh);
            
            skills.push({
                particles: skillParticles,
                text: textMesh,
                originalPositions: positions.slice(),
                originalScale: skillParticles.scale.clone(),
                originalOpacity: textMaterial.opacity,
                creationTime: Math.random() * 1000 // זמן התחלה אקראי לאנימציות
            });
        } else {
            // אם אין פונט, פשוט נשמור את החלקיקים בלי טקסט
            skills.push({
                particles: skillParticles,
                text: null,
                originalPositions: positions.slice(),
                originalScale: skillParticles.scale.clone(),
                originalOpacity: skillMaterial.opacity,
                creationTime: Math.random() * 1000 // זמן התחלה אקראי לאנימציות
            });
        }
        
        // Add to scene
        skillsGroup.add(skillParticles);
    });
}

// Create code environment representing development skills
function createCodeEnvironment() {
    const codeGroup = new THREE.Group();
    scene.add(codeGroup);
    
    // If no font is available, skip text creation
    if (!defaultFont) {
        // Create a simple particle system instead
        const particles = createParticleCloud(500, [-15, 10, -20], 10);
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
    
    codeSnippets.forEach((line, i) => {
        // Create floating code line
        const textGeometry = new TextGeometry(line, {
            font: defaultFont,
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
        codeBlocks.push({
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
            font: defaultFont,
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

// Helper function to create particle clouds when text isn't available
function createParticleCloud(count, center, radius) {
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
        // Random position within radius
        const x = center[0] + (Math.random() - 0.5) * radius;
        const y = center[1] + (Math.random() - 0.5) * radius;
        const z = center[2] + (Math.random() - 0.5) * radius;
        
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        
        // Random blue-ish colors for code
        colors[i * 3] = 0.2 + Math.random() * 0.2;     // R
        colors[i * 3 + 1] = 0.5 + Math.random() * 0.3; // G
        colors[i * 3 + 2] = 0.8 + Math.random() * 0.2; // B
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        size: 0.1,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending
    });
    
    return new THREE.Points(particleGeometry, particleMaterial);
}

// Create music visualization
function createMusicVisualization() {
    const musicGroup = new THREE.Group();
    scene.add(musicGroup);
    
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
        
        // Create note head
        const headGeometry = new THREE.SphereGeometry(0.15, 16, 16);
        const headMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6b6b,
            transparent: true,
            opacity: 0.8
        });
        
        const noteHead = new THREE.Mesh(headGeometry, headMaterial);
        
        // Create note stem
        const stemGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8);
        const stemMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6b6b,
            transparent: true,
            opacity: 0.8
        });
        
        const noteStem = new THREE.Mesh(stemGeometry, stemMaterial);
        noteStem.position.set(0, 0.4, 0);
        
        // Create flag for eighth notes
        let noteFlag;
        if (noteType === 'eighth') {
            const flagGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.02);
            const flagMaterial = new THREE.MeshBasicMaterial({
                color: 0xff6b6b,
                transparent: true,
                opacity: 0.8
            });
            
            noteFlag = new THREE.Mesh(flagGeometry, flagMaterial);
            noteFlag.position.set(0.15, 0.7, 0);
            noteFlag.rotation.z = Math.PI * 0.1;
        }
        
        // Group note parts
        const noteGroup = new THREE.Group();
        noteGroup.add(noteHead);
        noteGroup.add(noteStem);
        if (noteFlag) noteGroup.add(noteFlag);
        
        // Position note randomly on or near the staff
        noteGroup.position.set(
            10 + (Math.random() - 0.5) * 15,
            -2 + Math.floor(Math.random() * 9) * 0.5,
            Math.random() * 5
        );
        
        noteGroup.rotation.y = Math.PI * 0.3;
        
        musicGroup.add(noteGroup);
        
        // Store for animation
        musicalNotes.push({
            group: noteGroup,
            originalY: noteGroup.position.y,
            speed: 0.01 + Math.random() * 0.02,
            phase: Math.random() * Math.PI * 2
        });
    }
}

// Handle mouse movements for interactivity
function onMouseMove(event) {
    // Calculate mouse position in normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    
    // Update raycaster
    raycaster.setFromCamera(mouse, camera);
    
    // Check for intersections with skill particles
    const intersects = raycaster.intersectObjects(scene.children, true);
    
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
    isHovering = hoveredSkill !== null;
    
    // Reset all skill visualizations
    skills.forEach(skill => {
        // Return particle sizes to normal
        skill.particles.material.size = 0.15;
        
        // Hide text if available
        if (skill.text) {
            skill.text.material.opacity = 0;
        }
    });
    
    // Hide tooltip if not hovering on skill
    if (!hoveredSkill) {
        skillTooltip.classList.add('hidden');
        return;
    }
    
    // If hovering over a skill, highlight it
    if (hoveredSkill) {
        const skillIndex = skills.findIndex(s => s.particles === hoveredSkill);
        if (skillIndex >= 0) {
            // Make particles bigger
            skills[skillIndex].particles.material.size = 0.3;
            
            // Show skill name in 3D space if text is available
            if (skills[skillIndex].text) {
                skills[skillIndex].text.material.opacity = 1;
                
                // Update text position to always face camera
                skills[skillIndex].text.lookAt(camera.position);
            }
            
            // Get skill data for HTML tooltip
            const skillData = hoveredSkill.userData;
            
            // Update tooltip content
            skillName.textContent = skillData.name + ' ' + skillData.icon;
            skillLevel.style.setProperty('--level', (skillData.level * 100) + '%');
            skillLevel.innerHTML = `<span style="width: ${skillData.level * 100}%"></span>`;
            
            // Translate categories for both languages
            const categoryTranslation = {
                frontend: { en: 'Frontend', he: 'פיתוח צד לקוח' },
                backend: { en: 'Backend', he: 'פיתוח צד שרת' },
                database: { en: 'Database', he: 'בסיסי נתונים' },
                devops: { en: 'DevOps', he: 'דבאופס' },
                skill: { en: 'Soft Skill', he: 'כישור רך' }
            };
            
            const lang = document.body.classList.contains('rtl') ? 'he' : 'en';
            skillCategory.textContent = categoryTranslation[skillData.category][lang];
            
            // Show and position tooltip
            skillTooltip.classList.remove('hidden');
            
            // Set class for category-specific styling
            skillTooltip.className = ''; // Reset classes
            skillTooltip.classList.add(skillData.category);
        }
    }
}

// Handle mouse clicks for deeper interaction
function onMouseClick(event) {
    // Use same raycaster setup as mousemove
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    if (intersects.length > 0) {
        // Find clicked skill
        for (let i = 0; i < intersects.length; i++) {
            const object = intersects[i].object;
            if (object.userData && object.userData.type === 'skill') {
                // Get skill data
                const skillData = object.userData;
                
                // זום למיקום המיומנות שנלחצה
                zoomToSkill(object);
                
                // Trigger a special animation for this skill
                highlightSkillCategory(skillData.category);
                
                // Play a sound effect to add feedback
                playSkillSound(skillData.category);
                
                break;
            }
        }
    }
}

// פונקציה חדשה לזום למיומנות
function zoomToSkill(skillObject) {
    // למצוא את המיקום של המיומנות
    const position = new THREE.Vector3();
    skillObject.getWorldPosition(position);
    
    // שמירת המיקום והסיבוב הנוכחי של המצלמה
    const startPosition = camera.position.clone();
    const startRotation = camera.quaternion.clone();
    
    // המיקום החדש - קרוב יותר למיומנות
    const targetPosition = position.clone().add(new THREE.Vector3(0, 0, 15));
    
    // Disable auto-rotation temporarily
    const originalAutoRotate = controls.autoRotate;
    controls.autoRotate = false;
    
    // Create animation
    const duration = 1000; // 1 שניה
    const startTime = Date.now();
    
    function animateCamera() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // פונקציית איזינג לתנועה חלקה
        const easedProgress = easeInOutCubic(progress);
        
        // עדכון מיקום המצלמה
        camera.position.lerpVectors(startPosition, targetPosition, easedProgress);
        
        // עדכון הסיבוב של המצלמה לפנות אל המיומנות
        const lookAtPosition = position.clone();
        camera.lookAt(lookAtPosition);
        
        if (progress < 1) {
            requestAnimationFrame(animateCamera);
        } else {
            // חזרה לאוטו-רוטייט אחרי 3 שניות
            setTimeout(() => {
                controls.autoRotate = originalAutoRotate;
            }, 3000);
        }
    }
    
    animateCamera();
}

// פונקציית איזינג - לתנועה חלקה
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Highlight a category of skills with special effects
function highlightSkillCategory(category) {
    // Create a flash effect
    createFlashEffect(category);
    
    // Dim all skills slightly
    skills.forEach(skill => {
        if (skill.particles.userData.category !== category) {
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
        skills.forEach(skill => {
            skill.particles.material.opacity = 0.8;
        });
    }, 2000);
}

// הוספת אפקט הבזק כשלוחצים על קטגוריה
function createFlashEffect(category) {
    // יצירת מישור שקוף
    const flashGeometry = new THREE.PlaneGeometry(100, 100);
    const flashMaterial = new THREE.MeshBasicMaterial({
        color: categoryColors[category],
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
    });
    
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.z = -50;
    flash.lookAt(camera.position);
    scene.add(flash);
    
    // אנימציית ההבזק
    let flashIntensity = 0;
    const flashDuration = 500; // חצי שניה
    const startTime = Date.now();
    
    function animateFlash() {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / flashDuration;
        
        if (progress < 0.5) {
            // Fade in
            flashMaterial.opacity = progress * 0.3; // מקסימום אטימות 0.3
        } else if (progress < 1) {
            // Fade out
            flashMaterial.opacity = (1 - progress) * 0.6;
        } else {
            // End animation
            scene.remove(flash);
            return;
        }
        
        requestAnimationFrame(animateFlash);
    }
    
    animateFlash();
}

// Create a unique sound for each skill category
function playSkillSound(category) {
    // יצירת אוסילטור חדש
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // בחירת סוג הגל לפי הקטגוריה
    const waveTypes = {
        'Development': 'sine',
        'Teaching': 'square',
        'Music': 'triangle',
        'AI': 'sawtooth'
    };
    
    oscillator.type = waveTypes[category] || 'sine';
    
    // קביעת תדר לפי הקטגוריה
    const baseFrequency = 220; // לה נמוך
    const frequencies = {
        'Development': baseFrequency * 1,      // לה
        'Teaching': baseFrequency * 5/4,       // דו
        'Music': baseFrequency * 3/2,          // מי
        'AI': baseFrequency * 2                // לה גבוה
    };
    
    oscillator.frequency.value = frequencies[category] || baseFrequency;
    
    // חיבור האוסילטור לגיין ולהוצאה
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // הגדרת קצב דעיכה של הצליל
    gainNode.gain.value = 0.1;
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1);
    
    // התחלה והפסקה של הצליל
    oscillator.start();
    setTimeout(() => {
        oscillator.stop();
    }, 1000);
}

// Animate code blocks with a floating effect
function animateCodeBlocks(time) {
    codeBlocks.forEach((block, i) => {
        // Create more pronounced floating motion
        block.mesh.position.y = block.originalY + Math.sin(time * 0.8 + i) * 0.2;
        
        // Add more dynamic rotation
        block.mesh.rotation.y = Math.PI * 0.1 + Math.sin(time * 0.5) * 0.1;
    });
}

// Animate musical notes
function animateMusicalNotes(time) {
    musicalNotes.forEach((note, i) => {
        // Create more dramatic wave motion on the staff
        note.group.position.y = note.originalY + Math.sin(time * note.speed * 1.5 + note.phase) * 0.3;
        
        // Add more pronounced rotation
        note.group.rotation.z = Math.sin(time * note.speed * 0.8) * 0.15;
    });
}

// Main animation loop
function animate() {
    requestAnimationFrame(animate);
    
    const time = clock.getElapsedTime();
    
    // Update skills galaxy - create dynamic rotation
    skills.forEach((skill, i) => {
        // Different rotation for different categories - FASTER
        const rotationSpeed = skill.particles.userData.category === 'frontend' ? 0.2 :
                             skill.particles.userData.category === 'backend' ? 0.15 : 0.1;
        
        // Rotate skill particles around their own center - FASTER
        skill.particles.rotation.y += 0.003 * rotationSpeed;
        skill.particles.rotation.x += 0.001 * rotationSpeed;
        
        // If not being hovered, add some gentle pulsing - MORE DRAMATIC
        if (!isHovering) {
            const pulseFactor = 1 + Math.sin(time * 0.8 + i) * 0.08;
            skill.particles.scale.set(pulseFactor, pulseFactor, pulseFactor);
        }
    });
    
    // Animate code blocks - FASTER
    if (codeBlocks.length > 0) {
        animateCodeBlocks(time);
    }
    
    // Animate musical notes - FASTER
    animateMusicalNotes(time);
    
    // עדכון ההתפוצצויות הפעילות
    activeExplosions.forEach(explosion => {
        explosion.update(time);
    });
    
    // Update orbital controls
    if (controls) controls.update();
    
    // Render scene with post-processing if available, otherwise regular render
    if (composer) {
        composer.render();
    } else {
        renderer.render(scene, camera);
    }
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Update composer size if post-processing is active
    if (composer) {
        composer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Load required font
function loadFont() {
    return new Promise((resolve, reject) => {
        const fontLoader = new FontLoader();
        fontLoader.load(
            'https://unpkg.com/three@0.160.0/examples/fonts/helvetiker_regular.typeface.json', 
            (font) => {
                defaultFont = font;
                resolve(font);
            }, 
            // onProgress callback
            (xhr) => {
                console.log((xhr.loaded / xhr.total * 100) + '% של הפונט נטען');
            },
            // onError callback
            (error) => {
                console.error('שגיאה בטעינת הפונט:', error);
                // המשך ללא הפונט במקרה של שגיאה
                resolve(null);
            }
        );
    });
}

// Show loading message while setting up
function showLoading() {
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
    loadingElement.textContent = 'Loading Experience...';
    
    document.body.appendChild(loadingElement);
    
    return loadingElement;
}

// Hide loading message
function hideLoading(loadingElement) {
    loadingElement.remove();
}

// Setup post-processing for more impressive visuals
function setupPostProcessing() {
    try {
        composer = new EffectComposer(renderer);
        
        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);
        
        bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.5,    // strength
            0.4,    // radius
            0.85     // threshold
        );
        composer.addPass(bloomPass);
        
        return true;
    } catch (error) {
        console.error('שגיאה ביצירת אפקטים:', error);
        return false;
    }
}

// פונקציה לאנימציית פתיחה
function startIntroAnimation() {
    // נשמור את המיקום המקורי של המצלמה
    const originalPosition = camera.position.clone();
    const targetPosition = new THREE.Vector3(0, 5, 60);
    
    // ניצור אנימציה לכניסה מרשימה
    const duration = 3000; // 3 שניות
    const startTime = Date.now();
    
    // כבה את הסיבוב האוטומטי בזמן האנימציה
    controls.autoRotate = false;
    
    function animateIntro() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // פונקציית איזינג לתנועה חלקה
        const easedProgress = easeInOutCubic(progress);
        
        // אנימציית מצלמה - התחלה רחוקה וכניסה פנימה
        camera.position.lerpVectors(targetPosition, originalPosition, easedProgress);
        
        if (progress < 1) {
            requestAnimationFrame(animateIntro);
        } else {
            // הפעל סיבוב אוטומטי כשהאנימציה מסתיימת
            controls.autoRotate = true;
            
            // הוסף אפקט הבהוב כללי לסיום האנימציה
            createFlashEffect('highlight');
        }
    }
    
    animateIntro();
}

// כשדף הHTML נטען
document.addEventListener('DOMContentLoaded', () => {
    // אתחול הסצנה
    init();
    
    // התחלת לולאת האנימציה
    animate();
    
    // הוספת אירועי מאזינים לאינטראקציה
    document.addEventListener('mousemove', onMouseMove, false);
    document.addEventListener('click', onMouseClick, false);
    
    // הוספת מאזינים לכל אלמנטי ה-skill בדף
    document.querySelectorAll('.skill').forEach(skillElement => {
        skillElement.addEventListener('click', (event) => {
            // מציאת השם של המיומנות
            const skillName = event.target.textContent;
            
            // מציאת המיומנות בנתונים
            const skillData = skillsData.find(skill => skill.name === skillName);
            
            if (skillData) {
                // הפעלת אפקט התפוצצות גדול במרכז הסצנה
                createBigExplosion(skillData.category);
                
                // השמעת צליל
                playSkillSound(skillData.category);
            } else {
                // אם המיומנות לא נמצאה, יצירת התפוצצות כללית
                createBigExplosion('highlight');
            }
        });
    });
    
    // הפעלת אנימציית הפתיחה
    startIntroAnimation();
});

// פונקציה ליצירת התפוצצות גדולה של חלקיקים
function createBigExplosion(category) {
    // המרכז של ההתפוצצות
    const center = new THREE.Vector3(0, 0, 0);
    
    // מספר החלקיקים בהתפוצצות
    const particleCount = 300;
    
    // יצירת גיאומטריה לחלקיקים
    const explosionGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const velocities = []; // מהירויות לאנימציה
    
    // הצבע של החלקיקים לפי הקטגוריה
    const explosionColor = categoryColors[category] || new THREE.Color(0xffffff);
    
    // יצירת החלקיקים בנקודת ההתחלה
    for (let i = 0; i < particleCount; i++) {
        // כל החלקיקים מתחילים במרכז
        positions[i * 3] = center.x;
        positions[i * 3 + 1] = center.y;
        positions[i * 3 + 2] = center.z;
        
        // וריאציות צבע
        const colorVariation = new THREE.Color(explosionColor.clone());
        colorVariation.offsetHSL(Math.random() * 0.2 - 0.1, 0, Math.random() * 0.2);
        
        colors[i * 3] = colorVariation.r;
        colors[i * 3 + 1] = colorVariation.g;
        colors[i * 3 + 2] = colorVariation.b;
        
        // גדלים אקראיים
        sizes[i] = Math.random() * 0.5 + 0.1;
        
        // שמירת וקטור המהירות לכל חלקיק
        const theta = Math.random() * Math.PI * 2; // זווית אקראית
        const phi = Math.random() * Math.PI; // זווית אקראית
        
        const velocity = new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta),
            Math.sin(phi) * Math.sin(theta),
            Math.cos(phi)
        );
        
        // מהירות אקראית
        const speed = Math.random() * 0.5 + 0.2;
        velocity.multiplyScalar(speed);
        
        velocities.push(velocity);
    }
    
    // הגדרת המאפיינים של הגיאומטריה
    explosionGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    explosionGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    explosionGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    // יצירת החומר לחלקיקים עם טקסטורה אם היא זמינה
    const explosionMaterial = new THREE.PointsMaterial({
        size: 1.2,
        vertexColors: true,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
        map: particleTexture || null
    });
    
    // יצירת מערכת החלקיקים
    const explosionParticles = new THREE.Points(explosionGeometry, explosionMaterial);
    explosionParticles.userData.creationTime = Date.now();
    explosionParticles.userData.velocities = velocities;
    
    // מיקום ההתפוצצות מעט קדימה כדי שתהיה נראית יותר
    explosionParticles.position.z = -10;
    
    // הוספה לסצנה
    scene.add(explosionParticles);
    
    // אובייקט למעקב
    const explosion = {
        particles: explosionParticles,
        velocities: velocities,
        update: function(time) {
            const elapsedTime = (Date.now() - this.particles.userData.creationTime) / 1000;
            const positionArray = this.particles.geometry.attributes.position.array;
            
            // עדכון מיקום החלקיקים על פי המהירויות
            for (let i = 0; i < particleCount; i++) {
                positionArray[i * 3] += this.velocities[i].x;
                positionArray[i * 3 + 1] += this.velocities[i].y;
                positionArray[i * 3 + 2] += this.velocities[i].z;
                
                // האטה הדרגתית
                this.velocities[i].multiplyScalar(0.98);
            }
            
            this.particles.geometry.attributes.position.needsUpdate = true;
            
            // דעיכה הדרגתית של השקיפות
            this.particles.material.opacity = Math.max(0, 1 - elapsedTime * 0.5);
            
            // גדילה מתונה של החלקיקים לאורך הזמן
            const currentSize = 1.2 + elapsedTime * 0.5;
            this.particles.material.size = currentSize;
            
            // אם ההתפוצצות הסתיימה, הסרה מהסצנה
            if (elapsedTime > 2.0) {
                scene.remove(this.particles);
                activeExplosions.splice(activeExplosions.indexOf(this), 1);
                this.particles.geometry.dispose();
                this.particles.material.dispose();
            }
        }
    };
    
    // הוספה למערך ההתפוצצויות הפעילות
    activeExplosions.push(explosion);
    
    // יצירת הבהוב כללי של האור
    if (bloomPass) {
        const originalStrength = bloomPass.strength;
        bloomPass.strength = originalStrength * 2;
        
        // החזרה לערך המקורי אחרי 300 מילישניות
        setTimeout(() => {
            bloomPass.strength = originalStrength;
        }, 300);
    }
}