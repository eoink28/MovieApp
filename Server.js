//
// server.js — Complete backend for MovieApp
// ------------------------------------------
// Serves the main site and provides two API routes:
//   1. /api/search  — search for movies by title
//   2. /api/details — get details by IMDb ID
//

// Import required modules
// Import required modules
const express = require("express");
const path = require("path");
const axios = require("axios");
const session = require("express-session");
const bcrypt = require("bcrypt");
const pool = require("./db");
require("dotenv").config();

// Create an instance of an Express app
const app = express();

// Middleware
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecretkey",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }, // 1 day
  })
);

// Log startup
console.log("🎬 Initializing MovieApp server...");

// Serve all files from the 'public' folder
app.use(express.static(path.join(__dirname, "public")));

// Root route — send main page
app.get("/", (req, res) => {
  console.log("GET / - serving index.html");
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

//
// ============================
// Auth Middleware
// ============================
const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
};

//
// ============================
// API: Authentication
// ============================

// Register
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username",
      [username, hashedPassword]
    );
    const user = result.rows[0];
    req.session.userId = user.id;
    req.session.username = user.username;
    res.status(201).json({ message: "User registered", user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error("Register error:", err);
    if (err.code === "23505") {
      return res.status(409).json({ error: "Username already exists" });
    }
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  try {
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    res.json({ message: "Logged in", user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Logout
app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Could not log out" });
    }
    res.json({ message: "Logged out" });
  });
});

// Get Current User
app.get("/api/user", (req, res) => {
  if (req.session.userId) {
    res.json({ user: { id: req.session.userId, username: req.session.username } });
  } else {
    res.status(401).json({ error: "Not logged in" });
  }
});

//
// ============================
// API: Watchlist
// ============================

// Get Watchlist
app.get("/api/watchlist", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM watchlist WHERE user_id = $1 ORDER BY created_at DESC",
      [req.session.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get watchlist error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Add to Watchlist
app.post("/api/watchlist", requireAuth, async (req, res) => {
  const { imdbID, Title, Poster, Year } = req.body;
  if (!imdbID || !Title) {
    return res.status(400).json({ error: "Missing movie details" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO watchlist (user_id, imdb_id, title, poster, year)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, imdb_id) DO NOTHING
       RETURNING *`,
      [req.session.userId, imdbID, Title, Poster, Year]
    );

    if (result.rows.length === 0) {
      // Already exists
      return res.json({ message: "Already in watchlist" });
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Add watchlist error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Remove from Watchlist
app.delete("/api/watchlist/:imdbID", requireAuth, async (req, res) => {
  const { imdbID } = req.params;
  try {
    await pool.query("DELETE FROM watchlist WHERE user_id = $1 AND imdb_id = $2", [
      req.session.userId,
      imdbID,
    ]);
    res.json({ message: "Removed from watchlist" });
  } catch (err) {
    console.error("Remove watchlist error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ============================
// API: Watched
// ============================

// Get Watched
app.get("/api/watched", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM watched WHERE user_id = $1 ORDER BY created_at DESC",
      [req.session.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get watched error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Add to Watched (with optional comment). If exists, update comment.
app.post("/api/watched", requireAuth, async (req, res) => {
  const { imdbID, Title, Poster, Year, comment } = req.body;
  if (!imdbID || !Title) {
    return res.status(400).json({ error: "Missing movie details" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO watched (user_id, imdb_id, title, poster, year, comment)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, imdb_id) DO UPDATE SET comment = EXCLUDED.comment
       RETURNING *`,
      [req.session.userId, imdbID, Title, Poster, Year, comment]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Add watched error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Remove from Watched
app.delete("/api/watched/:imdbID", requireAuth, async (req, res) => {
  const { imdbID } = req.params;
  try {
    await pool.query("DELETE FROM watched WHERE user_id = $1 AND imdb_id = $2", [
      req.session.userId,
      imdbID,
    ]);
    res.json({ message: "Removed from watched" });
  } catch (err) {
    console.error("Remove watched error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

//
// ============================
// API: Movie search route
// ============================
app.get("/api/search", async (req, res) => {
  const query = req.query.q;
  console.log("➡️ Received /api/search with query:", query);

  if (!query) {
    console.warn("⚠️ Missing search query");
    return res.status(400).json({ error: "Missing search query" });
  }

  try {
    const response = await axios.get("https://www.omdbapi.com/", {
      params: {
        apikey: process.env.OMDB_API_KEY,
        s: query,
      },
      timeout: 5000,
    });

    console.log("OMDb search response:", response.data.Response);

    if (response.data.Response === "False") {
      console.warn("OMDb API returned error:", response.data.Error);
      return res.status(404).json({ error: response.data.Error });
    }

    res.json(response.data);
  } catch (error) {
    console.error("❌ Error fetching from OMDb:", error.message);
    res.status(500).json({ error: "Server error fetching search results" });
  }
});

//
// ============================
// API: Movie details route
// ============================
app.get("/api/details", async (req, res) => {
  const imdbID = req.query.id;
  console.log("➡️ Received /api/details with id:", imdbID);

  if (!imdbID) {
    console.warn("⚠️ Missing IMDb ID");
    return res.status(400).json({ error: "Missing IMDb ID" });
  }

  try {
    const response = await axios.get("https://www.omdbapi.com/", {
      params: {
        apikey: process.env.OMDB_API_KEY,
        i: imdbID,
        plot: "full",
      },
      timeout: 5000,
    });

    if (response.data.Response === "False") {
      console.warn("OMDb API returned error:", response.data.Error);
      return res.status(404).json({ error: response.data.Error });
    }

    res.json(response.data);
  } catch (error) {
    console.error("❌ Error fetching details from OMDb:", error.message);
    res.status(500).json({ error: "Server error fetching movie details" });
  }
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(
    `🔑 OMDb API Key status: ${process.env.OMDB_API_KEY ? "Loaded" : "Missing!"}`
  );
});
