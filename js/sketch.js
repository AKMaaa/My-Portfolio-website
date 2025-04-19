// =====================================================
// p5.js Sketch File: js/sketch.js (Multiple Hearts Formation)
// =====================================================

let particles = [];
let p5Canvas;
let currentParticleP5Colors = [];
let hearts = []; // 複数のハートを格納する配列
let numParticles = 1000; // パーティクル数を増やした

// State management for animation
let currentState = 'SCATTERING'; // Initial state
let stateTimer = 0;
const timeInHeart = 300; // Frames to stay in heart shape
const timeScattering = 400; // Frames to scatter

// Parses RGBA color string safely
function parseRGBAColor(rgbaString) {
    if (!rgbaString || typeof rgbaString !== 'string') return null;
    const match = rgbaString.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) {
        const r = parseInt(match[1], 10); const g = parseInt(match[2], 10); const b = parseInt(match[3], 10);
        const a = match[4] ? parseFloat(match[4]) : 1;
        return { r, g, b, a: a * 255 };
    }
    console.warn(`Could not parse RGBA string in sketch.js: ${rgbaString}`);
    return null;
}

// Function to update colors based on theme
window.updateP5Theme = function (newColorData) {
    if (!newColorData || !Array.isArray(newColorData)) { /* ... (error handling) ... */ if (typeof color === 'function') { currentParticleP5Colors = [color(100, 100, 100, 150)]; } else { currentParticleP5Colors = []; } return; }
    try { if (typeof color === 'function') { currentParticleP5Colors = newColorData.map(c => color(c.r, c.g, c.b, c.a)); if (currentParticleP5Colors.length === 0) { currentParticleP5Colors.push(color(100, 100, 100, 150)); } } else { console.warn("p5 color function not available during theme update."); } } catch (e) { console.error("Error applying new theme colors in p5:", e); if (typeof color === 'function') { currentParticleP5Colors = [color(100, 100, 100, 150)]; } }
    // Apply new colors to existing particles immediately
    if (particles && particles.length > 0 && currentParticleP5Colors.length > 0) {
        particles.forEach(p => { p.color = random(currentParticleP5Colors); });
    }
}

// Heart Class to manage multiple hearts
class Heart {
    constructor(x, y, scale) {
        this.position = createVector(x, y);
        this.scale = scale; // サイズ (小：0.5, 中：1.0, 大：1.5 など)
        this.points = [];
        this.calculatePoints();
    }

    // Calculate points for this heart
    calculatePoints() {
        this.points = [];
        let numPoints = floor(map(this.scale, 20, 40, 60, 80)); // スケールに応じてポイント数を調整
        
        // Parametric equation for a heart shape
        for (let t = 0; t < TWO_PI; t += TWO_PI / numPoints) {
            let x = this.scale * 16 * pow(sin(t), 3);
            let y = -this.scale * (13 * cos(t) - 5 * cos(2 * t) - 2 * cos(3 * t) - cos(4 * t));
            this.points.push(createVector(x + this.position.x, y + this.position.y));
        }
    }
}

// Setup multiple hearts with different sizes and positions
function setupHearts() {
    hearts = [];
    
    // 大中小のハートを画面いっぱいにランダム配置
    let numHearts = random(5, 12); // 表示するハートの数
    
    for (let i = 0; i < numHearts; i++) {
        // ランダムな位置（画面内に収まるよう調整）
        let x = random(-width/3, width/3);
        let y = random(-height/3, height/3);
        
        // ランダムなサイズ（小：1.0～1.5、中：1.5～2.5、大：2.5～3.5）- 全体的に大きくした
        let size;
        let sizeCategory = random(3); // 0,1,2のいずれか
        
        if (sizeCategory < 1) {
            size = random(1.0, 1.5); // 小さいハート（拡大）
        } else if (sizeCategory < 2) {
            size = random(1.5, 2.5); // 中くらいのハート（拡大）
        } else {
            size = random(2.5, 3.5); // 大きいハート（拡大）
        }
        
        hearts.push(new Heart(x, y, size));
    }
}

