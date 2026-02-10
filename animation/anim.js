// JC_Capital/animation/anim.js

document.addEventListener("DOMContentLoaded", function () {
    // 1. Create the overlay
    const overlay = document.createElement("div");
    overlay.id = "intro-overlay";

    const logoWrapper = document.createElement("div");
    logoWrapper.className = "intro-logo-wrapper";

    const logoImg = document.createElement("img");
    // Ensure this path matches where you put the square logo
    logoImg.src = "img/2nd_logo.png";
    logoImg.alt = "JC Capital Intro";

    logoWrapper.appendChild(logoImg);
    overlay.appendChild(logoWrapper);
    document.body.prepend(overlay);

    // 2. Timing Control

    // Step A: Allow the "Expand -> Shrink" animation to finish (approx 2.2s)
    // We start fading out the background just as the logo settles.
    setTimeout(() => {
        overlay.classList.add("intro-hidden");
    }, 2000); // 2.0 seconds

    // Step B: Remove from DOM
    setTimeout(() => {
        overlay.remove();
    }, 2600); // 2.6 seconds
});
