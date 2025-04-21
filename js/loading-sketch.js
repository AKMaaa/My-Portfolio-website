// js/loading-sketch.js (Instance Mode with Matter.js - Random Initial Placement)

let loadingP5Instance = null;
window.notifyLoadingComplete = () => { /* ... as before ... */ };
window.cleanupLoadingSketch = () => { /* ... as before ... */ };

const loadingSketch = (p) => {
    // --- Sketch Settings ---
    const emojis = ['🦄', '👻', '😎', '💖', '💥', '🌟', '💡', '💎'];
    // ★ Use pixel sizes from reference code
    const sizes = [50, 100, 150]; // Pixel sizes (Small, Medium, Large)
    const numEmojisToPlace = 12; // ★ Target number of emojis
    const placementAttemptsPerBody = 200; // Increased attempts for random placement
    const minGap = 15; // ★ Minimum gap between emojis in pixels

    // Shadow Settings
    const shadowOffsetX = 3;
    const shadowOffsetY = 3;
    const shadowBlur = 0;
    const shadowColorCSS = 'rgba(80, 80, 80, 0.7)';

    // Physics Settings
    const initialWaitDuration = 200; // ms (0.2 seconds)
    const gravityForce = 2;
    const restitution = 0.3;
    const friction = 0.7;
    const settledSpeedThreshold = 0.15;
    const shakeIntensity = 0.008;

    // State Variables
    let placedBodies = [];
    let canvas;
    let container;
    let engine, world, runner;
    let floor, leftWall, rightWall, ceiling;
    let initialWaitOver = false;
    let allSettled = false;
    let showCompletionText = false;
    let completionTextElement;

    loadingP5Instance = p;
    let Engine, Render, Runner, Bodies, Composite, Body, Vector;

    p.preload = () => { /* ... Matter.js check ... */
        if (typeof Matter !== 'undefined') {
            Engine = Matter.Engine; Render = Matter.Render; Runner = Matter.Runner;
            Bodies = Matter.Bodies; Composite = Matter.Composite; Body = Matter.Body; Vector = Matter.Vector;
        } else { console.error("Matter.js library not found!"); }
    };

    p.setup = () => {
        if (!Engine) return;
        container = p.select('#p5-loading-canvas-container');
        if (container) { /* ... create canvas ... */
             canvas = p.createCanvas(container.width, container.height);
             canvas.parent('p5-loading-canvas-container');
        } else { /* fallback */ canvas = p.createCanvas(p.windowWidth, p.windowHeight); }
        p.textAlign(p.CENTER, p.CENTER);
        p.textFont('sans-serif');
        completionTextElement = p.select('#loading-completion-text');

        engine = Engine.create();
        world = engine.world;
        engine.gravity.y = 0; // Start with no gravity

        createBoundaries();
        // ★ Create random emoji bodies, initially static
        createRandomEmojiBodies(true);

        runner = Runner.create();
        Runner.run(runner, engine);

        setTimeout(() => {
            initialWaitOver = true;
            applyShakeAndDrop();
        }, initialWaitDuration);
    };

    function createBoundaries() { /* ... as before ... */
        const wallThickness = 100;
        const boundaryOptions = { isStatic: true, friction: 0.9, restitution: 0.2 };
        floor = Bodies.rectangle(p.width / 2, p.height + wallThickness / 2, p.width * 1.5, wallThickness, { ...boundaryOptions, label: 'floor' });
        leftWall = Bodies.rectangle(-wallThickness / 2, p.height / 2, wallThickness, p.height * 1.5, { ...boundaryOptions, label: 'wall-left'});
        rightWall = Bodies.rectangle(p.width + wallThickness / 2, p.height / 2, wallThickness, p.height * 1.5, { ...boundaryOptions, label: 'wall-right' });
        ceiling = Bodies.rectangle(p.width / 2, -wallThickness / 2, p.width * 1.5, wallThickness, { ...boundaryOptions, label: 'ceiling'});
        Composite.add(world, [floor, leftWall, rightWall, ceiling]);
    }

    // ★ New function based on reference code for random placement
    function createRandomEmojiBodies(makeStatic = false) {
        placedBodies = [];
        let successfulPlacements = 0;
        let totalAttempts = 0;
        const maxTotalAttempts = numEmojisToPlace * placementAttemptsPerBody; // Overall limit

        while (successfulPlacements < numEmojisToPlace && totalAttempts < maxTotalAttempts) {
            totalAttempts++;
            let currentSize = p.random(sizes); // Choose random pixel size
            let radius = currentSize * 0.55; // Collision radius (adjust factor if needed)

            // Try placing this body
            let placementFound = false;
            for (let attempt = 0; attempt < placementAttemptsPerBody; attempt++) {
                // Try placing anywhere on screen, respecting boundaries slightly
                let tryX = p.random(radius + 10, p.width - radius - 10); // Add margin from walls
                let tryY = p.random(radius + 10, p.height - radius - 10); // Add margin from floor/ceiling (initial)

                // Check overlap with already placed bodies
                if (!doesOverlap(tryX, tryY, radius)) {
                    let emoji = p.random(emojis);
                    let options = {
                        friction: friction,
                        restitution: restitution,
                        isStatic: makeStatic,
                        angle: p.random(p.TWO_PI),
                    };
                    let body = Bodies.circle(tryX, tryY, radius, options); // Use calculated radius

                    body.emoji = emoji;
                    body.renderSize = currentSize; // Store the chosen pixel size for rendering
                    body.radius = radius;          // Store collision radius

                    placedBodies.push(body);
                    successfulPlacements++;
                    placementFound = true;
                    break; // Exit inner attempt loop
                }
            }
            // Optional: Log if placement fails after many attempts for one emoji
            // if (!placementFound) { console.log("Could not place an emoji after many attempts"); }
        } // End while loop

        if(placedBodies.length > 0){
             Composite.add(world, placedBodies);
        }
        console.log(`[Random Placement] Target: ${numEmojisToPlace}, Placed: ${placedBodies.length}, Total Attempts: ${totalAttempts}`);
        if (successfulPlacements < numEmojisToPlace) {
            console.warn(`Could only place ${successfulPlacements} out of ${numEmojisToPlace} emojis.`);
        }
    }

    // ★ Function to check overlap (from reference code, adapted for Matter bodies)
    function doesOverlap(x, y, radius) {
        for (let existingBody of placedBodies) {
            // Use the stored collision radius
            let distance = p.dist(x, y, existingBody.position.x, existingBody.position.y);
            if (distance < radius + existingBody.radius + minGap) { // Add minGap check
                return true; // Overlaps or too close
            }
        }
        return false; // No overlap
    }


    function applyShakeAndDrop() { /* ... as before ... */
        if (!initialWaitOver) return;
        console.log("Applying shake...");
        placedBodies.forEach(body => {
            if (!body.isStatic) return;
            const forceMagnitude = shakeIntensity * body.mass;
            const angle = p.random(p.TWO_PI);
            const force = { x: p.cos(angle) * forceMagnitude, y: p.sin(angle) * forceMagnitude };
            const offset = { x: p.random(-body.radius*0.1, body.radius*0.1), y: p.random(-body.radius*0.1, body.radius*0.1)};
            Body.applyForce(body, Vector.add(body.position, offset), force);
            Body.setAngularVelocity(body, p.random(-0.15, 0.15));
        });

        setTimeout(() => {
            console.log("Enabling gravity and waking bodies.");
            engine.gravity.y = gravityForce;
            placedBodies.forEach(body => {
                 if(body.isStatic){
                     Body.setStatic(body, false);
                 }
            });
        }, 60);
    }

    p.draw = () => { /* ... as before ... */
        if (!engine || !placedBodies) return;
        p.clear();
        applyShadowSettings();
        for (let i = 0; i < placedBodies.length; i++) {
             let body = placedBodies[i];
             if (!body) continue;
             let pos = body.position;
             let angle = body.angle;
             p.push();
             p.translate(pos.x, pos.y);
             p.rotate(angle);
             p.textSize(body.renderSize); // Use renderSize (pixel size)
             p.text(body.emoji, 0, 0);
             p.pop();
        }
        resetShadow();

        // Check if settled
        if (!allSettled && initialWaitOver && placedBodies.length > 0) {
            allSettled = placedBodies.every(body =>
                body.isStatic ||
                (!body.isStatic && body.speed < settledSpeedThreshold && p.abs(body.angularSpeed) < settledSpeedThreshold)
            );
            if (allSettled) {
                console.log("All emojis settled.");
                if (showCompletionText && completionTextElement) {
                    completionTextElement.addClass('visible');
                }
            }
        }
    };

    p.markAsComplete = () => { /* ... as before ... */
        console.log("Loading marked as complete by external signal.");
        showCompletionText = true;
        if (allSettled && completionTextElement) {
            completionTextElement.addClass('visible');
        }
    };

    p.windowResized = () => { /* ... needs significant changes ... */
        if (!container || !engine) return;
        let currentContainerWidth = container.width;
        let currentContainerHeight = container.height;

        if (currentContainerWidth > 0 && currentContainerHeight > 0) {
            p.resizeCanvas(currentContainerWidth, currentContainerHeight);

            console.log("Resizing - Reinitializing physics world.");
            Runner.stop(runner);
            Composite.clear(world, false);
            engine.gravity.y = 0;
            placedBodies = [];

            createBoundaries();
            // ★ Recreate using random placement
            createRandomEmojiBodies(true);

            initialWaitOver = false;
            allSettled = false;
            showCompletionText = false;
            if(completionTextElement) completionTextElement.removeClass('visible');

            Runner.start(runner, engine);

            setTimeout(() => {
                initialWaitOver = true;
                applyShakeAndDrop();
            }, initialWaitDuration);

        } else { /* ... warn ... */ }
    };

    // --- Helper Functions ---
    function applyShadowSettings() { /* ... as before ... */
        p.drawingContext.shadowOffsetX = shadowOffsetX;
        p.drawingContext.shadowOffsetY = shadowOffsetY;
        p.drawingContext.shadowBlur = shadowBlur;
        p.drawingContext.shadowColor = shadowColorCSS;
    }
    function resetShadow() { /* ... as before ... */
        p.drawingContext.shadowOffsetX = 0;
        p.drawingContext.shadowOffsetY = 0;
        p.drawingContext.shadowBlur = 0;
        p.drawingContext.shadowColor = 'rgba(0, 0, 0, 0)';
    }

}; // End of loadingSketch

new p5(loadingSketch);