const pool = require("./db");

async function viewData() {
    try {
        console.log("Fetching data from database...");

        // Users
        console.log("\n--- Users Table ---");
        const users = await pool.query("SELECT id, username, password_hash FROM users");
        console.log(`Found ${users.rows.length} users.`);
        if (users.rows.length > 0) {
            console.log(JSON.stringify(users.rows, null, 2));
        }

        // Watchlist
        console.log("\n--- Watchlist Table ---");
        try {
            const watchlist = await pool.query("SELECT * FROM watchlist");
            console.log(`Found ${watchlist.rows.length} items in watchlist.`);
            if (watchlist.rows.length > 0) {
                console.log(JSON.stringify(watchlist.rows, null, 2));
            }
        } catch (err) {
            if (err.code === '42P01') { // undefined_table
                console.log("Watchlist table does not exist yet.");
            } else {
                console.error("Error fetching watchlist:", err.message);
            }
        }

    } catch (err) {
        console.error("Database Error:", err);
    } finally {
        await pool.end();
    }
}

viewData();