// ハートのポイントを全て結合した配列を取得
function getAllHeartPoints() {
    let allPoints = [];
    hearts.forEach(heart => {
        allPoints = allPoints.concat(heart.points);
    });
    return allPoints;
}

function setup() {
    let canvasContainer = document.getElementById('p5-canvas-container');
    try {
        if (!canvasContainer) throw new Error("Canvas container not found");
        p5Canvas = createCanvas(canvasContainer.offsetWidth, canvasContainer.offsetHeight);
        p5Canvas.parent('p5-canvas-container');
        noiseDetail(1, 0.5);

        // 複数のハートをセットアップ
        setupHearts();

        // Load initial theme colors
        if (currentParticleP5Colors.length === 0 && typeof getThemeParticleColors === 'function') {
            window.updateP5Theme(getThemeParticleColors());
        } else if (currentParticleP5Colors.length === 0 && typeof color === 'function') {
            // Fallback
            currentParticleP5Colors = [color(100, 100, 100, 150)];
        }

        // 全てのハートポイントを取得
        let allHeartPoints = getAllHeartPoints();
        
        // 利用可能なポイント数に合わせてパーティクル数を調整
        numParticles = min(350, allHeartPoints.length); // パーティクル数を増やした

        // Create particles and assign initial targets
        particles = [];
        for (let i = 0; i < numParticles; i++) {
            // Start particles at random positions
            let startPos = createVector(random(width), random(height));
            // Assign a target point from any heart
            let targetIndex = i % allHeartPoints.length;
            particles.push(new Particle(startPos.x, startPos.y, allHeartPoints[targetIndex]));
        }

        currentState = 'SCATTERING'; // Start scattered
        stateTimer = timeScattering; // Set timer for initial scattering duration

    } catch (e) {
        console.error("p5.js setup error:", e);
        if (canvasContainer) canvasContainer.style.display = 'none';
        noLoop();
        return;
    }

    window.addEventListener('resize', () => {
        try {
            if (!canvasContainer || !p5Canvas) return;
            resizeCanvas(canvasContainer.offsetWidth, canvasContainer.offsetHeight);
            
            // リサイズ時に新しいハートを生成
            setupHearts();
            let allHeartPoints = getAllHeartPoints();
            
            numParticles = min(150, allHeartPoints.length);
            
            particles = []; // Reset particles on resize
            if (currentParticleP5Colors.length === 0 && typeof getThemeParticleColors === 'function') { 
                window.updateP5Theme(getThemeParticleColors()); 
            }
            
            for (let i = 0; i < numParticles; i++) {
                let startPos = createVector(random(width), random(height));
                let targetIndex = i % allHeartPoints.length;
                particles.push(new Particle(startPos.x, startPos.y, allHeartPoints[targetIndex]));
            }
            
            currentState = 'SCATTERING';
            stateTimer = timeScattering;

        } catch (e) { console.error("p5.js resize error:", e); }
    });
}

function draw() {
    if (!p5Canvas || typeof background !== 'function' || typeof color !== 'function') return;

    try {
        let themeBgStr = getComputedStyle(document.documentElement).getPropertyValue('--color-p5-bg').trim();
        let bgData = parseRGBAColor(themeBgStr);
        // Make background more transparent for less visible trails
        let bgCol = bgData ? color(bgData.r, bgData.g, bgData.b, bgData.a * 0.8) : color(0, 0, 0, 5); // アルファ値を小さくして軌跡を薄く
        background(bgCol);

        // Translate origin to center
        translate(width / 2, height / 2);

        // Update and display particles
        for (let i = particles.length - 1; i >= 0; i--) {
            if (particles[i]) { // Ensure particle exists
                if (currentState === 'SEEKING_HEART' || currentState === 'FORMING_HEART') {
                    particles[i].seekTarget();
                } else { // SCATTERING state
                    particles[i].wander();
                }
                particles[i].update();
                particles[i].display();
            }
        }

        // State transition logic
        stateTimer--;
        if (stateTimer <= 0) {
            if (currentState === 'SCATTERING') {
                currentState = 'SEEKING_HEART';
                stateTimer = timeInHeart * 1.5; // Time to seek + form
                
                // 新しいハートを生成
                setupHearts();
                let allHeartPoints = getAllHeartPoints();
                
                // Reassign targets to ensure they go towards the heart
                for (let i = 0; i < particles.length; i++) {
                    if (particles[i]) {
                        particles[i].target = allHeartPoints[i % allHeartPoints.length];
                    }
                }
            } else if (currentState === 'SEEKING_HEART') {
                currentState = 'FORMING_HEART';
                stateTimer = timeInHeart;
            } else if (currentState === 'FORMING_HEART') {
                currentState = 'SCATTERING';
                stateTimer = timeScattering;
            }
        }

    } catch (e) {
        console.error("p5.js draw loop error:", e);
        noLoop();
    }
}

