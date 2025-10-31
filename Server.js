// This file sets up a basic Node.js server using Express
// It serves our main page (index.html) and other static files from the "public" folder.


// Import the Express framework which makes building servers easier
//
const express = require("express");  

// Import Node's built-in 'path' module to work with file and folder paths
//
const path = require("path");  

// Create an instance of an Express application
//
const app = express();  


// Tell the server to make the "public" folder available to the browser
// This allows files like index.html, CSS, and images to load properly
//
app.use(express.static(path.join(__dirname, "public")));  

// When someone visits http://localhost:3000/, send them the index.html file from the public folder
//
app.get("/", (req, res) =>  
{  
    res.sendFile(path.join(__dirname, "public", "index.html"));  
});  

// Define the port number that our server will run on
//
const PORT = 3000;  

// Start the server and print a message to the console so we know it's running
//
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));  
