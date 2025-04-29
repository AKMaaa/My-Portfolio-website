// js/sketch.js (Instance Mode for Background)

// Helper function (can be global or moved inside instance scope if not needed elsewhere)
function parseRGBAColor(rgbaString) {
    if (!rgbaString || typeof rgbaString !== 'string') return null;
    const match = rgbaString.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) {
        const r = parseInt(match[1], 10); const g = parseInt(match[2], 10); const b = parseInt(match[3], 10);
        // p5.color expects alpha 0-255, but CSS gives 0-1. Multiply by 255.
        const a = match[4] ? parseFloat(match[4]) : 1;
        return { r, g, b, a: a * 255 }; // Convert alpha to 0-255 for p5.color
    }
    console.warn(`Could not parse RGBA string in sketch.js: ${rgbaString}`);
    return null;
}

// Global variable to hold the p5 instance for the background sketch
let backgroundP5Instance = null;

// Global function to update theme colors for the background sketch
window.updateP5Theme = function (newColorData) {
    if (!backgroundP5Instance) {
        console.warn("Background p5 instance not ready for theme update.");
        return;
    }
    const p = backgroundP5Instance; // Use the stored instance

    if (!newColorData || !Array.isArray(newColorData)) {
        if (typeof p.color === 'function') {
            p.currentParticleP5Colors = [p.color(100, 100, 100, 150)];
        } else {
            p.currentParticleP5Colors = [];
        }
        console.warn("Invalid color data received in updateP5Theme.");
        return;
    }

    try {
        if (typeof p.color === 'function') {
            p.currentParticleP5Colors = newColorData.map(c => p.color(c.r, c.g, c.b, c.a)); // Assuming c.a is already 0-255
            if (p.currentParticleP5Colors.length === 0) {
                p.currentParticleP5Colors.push(p.color(100, 100, 100, 150));
            }
        } else {
            console.warn("p5.color function not available during theme update.");
            p.currentParticleP5Colors = [];
        }
    } catch (e) {
        console.error("Error applying new theme colors in p5:", e);
        if (typeof p.color === 'function') {
            p.currentParticleP5Colors = [p.color(100, 100, 100, 150)];
        } else {
            p.currentParticleP5Colors = [];
        }
    }

    if (p.particles && p.particles.length > 0 && p.currentParticleP5Colors && p.currentParticleP5Colors.length > 0) {
        p.particles.forEach(particle => {
            if (particle) {
                particle.color = p.random(p.currentParticleP5Colors);
            }
        });
    }
}

