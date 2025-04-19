// =====================================================
// p5.js Sketch File: js/sketch.js
// =====================================================
let particles = [];
let p5Canvas;
let currentParticleP5Colors = []; // Stores p5.color objects

// Parses RGBA color string safely
function parseRGBAColor(rgbaString) {
    if (!rgbaString || typeof rgbaString !== 'string') return null;
    // Updated regex to handle optional spaces and potentially missing alpha
    const match = rgbaString.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\)/);
    if (match) {
        const r = parseInt(match[1], 10);
        const g = parseInt(match[2], 10);
        const b = parseInt(match[3], 10);
        const a = match[4] ? parseFloat(match[4]) : 1; // Default alpha to 1 if not present
        return { r, g, b, a: a * 255 }; // p5.js uses alpha 0-255
    }
    console.warn(`Could not parse RGBA string in sketch.js: ${rgbaString}`);
    return null; // Return null if parsing fails
}


// Function to update colors based on theme (callable by theme toggle in main.js)
window.updateP5Theme = function (newColorData) { // Accept color data object array
    if (!newColorData || !Array.isArray(newColorData)) {
        console.warn("updateP5Theme called without valid color data array.");
        // Use a fallback if needed, ensuring p5 color function is available
        if (typeof color === 'function') {
            currentParticleP5Colors = [color(100, 100, 100, 150)];
        } else {
            currentParticleP5Colors = []; // Cannot create p5 colors yet
        }
        return;
    }
    try {
        if (typeof color === 'function') { // Check if p5 color function is ready
            // Convert received RGBA data to p5.color objects
            currentParticleP5Colors = newColorData.map(c => color(c.r, c.g, c.b, c.a));
            // Ensure there's at least one color even if mapping fails partially
            if (currentParticleP5Colors.length === 0) {
                currentParticleP5Colors.push(color(100, 100, 100, 150));
            }
        } else {
            console.warn("p5 color function not available during theme update.");
            // Store raw data for later use in setup/draw if needed, or handle differently
        }
    } catch (e) {
        console.error("Error applying new theme colors in p5:", e);
        // Use fallback if conversion fails
        if (typeof color === 'function') {
            currentParticleP5Colors = [color(100, 100, 100, 150)];
        }
    }
}

function setup() {
    let canvasContainer = document.getElementById('p5-canvas-container');
    try {
        if (!canvasContainer) throw new Error("Canvas container not found");
        p5Canvas = createCanvas(canvasContainer.offsetWidth, canvasContainer.offsetHeight);
        p5Canvas.parent('p5-canvas-container');
        noiseDetail(1, 0.5);
        // Initial theme colors should be set by main.js after DOM load
        // window.updateP5Theme(); // Remove initial call from here

        particles = []; // Clear just in case
        // Ensure colors are loaded before creating particles
        if (currentParticleP5Colors.length === 0 && typeof window.getThemeParticleColors === 'function') {
            // If main.js loaded first and set colors, try getting them
            // This is less ideal than main.js calling updateP5Theme
            window.updateP5Theme(window.getThemeParticleColors()); // Needs getThemeParticleColors to be global
        }

        for (let i = 0; i < 60; i++) { particles.push(new Particle(random(width), random(height))); }

    } catch (e) {
        console.error("p5.js setup error:", e);
        if (canvasContainer) canvasContainer.style.display = 'none'; // Hide container on error
        noLoop(); // Stop p5 loop
        return;
    }

    window.addEventListener('resize', () => {
        try {
            if (!canvasContainer || !p5Canvas) return; // Check if elements exist
            resizeCanvas(canvasContainer.offsetWidth, canvasContainer.offsetHeight);
            particles = [];
            // Re-initialize particles with current theme colors
            if (currentParticleP5Colors.length === 0 && typeof window.getThemeParticleColors === 'function') {
                window.updateP5Theme(window.getThemeParticleColors());
            }
            for (let i = 0; i < 60; i++) { particles.push(new Particle(random(width), random(height))); }
        } catch (e) { console.error("p5.js resize error:", e); }
    });
}

