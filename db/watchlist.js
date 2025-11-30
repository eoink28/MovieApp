// db/watchlist.js — Watchlist database helpers

const pool = require("../db");

// Add movie to the user's watchlist
async function addWatchItem(userId, movie) {
  const { imdbID, Title, Poster, Year } = movie;

  await pool.query(
    `INSERT INTO watchlist (user_id, movie_id, title, poster, year)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, movie_id) DO NOTHING`,
    [userId, imdbID, Title, Poster, Year]
  );
}

// Remove a movie from the user's watchlist
async function removeWatchItem(userId, imdbID) {
  await pool.query(
    `DELETE FROM watchlist
     WHERE user_id = $1 AND movie_id = $2`,
    [userId, imdbID]
  );
}

// Get all movies for a user
async function getWatchlist(userId) {
  const result = await pool.query(
    `SELECT movie_id AS "imdbID",
            title AS "Title",
            poster AS "Poster",
            year AS "Year"
     FROM watchlist
     WHERE user_id = $1
     ORDER BY title`,
    [userId]
  );

  return result.rows;
}

module.exports = {
  addWatchItem,
  removeWatchItem,
  getWatchlist
};