// Define the sketch using instance mode
const backgroundSketch = (p) => {
    // Sketch-specific variables
    p.particles = [];
    p.p5Canvas = null;
    p.currentParticleP5Colors = [];
    p.hearts = [];
    p.numParticles = 350; // Default, adjusted in setup
    p.currentState = 'SCATTERING';
    p.stateTimer = 0;
    const timeInHeart = 300;
    const timeScattering = 400;

    // Assign this instance to the global variable
    backgroundP5Instance = p;

    // Define classes within the sketch scope
    class Heart {
        constructor(x, y, scale) {
            this.position = p.createVector(x, y);
            this.scale = scale;
            this.points = [];
            this.calculatePoints();
        }
        calculatePoints() {
            this.points = [];
            let numPoints = p.floor(p.map(this.scale, 1.0, 3.5, 50, 150)); // More points for larger hearts
            for (let t = 0; t < p.TWO_PI; t += p.TWO_PI / numPoints) {
                // Parametric equation for a heart shape
                let x = this.scale * 16 * p.pow(p.sin(t), 3);
                let y = -this.scale * (13 * p.cos(t) - 5 * p.cos(2 * t) - 2 * p.cos(3 * t) - p.cos(4 * t));
                this.points.push(p.createVector(x + this.position.x, y + this.position.y));
            }
        }
    }

    class Particle {
        constructor(x, y, target) {
            this.pos = p.createVector(x, y);
            // Use p5.Vector static methods if available globally, or p.createVector()...
            // Check if p5.Vector is globally available might be safer
            this.vel = (typeof p5 !== 'undefined' && p5.Vector) ? p5.Vector.random2D().mult(p.random(1, 3)) : p.createVector(p.random(-1, 1), p.random(-1, 1)).mult(p.random(1, 3));
            this.acc = p.createVector(0, 0);
            this.target = target ? target.copy() : p.createVector(p.random(p.width), p.random(p.height));
            this.originalTarget = this.target.copy(); // Copy the potentially randomized target if original was undefined
            this.maxSpeed = p.random(2, 4);
            this.maxForce = 0.3;
            this.size = p.random(1, 1.4);
            // Initialize color safely
            this.color = p.currentParticleP5Colors && p.currentParticleP5Colors.length > 0
                ? p.random(p.currentParticleP5Colors)
                : p.color(100, 100, 100, 150); // Fallback color using p.color
            this.noiseOffsetX = p.random(1000);
            this.noiseOffsetY = p.random(1000);
        }
        applyForce(force) { this.acc.add(force); }
        seek(targetPos) {
            let desired = p5.Vector.sub(targetPos, this.pos); // Assumes p5.Vector is global
            let d = desired.mag();
            let speed = this.maxSpeed;
            if (d < 100) { speed = p.map(d, 0, 100, 0, this.maxSpeed); }
            desired.setMag(speed);
            let steer = p5.Vector.sub(desired, this.vel); // Assumes p5.Vector is global
            steer.limit(this.maxForce);
            return steer;
        }
        wander() {
            let wanderAngle = p.noise(this.pos.x * 0.01, this.pos.y * 0.01, p.frameCount * 0.01 + this.noiseOffsetX) * p.TWO_PI * 2 - p.TWO_PI;
            let wanderForce = p5.Vector.fromAngle(wanderAngle); // Assumes p5.Vector is global
            wanderForce.setMag(this.maxForce * 0.5);
            this.applyForce(wanderForce);
        }
        seekTarget() {
            let force = this.seek(this.target);
            this.applyForce(force);
            if (p.currentState === 'FORMING_HEART' && this.target && this.pos.dist(this.target) < 5) { // Check target exists
                let jitter = p5.Vector.random2D().mult(0.5); // Assumes p5.Vector is global
                this.applyForce(jitter);
            }
        }
        update() {
            this.vel.add(this.acc);
            this.vel.limit(this.maxSpeed);
            this.pos.add(this.vel);
            this.acc.mult(0);
        }
        display() {
            p.noStroke();
            if (this.color && typeof this.color === 'object' && this.color.levels) {
                let displayColor = p.color(p.red(this.color), p.green(this.color), p.blue(this.color), p.alpha(this.color) * 0.8);
                p.fill(displayColor);
                p.ellipse(this.pos.x, this.pos.y, this.size, this.size);
            } else {
                p.fill(150, 150);
                p.ellipse(this.pos.x, this.pos.y, this.size, this.size);
            }
        }
        isDead() { return false; }
    }

    // --- Helper Functions within sketch scope ---
    function setupHearts() {
        p.hearts = [];
        let numHearts = p.random(5, 12);
        for (let i = 0; i < numHearts; i++) {
            let x = p.random(-p.width / 3, p.width / 3);
            let y = p.random(-p.height / 3, p.height / 3);
            let size;
            let sizeCategory = p.random(3);
            if (sizeCategory < 1) { size = p.random(1.0, 1.5); }
            else if (sizeCategory < 2) { size = p.random(1.5, 2.5); }
            else { size = p.random(2.5, 3.5); }
            p.hearts.push(new Heart(x, y, size));
        }
    }

    function getAllHeartPoints() {
        let allPoints = [];
        if (p.hearts && p.hearts.length > 0) {
            p.hearts.forEach(heart => {
                if (heart && heart.points) {
                    allPoints = allPoints.concat(heart.points);
                }
            });
        }
        return allPoints;
    }

    function initializeParticles() {
        setupHearts();
        let allHeartPoints = getAllHeartPoints();
        if (allHeartPoints.length === 0) {
            console.warn("No heart points generated for background, cannot create particles.");
            p.numParticles = 0;
            p.particles = [];
            return;
        }

        p.numParticles = p.min(350, allHeartPoints.length);

        // Initialize colors if needed
        if (p.currentParticleP5Colors.length === 0 && typeof window.getThemeParticleColors === 'function') {
            window.updateP5Theme(window.getThemeParticleColors());
        } else if (p.currentParticleP5Colors.length === 0) {
            p.currentParticleP5Colors = [p.color(100, 100, 100, 150)];
        }


        p.particles = [];
        for (let i = 0; i < p.numParticles; i++) {
            let startPos = p.createVector(p.random(p.width), p.random(p.height));
            let targetIndex = i % allHeartPoints.length;
            if (allHeartPoints[targetIndex]) {
                p.particles.push(new Particle(startPos.x, startPos.y, allHeartPoints[targetIndex]));
            }
        }
        p.currentState = 'SCATTERING';
        p.stateTimer = timeScattering;
    }

    // --- p.setup ---
    p.setup = () => {
        let canvasContainer = document.getElementById('p5-canvas-container');
        try {
            if (!canvasContainer) throw new Error("Background canvas container #p5-canvas-container not found");
            p.p5Canvas = p.createCanvas(canvasContainer.offsetWidth, canvasContainer.offsetHeight);
            p.p5Canvas.parent('p5-canvas-container');
            // Styles should be set via CSS for better control
            // p.p5Canvas.style('position', 'fixed');
            // p.p5Canvas.style('top', '0');
            // p.p5Canvas.style('left', '0');
            // p.p5Canvas.style('z-index', '-1');
            // p.p5Canvas.style('pointer-events', 'none');

            p.noiseDetail(1, 0.5);
            initializeParticles();

        } catch (e) {
            console.error("p5.js background setup error:", e);
            if (canvasContainer) canvasContainer.style.display = 'none';
            p.noLoop();
            return;
        }
    };

    // --- p.draw ---
    p.draw = () => {
        if (!p.p5Canvas || !p.particles) return; // Ensure canvas and particles exist

        try {
            // Get background color from CSS variable
            let themeBgStr = getComputedStyle(document.documentElement).getPropertyValue('--color-p5-bg').trim();
            let bgData = parseRGBAColor(themeBgStr); // Use helper function
            let bgCol = bgData ? p.color(bgData.r, bgData.g, bgData.b, bgData.a * 0.8) // Use alpha directly if parseRGBAColor returns 0-255
                : p.color(0, 0, 0, 5);
            p.background(bgCol);

            p.translate(p.width / 2, p.height / 2);

            // Update and display particles
            for (let i = p.particles.length - 1; i >= 0; i--) {
                if (p.particles[i]) {
                    if (p.currentState === 'SEEKING_HEART' || p.currentState === 'FORMING_HEART') {
                        p.particles[i].seekTarget();
                    } else {
                        p.particles[i].wander();
                    }
                    p.particles[i].update();
                    p.particles[i].display();
                }
            }

            // State transition logic
            p.stateTimer--;
            if (p.stateTimer <= 0) {
                if (p.currentState === 'SCATTERING') {
                    p.currentState = 'SEEKING_HEART';
                    p.stateTimer = timeInHeart * 1.5;
                    setupHearts();
                    let allHeartPoints = getAllHeartPoints();
                    if (allHeartPoints.length > 0) {
                        for (let i = 0; i < p.particles.length; i++) {
                            if (p.particles[i]) {
                                p.particles[i].target = allHeartPoints[i % allHeartPoints.length];
                            }
                        }
                    } else {
                        p.currentState = 'SCATTERING'; // Revert if no points
                        p.stateTimer = timeScattering;
                    }
                } else if (p.currentState === 'SEEKING_HEART') {
                    p.currentState = 'FORMING_HEART';
                    p.stateTimer = timeInHeart;
                } else if (p.currentState === 'FORMING_HEART') {
                    p.currentState = 'SCATTERING';
                    p.stateTimer = timeScattering;
                }
            }

        } catch (e) {
            console.error("p5.js background draw loop error:", e);
            p.noLoop();
        }
    };

    // --- p.windowResized ---
    p.windowResized = () => {
        try {
            let canvasContainer = document.getElementById('p5-canvas-container');
            if (!canvasContainer || !p.p5Canvas) return;
            // Check container size before resizing
            let containerWidth = canvasContainer.offsetWidth;
            let containerHeight = canvasContainer.offsetHeight;
            if (containerWidth > 0 && containerHeight > 0) {
                p.resizeCanvas(containerWidth, containerHeight);
                initializeParticles(); // Re-initialize simulation on resize
            } else {
                console.warn("Container has zero size during resize.");
            }
        } catch (e) { console.error("p5.js background resize error:", e); }
    };

};

// Create the p5 instance for the background sketch
new p5(backgroundSketch);