function draw() {
    if (!p5Canvas || typeof background !== 'function' || typeof color !== 'function') return; // Ensure p5 functions are available

    try {
        let themeBgStr = getComputedStyle(document.documentElement).getPropertyValue('--color-p5-bg').trim();
        let bgData = parseRGBAColor(themeBgStr);
        let bgCol = bgData ? color(bgData.r, bgData.g, bgData.b, bgData.a * 0.2) : color(0, 0, 0, 5); // Fallback

        background(bgCol);

        for (let i = particles.length - 1; i >= 0; i--) {
            if (typeof particles[i]?.applyBehaviors === 'function') {
                particles[i].applyBehaviors(particles);
                particles[i].update();
                particles[i].display();
                if (particles[i].isDead()) { particles.splice(i, 1); }
            } else {
                console.warn("Invalid particle object found, removing.", particles[i]);
                particles.splice(i, 1);
            }
        }
        if (random(1) < 0.15 && particles.length < 150) { particles.push(new Particle(random(width), random(height))); }
        // Add particle on mouse press only if mouse is inside canvas
        if (mouseIsPressed === true && mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height && particles.length < 150) {
            if (random(1) < 0.5) { particles.push(new Particle(mouseX, mouseY)); }
        }
    } catch (e) {
        console.error("p5.js draw loop error:", e);
        noLoop(); // Stop the draw loop on error
    }
}

// Particle class (Enhanced - v3)
class Particle {
    constructor(x, y) {
        this.pos = createVector(x, y);
        this.vel = createVector(0, 0);
        this.acc = createVector(0, 0);
        this.maxSpeed = random(1, 1.8);
        this.maxForce = 0.1;
        this.lifespan = 255;
        this.decay = random(0.8, 1.5);
        this.size = random(1.5, 4);
        // Safely select color, ensure p5 color is valid
        this.color = random(currentParticleP5Colors.length > 0 ? currentParticleP5Colors : [color(100, 100, 100, 150)]);
        this.noiseOffsetX = random(1000);
        this.noiseOffsetY = random(1000);
        this.noiseOffsetZ = random(1000);
    }

    applyForce(force) { this.acc.add(force); }

    applyBehaviors(particleArray) {
        let noiseForce = this.getNoiseForce();
        let mouseForce = this.getMouseForce();
        noiseForce.mult(0.8);
        mouseForce.mult(1.2);
        this.applyForce(noiseForce);
        this.applyForce(mouseForce);
    }

    getNoiseForce() {
        let noiseScale = 0.005; let timeScale = 0.002;
        let angle = noise(this.pos.x * noiseScale, this.pos.y * noiseScale, frameCount * timeScale + this.noiseOffsetZ) * TWO_PI * 2;
        let noiseVector = p5.Vector.fromAngle(angle);
        noiseVector.setMag(this.maxForce);
        return noiseVector;
    }

    getMouseForce() {
        let perceptionRadius = 150; let steering = createVector(0, 0);
        if (mouseX === undefined || mouseY === undefined || mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) {
            return steering;
        }
        let mousePos = createVector(mouseX, mouseY);
        let dist = p5.Vector.dist(this.pos, mousePos);
        if (dist < perceptionRadius) {
            let desired = p5.Vector.sub(mousePos, this.pos);
            desired.setMag(this.maxSpeed);
            steering = p5.Vector.sub(desired, this.vel);
            steering.limit(this.maxForce * 1.5);
        }
        return steering;
    }

    update() {
        this.vel.add(this.acc); this.vel.limit(this.maxSpeed);
        this.pos.add(this.vel); this.acc.mult(0);
        this.lifespan -= this.decay;
    }

    display() {
        noStroke();
        // Ensure color object is valid before accessing properties
        if (this.color && typeof this.color.levels !== 'undefined') {
            let currentAlpha = map(this.lifespan, 0, 255, 0, alpha(this.color));
            fill(red(this.color), green(this.color), blue(this.color), max(0, currentAlpha));
            ellipse(this.pos.x, this.pos.y, this.size, this.size);
        } else {
            // Fallback or error logging if color is invalid
            // console.warn("Invalid color object in particle display");
            fill(100, 100); // Simple fallback gray
            ellipse(this.pos.x, this.pos.y, this.size, this.size);
        }
    }

    isDead() { return (this.lifespan < 0); }
}