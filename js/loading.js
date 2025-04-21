// js/loading.js

document.addEventListener('DOMContentLoaded', () => {
    const loadingScreen = document.getElementById('loading-screen');
    const completionTextElement = document.getElementById('loading-completion-text');
    const minDisplayTime = 5000;
    const completionFadeDelay = 600;

    let minimumTimeElapsed = false;
    let pageLoaded = false;
    let hideTriggered = false; // Prevent multiple calls

    // Minimum display time timer
    setTimeout(() => {
        minimumTimeElapsed = true;
        attemptHideLoadingScreen();
    }, minDisplayTime);

    // Page loaded event listener
    window.addEventListener('load', () => {
        pageLoaded = true;
        // Notify the p5 sketch that loading is complete
        if (window.notifyLoadingComplete) {
            window.notifyLoadingComplete();
        } else {
            console.warn("notifyLoadingComplete function not found in p5 sketch.");
        }
        attemptHideLoadingScreen();
    }, false);

    // Function to check conditions and initiate hiding sequence
    function attemptHideLoadingScreen() {
        console.log(`Attempting hide: minTime=${minimumTimeElapsed}, loaded=${pageLoaded}, triggered=${hideTriggered}`);
        // Only proceed if minimum time passed, page is loaded, and hide hasn't been triggered yet
        if (minimumTimeElapsed && pageLoaded && !hideTriggered) {
            hideTriggered = true; // Set flag immediately
            console.log("Conditions met. Showing completion text and starting fade timer.");

            // Ensure completion text is visible (handled by p5 sketch or force here)
            if (completionTextElement && !completionTextElement.classList.contains('visible')) {
                // If p5 hasn't shown it yet (e.g., physics still settling), force it?
                // Or rely solely on p5 sketch via notifyLoadingComplete?
                // For robustness, maybe show it here if p5 didn't.
                // completionTextElement.classList.add('visible');
                // Best approach: Let p5 control the text visibility based on its state + external signal.
            }

            // Wait after signaling completion before starting the screen fade
            setTimeout(fadeOutLoadingScreen, completionFadeDelay);
        }
    }

    // Function to fade out and remove the loading screen
    function fadeOutLoadingScreen() {
        if (loadingScreen) {
            console.log("Fading out loading screen.");
            loadingScreen.classList.add('hidden'); // Add class to trigger CSS opacity transition

            // Clean up after the transition finishes (match CSS duration)
            setTimeout(() => {
                // Remove the p5 instance for the loading sketch to free resources
                if (window.cleanupLoadingSketch) {
                    window.cleanupLoadingSketch();
                }
                // Remove the loading screen element from the DOM
                if (loadingScreen.parentNode) {
                    loadingScreen.parentNode.removeChild(loadingScreen);
                }
            }, 800); // Must match CSS transition duration
        }
    }

    // Fallback timer (increased duration for physics)
    const fallbackTimeout = 15000; // 15 seconds
    setTimeout(() => {
        if (loadingScreen && !loadingScreen.classList.contains('hidden') && !hideTriggered) {
            console.warn(`Loading fallback: Hiding screen forcefully after ${fallbackTimeout}ms.`);
            hideTriggered = true; // Prevent normal trigger
            // Force hide without waiting for completion text or animations
            loadingScreen.classList.add('hidden');
            setTimeout(() => {
                if (window.cleanupLoadingSketch) {
                    window.cleanupLoadingSketch();
                }
                if (loadingScreen.parentNode) {
                    loadingScreen.parentNode.removeChild(loadingScreen);
                }
            }, 800); // Match CSS transition duration
        }
    }, fallbackTimeout);
});