// ===========================
// Particle Class (Modified)
// ===========================
class Particle {
    constructor(x, y, target) {
        this.pos = createVector(x, y);
        this.vel = p5.Vector.random2D().mult(random(1, 3)); // Initial random velocity
        this.acc = createVector(0, 0);
        this.target = target.copy(); // Target position on any heart
        this.originalTarget = target.copy(); // Keep original heart target
        this.maxSpeed = random(2, 4); // Slightly faster max speed
        this.maxForce = 0.3;       // Steering force limit
        this.size = random(1, 1.4); // より小さいパーティクルサイズ
        this.color = random(currentParticleP5Colors.length > 0 ? currentParticleP5Colors : [color(100, 100, 100, 150)]);
        this.noiseOffsetX = random(1000); // For wander behavior
        this.noiseOffsetY = random(1000);
    }

    applyForce(force) {
        this.acc.add(force);
    }

    // --- Steering Behaviors ---

    // Seek: Steer towards a target position
    seek(targetPos) {
        let desired = p5.Vector.sub(targetPos, this.pos);
        let d = desired.mag();
        let speed = this.maxSpeed;
        // Arrival behavior: slow down when close to target
        if (d < 100) { // Radius to start slowing down
            speed = map(d, 0, 100, 0, this.maxSpeed);
        }
        desired.setMag(speed);
        let steer = p5.Vector.sub(desired, this.vel);
        steer.limit(this.maxForce);
        return steer;
    }

    // Wander: Simulate random-like movement using Perlin noise
    wander() {
        let wanderAngle = noise(this.pos.x * 0.01, this.pos.y * 0.01, frameCount * 0.01 + this.noiseOffsetX) * TWO_PI * 2 - TWO_PI; // Angle changes over time
        let wanderForce = p5.Vector.fromAngle(wanderAngle);
        wanderForce.setMag(this.maxForce * 0.5); // Less forceful wandering
        this.applyForce(wanderForce);
    }

    // --- Update & Display ---

    seekTarget() {
        // In FORMING_HEART state, make target the original heart position
        // In SEEKING_HEART, target is also the heart position
        let force = this.seek(this.target);
        this.applyForce(force);

        // Add a little random jitter when close to target in FORMING_HEART state
        if (currentState === 'FORMING_HEART' && this.pos.dist(this.target) < 5) {
            let jitter = p5.Vector.random2D().mult(0.5);
            this.applyForce(jitter);
        }
    }

    update() {
        this.vel.add(this.acc);
        this.vel.limit(this.maxSpeed);
        this.pos.add(this.vel);
        this.acc.mult(0); // Reset acceleration
    }

    display() {
        noStroke();
        if (this.color && typeof this.color.levels !== 'undefined') {
            // Fade in/out based on state? Or keep simple. Let's keep simple for now.
            // Use the particle's assigned color. Adjust alpha slightly.
            let displayColor = color(red(this.color), green(this.color), blue(this.color), alpha(this.color) * 0.8);
            fill(displayColor);
            ellipse(this.pos.x, this.pos.y, this.size, this.size);
        } else {
            fill(150, 150); // Fallback
            ellipse(this.pos.x, this.pos.y, this.size, this.size);
        }
    }

    // We are not using lifespan/decay in this version
    isDead() {
        return false; // Particles don't die in this version
    }
}