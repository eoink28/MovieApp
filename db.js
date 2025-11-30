// db.js — PostgreSQL connection setup

const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.POSTGRES_USER || "postgres",
  host: process.env.POSTGRES_HOST || "localhost",
  database: process.env.POSTGRES_DB || "movieapp",
  password: process.env.POSTGRES_PASSWORD || "password",
  port: process.env.POSTGRES_PORT || 5433,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

module.exports = pool;
