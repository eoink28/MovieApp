//
// server.js — Complete backend for MovieApp
// ------------------------------------------
// Serves the main site and provides two API routes:
//   1. /api/search  — search for movies by title
//   2. /api/details — get details by IMDb ID
//

// Import required modules
const express = require("express");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

// Create an instance of an Express app
const app = express();

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
