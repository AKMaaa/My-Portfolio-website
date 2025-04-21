// js/loading-sketch.js (Instance Mode with Matter.js)

// Make p5 instance globally available for loading control script
let loadingP5Instance = null;

// Allow external script to notify completion
window.notifyLoadingComplete = () => {
    if (loadingP5Instance && loadingP5Instance.markAsComplete) {
        loadingP5Instance.markAsComplete();
    }
};

// Allow external script to clean up the instance
window.cleanupLoadingSketch = () => {
    if (loadingP5Instance && typeof loadingP5Instance.remove === 'function') {
        loadingP5Instance.remove(); // p5 instance remove method
        loadingP5Instance = null;
        console.log("Loading sketch instance removed.");
    }
};

const loadingSketch = (p) => {
    // --- Sketch Settings ---
    const emojis = ['🥳', '🤩', '✨', '⭐', '💯', '🎉', '🍕', '🚀', '🌈', '🦄', '👻', '😎', '💖', '💫', '💥', '🌟', '💡', '💎', '⚡'];
    const sizes = [0.02, 0.04, 0.045]; // Relative sizes to canvas width
    const numEmojisToPlace = 50; // Adjusted number for performance
    const placementAttemptsPerEmoji = 100;
    const minRelGap = 0.01; // Relative gap

    // Shadow Settings
    const shadowOffsetX = 3;
    const shadowOffsetY = 3;
    const shadowBlur = 0;
    const shadowColorCSS = 'rgba(80, 80, 80, 0.7)';

    // Physics Settings
    const initialWaitDuration = 100; // ms (0.3 seconds)
    const gravity =4;
    const restitution = 0.5; // Bounciness
    const friction = 0.8;
    const settledSpeedThreshold = 0.1; // Speed below which a body is considered settled

    // State Variables
    let placedBodies = [];
    let canvas;
    let container;
    let engine, world, runner;
    let floor, leftWall, rightWall;
    let initialWaitOver = false;
    let allSettled = false;
    let showCompletionText = false;
    let completionTextElement;

    // Assign instance to global variable
    loadingP5Instance = p;

    // --- Matter.js Aliases ---
    let Engine, Render, Runner, Bodies, Composite, Body, Vector;

    p.preload = () => {
        // Make sure Matter is loaded (it should be if script order is correct)
        if (typeof Matter !== 'undefined') {
            Engine = Matter.Engine;
            Render = Matter.Render; // Optional for debugging
            Runner = Matter.Runner;
            Bodies = Matter.Bodies;
            Composite = Matter.Composite;
            Body = Matter.Body;
            Vector = Matter.Vector;
        } else {
            console.error("Matter.js library not found!");
        }
    };

    p.setup = () => {
        if (!Engine) return; // Don't setup if Matter not loaded

        container = p.select('#p5-loading-canvas-container');
        if (container) {
            canvas = p.createCanvas(container.width, container.height);
            canvas.parent('p5-loading-canvas-container');
        } else {
            console.error('Container #p5-loading-canvas-container not found!');
            canvas = p.createCanvas(p.windowWidth, p.windowHeight);
        }
        p.textAlign(p.CENTER, p.CENTER);
        p.textFont('sans-serif'); // Default, consider specific emoji font if needed

        completionTextElement = p.select('#loading-completion-text'); // Get the text element

        // --- Matter.js Setup ---
        engine = Engine.create();
        world = engine.world;
        engine.gravity.y = gravity;
        // Disable sleeping for continuous collision detection if needed, but might impact performance
        // engine.enableSleeping = false;

        // Create boundaries (floor and walls)
        createBoundaries();

        // Create emoji bodies initially static
        createEmojiBodies(true);

        // Create and run the runner (physics loop)
        runner = Runner.create();
        Runner.run(runner, engine);

        // Start initial wait timer
        setTimeout(() => {
            initialWaitOver = true;
            wakeUpBodies();
        }, initialWaitDuration);

        // Optional: Debug Renderer
        // setupDebugRenderer();
    };

    function createBoundaries() {
        const wallThickness = 60;
        floor = Bodies.rectangle(p.width / 2, p.height + wallThickness / 2, p.width * 1.5, wallThickness, { isStatic: true, friction: 0.9 });
        leftWall = Bodies.rectangle(-wallThickness / 2, p.height / 2, wallThickness, p.height * 1.5, { isStatic: true });
        rightWall = Bodies.rectangle(p.width + wallThickness / 2, p.height / 2, wallThickness, p.height * 1.5, { isStatic: true });
        Composite.add(world, [floor, leftWall, rightWall]);
    }

    function createEmojiBodies(makeStatic = false) {
        placedBodies = []; // Clear existing bodies if recreating
        let attempts = 0;
        const maxSpawnAttempts = 500;
        let successfulPlacements = 0;

        while (successfulPlacements < numEmojisToPlace && attempts < maxSpawnAttempts) {
            attempts++;
            let relSize = p.random(sizes);
            let radius = p.width * relSize * 0.5; // Radius relative to width
            let x = p.random(radius, p.width - radius);
            // Position slightly above the visible area to drop in
            let y = p.random(-p.height * 0.2, -radius);

            // Basic overlap check before creating Matter body (more efficient)
            let overlapping = false;
            for (let existingBody of placedBodies) {
                let d = p.dist(x, y, existingBody.position.x, existingBody.position.y);
                // Use stored radius (body.radius) which is absolute pixel value
                if (d < radius + existingBody.radius + (p.width * minRelGap)) {
                    overlapping = true;
                    break;
                }
            }

            if (!overlapping) {
                successfulPlacements++;
                let emoji = p.random(emojis);
                let options = {
                    friction: friction,
                    restitution: restitution,
                    isStatic: makeStatic,
                    angle: p.random(p.TWO_PI),
                    // Slighly increase density for smaller objects? Optional.
                    // density: 0.001 / (relSize * relSize)
                };
                let body = Bodies.circle(x, y, radius, options);

                // Store custom properties
                body.emoji = emoji;
                body.renderSize = p.width * relSize; // Visual size based on relative size
                body.radius = radius; // Store the calculated radius

                placedBodies.push(body);
            }
        }
        if (placedBodies.length > 0) {
            Composite.add(world, placedBodies); // Add all created bodies to the world
        }
        console.log(`Attempted ${attempts}, Placed ${placedBodies.length} emoji bodies.`);
    }

    function wakeUpBodies() {
        placedBodies.forEach(body => {
            if (body.isStatic) { // Only wake up if it was initially static
                Body.setStatic(body, false);
                // Add a slight initial impulse to start falling nicely
                Body.applyForce(body, body.position, {
                    x: p.random(-0.005, 0.005) * body.mass,
                    y: -p.random(0.005, 0.01) * body.mass // Slight upward push to separate
                });
                Body.setAngularVelocity(body, p.random(-0.05, 0.05));
            }
        });
    }

    p.draw = () => {
        if (!engine) return; // Don't draw if Matter not ready
        p.clear(); // Clear p5 canvas each frame

        // Apply shadow settings before drawing emojis
        applyShadowSettings();

        // Draw emojis based on Matter.js bodies
        for (let i = 0; i < placedBodies.length; i++) {
            let body = placedBodies[i];
            let pos = body.position;
            let angle = body.angle;

            p.push();
            p.translate(pos.x, pos.y);
            p.rotate(angle);
            p.textSize(body.renderSize); // Use stored renderSize
            p.text(body.emoji, 0, 0);
            p.pop();
        }

        // Reset shadow settings after drawing emojis
        resetShadow();

        // Check if all bodies have settled after the initial wait
        if (!allSettled && initialWaitOver && placedBodies.length > 0) {
            allSettled = placedBodies.every(body =>
                !body.isStatic && // Don't check static bodies (like walls/floor)
                body.speed < settledSpeedThreshold &&
                p.abs(body.angularSpeed) < settledSpeedThreshold
            );

            if (allSettled) {
                console.log("All emojis settled.");
                // If loading is also complete externally, show text immediately
                if (showCompletionText && completionTextElement) {
                    completionTextElement.addClass('visible');
                }
            }
        }
    };

    // Function called externally by loading.js
    p.markAsComplete = () => {
        console.log("Loading marked as complete by external signal.");
        showCompletionText = true;
        // If physics simulation has already settled, show completion text now
        if (allSettled && completionTextElement) {
            completionTextElement.addClass('visible');
        }
        // If not settled yet, the draw loop will show it once `allSettled` becomes true
    };

    p.windowResized = () => {
        if (!container || !engine) return; // Check if container and engine exist

        let currentContainerWidth = container.width;
        let currentContainerHeight = container.height;

        if (currentContainerWidth > 0 && currentContainerHeight > 0) {
            p.resizeCanvas(currentContainerWidth, currentContainerHeight);

            // --- Re-initialize Matter.js ---
            // Clear the world
            Composite.clear(world, false); // Keep static bodies? false removes everything

            // Recreate boundaries for new size
            createBoundaries();

            // Recreate emojis
            initialWaitOver = false;
            allSettled = false;
            showCompletionText = false; // Reset completion text flag
            if (completionTextElement) completionTextElement.removeClass('visible'); // Hide text
            createEmojiBodies(true); // Recreate as static

            // Restart wait timer
            setTimeout(() => {
                initialWaitOver = true;
                wakeUpBodies();
            }, initialWaitDuration);

            console.log("Resized and reinitialized physics.");
        } else {
            console.warn("Container has zero size during resize. Skipping resize.");
        }
    };

    // --- Helper Functions using p instance ---
    function applyShadowSettings() {
        p.drawingContext.shadowOffsetX = shadowOffsetX;
        p.drawingContext.shadowOffsetY = shadowOffsetY;
        p.drawingContext.shadowBlur = shadowBlur;
        p.drawingContext.shadowColor = shadowColorCSS;
    }

    function resetShadow() {
        p.drawingContext.shadowOffsetX = 0;
        p.drawingContext.shadowOffsetY = 0;
        p.drawingContext.shadowBlur = 0;
        p.drawingContext.shadowColor = 'rgba(0, 0, 0, 0)';
    }

    // function setupDebugRenderer() { // Optional
    //     let render = Render.create({
    //         element: container.elt, // Render inside the container
    //         engine: engine,
    //         options: {
    //             width: p.width,
    //             height: p.height,
    //             wireframes: true, // Show physics outlines
    //             background: 'transparent'
    //         }
    //     });
    //     Render.run(render);
    //     // Ensure p5 canvas is on top if needed, or adjust z-index
    //      p.p5Canvas.style('z-index', '1');
    // }
};

// Create the p5 instance for the loading sketch
new p5(loadingSketch);