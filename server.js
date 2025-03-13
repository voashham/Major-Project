const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// MySQL Connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database: "MicrocosmDB",
});

db.connect((err) => {
    if (err) {
        console.error("Database connection failed: " + err.stack);
        return;
    }
    console.log("Connected to MySQL Database.");
});

// Login API
app.post("/login", (req, res) => {
    const { admin, password } = req.body; // Ensure frontend sends "admin" and "password"

    console.log("Received Admin:", admin);
    console.log("Received Password:", password);

    const query = "SELECT * FROM users WHERE admin = ?"; 

    db.query(query, [admin], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.json({ success: false, message: "Database error" });
        }

        console.log("Query Result:", result);

        if (result.length > 0) {
            console.log("Stored Password:", result[0].Password);

            if (password === result[0].Password) {
                return res.json({ success: true, message: "Login successful!" });
            } else {
                return res.json({ success: false, message: "Invalid credentials" });
            }
        } else {
            return res.json({ success: false, message: "User not found" });
        }
    });
});

// Handle Form Submission (Register User)
app.post("/register", (req, res) => {
    const { regNo, name, contact } = req.body;

    if (!regNo || !name || !contact) {
        return res.status(400).json({ error: "All fields are required" });
    }

    // Check if user already exists
    const checkQuery = "SELECT * FROM Members WHERE regNo = ?";
    db.query(checkQuery, [regNo], (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });

        if (results.length > 0) {
            return res.status(400).json({ error: "User already registered" });
        }

        // Insert new user
        const sql = "INSERT INTO Members (regNo, name, contact) VALUES (?, ?, ?)";
        db.query(sql, [regNo, name, contact], (err, result) => {
            if (err) return res.status(500).json({ error: "Database error" });

            res.json({ success: true, message: "Registration successful!" });
        });
    });
});

// Fetch Registered Users
app.get("/users", (req, res) => {
    const sql = "SELECT id, regNo, name, contact FROM Members";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json(results);
    });
});

// Fetch Final Members
app.get("/finalMembers", (req, res) => {
    const sql = "SELECT regNo, name, contact FROM FinalMembers";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json(results);
    });
});

// Approve User: Move user to FinalMembers and delete from Members
app.post("/approveUser/:id", (req, res) => {
    const id = req.params.id;
    const selectQuery = "SELECT regNo, name, contact FROM Members WHERE id = ?";
    const insertQuery = "INSERT INTO FinalMembers (regNo, name, contact) VALUES (?, ?, ?)";
    const deleteQuery = "DELETE FROM Members WHERE id = ?";

    db.query(selectQuery, [id], (err, result) => {
        if (err || result.length === 0) return res.status(500).json({ error: "User not found" });

        const { regNo, name, contact } = result[0];

        db.query(insertQuery, [regNo, name, contact], (err) => {
            if (err) return res.status(500).json({ error: err });

            db.query(deleteQuery, [id], (err) => {
                if (err) return res.status(500).json({ error: err });
                res.json({ success: true, message: "User approved successfully" });
            });
        });
    });
});

// Edit User
app.put("/editUser/:id", (req, res) => {
    const { regNo, name, contact } = req.body;
    const sql = "UPDATE Members SET regNo=?, name=?, contact=? WHERE id=?";

    db.query(sql, [regNo, name, contact, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ success: true, message: "User updated successfully" });
    });
});

// Delete User
app.delete("/deleteUser/:id", (req, res) => {
    const sql = "DELETE FROM Members WHERE id=?";
    db.query(sql, [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ success: true, message: "User deleted successfully" });
    });
});

// Start Server
app.listen(3001, () => console.log("Server running on port 3001"));
