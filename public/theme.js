// theme.js
// Handles Dark/Light mode toggling

const THEME_KEY = "movieapp_theme";

function getSavedTheme() {
    return localStorage.getItem(THEME_KEY) || "dark";
}

function applyTheme(theme) {
    if (theme === "light") {
        document.documentElement.classList.add("light-mode");
    } else {
        document.documentElement.classList.remove("light-mode");
    }
}

function toggleTheme() {
    const current = getSavedTheme();
    const next = current === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
    return next;
}

// Apply immediately on load
applyTheme(getSavedTheme());
