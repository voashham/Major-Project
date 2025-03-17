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

// Fetch News
app.get("/news", (req, res) => {
    db.query("SELECT * FROM News", (err, results) => {
        if (err) return res.status(500).json({ error: "Database error", details: err });
        res.json(results);
    });
});

// Fetch Events
app.get("/events", (req, res) => {
    db.query("SELECT * FROM Events", (err, results) => {
        if (err) return res.status(500).json({ error: "Database error", details: err });
        res.json(results);
    });
});

// Add News & Events
app.post("/:type", (req, res) => {
    const { title, description } = req.body;
    const table = req.params.type === "news" ? "News" : req.params.type === "events" ? "Events" : null;

    if (!table) return res.status(400).json({ error: "Invalid type" });
    if (!title || !description) return res.status(400).json({ error: "Title and description are required" });

    db.query(`INSERT INTO ${table} (title, description) VALUES (?, ?)`, [title, description], (err) => {
        if (err) return res.status(500).json({ error: "Database error", details: err });
        res.json({ success: true, message: `${table} added successfully` });
    });
});

app.delete("/news/:id", (req, res) => {
    const id = req.params.id;
    db.query("DELETE FROM news WHERE id = ?", [id], (err, result) => {
        if (err) {
            res.status(500).json({ message: "Error deleting news", error: err });
        } else if (result.affectedRows === 0) {
            res.status(404).json({ message: "News not found" });
        } else {
            res.json({ message: `News with ID ${id} deleted successfully` });
        }
    });
});

app.delete("/events/:id", (req, res) => {
    const id = req.params.id;
    db.query("DELETE FROM events WHERE id = ?", [id], (err, result) => {
        if (err) {
            res.status(500).json({ message: "Error deleting event", error: err });
        } else if (result.affectedRows === 0) {
            res.status(404).json({ message: "Event not found" });
        } else {
            res.json({ message: `Event with ID ${id} deleted successfully` });
        }
    });
});

app.get("/carousel", (req, res) => {
    db.query("SELECT * FROM carousel", (err, results) => {
        if (err) {
            res.status(500).json({ message: "Error fetching carousel data", error: err });
        } else {
            res.json(results);
        }
    });
});

app.get("/getCommitteeImages", (req, res) => {
    db.query("SELECT * FROM committee_images", (err, results) => {
        if (err) res.status(500).json({ message: "Error fetching images", error: err });
        else res.json(results);
    });
});

// UPDATE committee image path
app.put("/updateCommitteeImage/:id", (req, res) => {
    const { imagePath } = req.body;
    const id = req.params.id;

    db.query("UPDATE committee_images SET imagePath = ? WHERE id = ?", [imagePath, id], (err, result) => {
        if (err) res.status(500).json({ message: "Error updating image", error: err });
        else res.json({ message: `Image updated successfully for ID ${id}` });
    });
});

// GET all committee members
app.get("/getCommittee", (req, res) => {
    db.query("SELECT * FROM committee_images", (err, results) => {
        if (err) res.status(500).json({ message: "Error fetching data", error: err });
        else res.json(results);
    });
});

// UPDATE committee member
app.put("/updateCommittee/:id", (req, res) => {
    const { name, role, imagePath } = req.body;
    const id = req.params.id;

    db.query("UPDATE committee_images SET name = ?, role = ?, imagePath = ? WHERE id = ?", 
        [name, role, imagePath, id], (err, result) => {
        if (err) res.status(500).json({ message: "Error updating member", error: err });
        else res.json({ message: `Updated successfully for ID ${id}` });
    });
});

// DELETE committee member
app.delete("/deleteCommittee/:id", (req, res) => {
    const id = req.params.id;

    db.query("DELETE FROM committee_images WHERE id = ?", [id], (err, result) => {
        if (err) res.status(500).json({ message: "Error deleting member", error: err });
        else res.json({ message: `Deleted successfully for ID ${id}` });
    });
});

// ADD new committee member
app.post("/addCommittee", (req, res) => {
    const { name, role, imagePath } = req.body;

    db.query("INSERT INTO committee_images (name, role, imagePath) VALUES (?, ?, ?)", 
        [name, role, imagePath], (err, result) => {
        if (err) res.status(500).json({ message: "Error adding member", error: err });
        else res.json({ message: "New office bearer added successfully" });
    });
});

// GET all Sub Committee members
app.get("/getSubCommittee", (req, res) => {
    db.query("SELECT * FROM sub_committee", (err, results) => {
        if (err) res.status(500).json({ message: "Error fetching data", error: err });
        else res.json(results);
    });
});

// UPDATE a Sub Committee member
app.put("/updateSubCommittee/:id", (req, res) => {
    const { name, role, imagePath } = req.body;
    const id = req.params.id;

    db.query("UPDATE sub_committee SET name = ?, role = ?, imagePath = ? WHERE id = ?", 
        [name, role, imagePath, id], (err, result) => {
        if (err) res.status(500).json({ message: "Error updating member", error: err });
        else res.json({ message: `Updated successfully for ID ${id}` });
    });
});

// DELETE a Sub Committee member
app.delete("/deleteSubCommittee/:id", (req, res) => {
    const id = req.params.id;

    db.query("DELETE FROM sub_committee WHERE id = ?", [id], (err, result) => {
        if (err) res.status(500).json({ message: "Error deleting member", error: err });
        else res.json({ message: `Deleted successfully for ID ${id}` });
    });
});

// ADD a new Sub Committee member
app.post("/addSubCommittee", (req, res) => {
    const { name, role, imagePath } = req.body;

    db.query("INSERT INTO sub_committee (name, role, imagePath) VALUES (?, ?, ?)", 
        [name, role, imagePath], (err, result) => {
        if (err) res.status(500).json({ message: "Error adding member", error: err });
        else res.json({ message: "New Sub Committee member added successfully" });
    });
});

// GET all Faculty Incharges and Messages
app.get("/getFacultyMessages", (req, res) => {
    db.query("SELECT * FROM faculty_messages", (err, results) => {
        if (err) res.status(500).json({ message: "Error fetching data", error: err });
        else res.json(results);
    });
});

// ✅ GET all Faculty Members & Messages
app.get("/getFacultyMessages", (req, res) => {
    db.query("SELECT * FROM faculty_messages", (err, results) => {
        if (err) res.status(500).json({ message: "Error fetching data", error: err });
        else res.json(results);
    });
});

// ✅ UPDATE Faculty Member
app.put("/updateFaculty/:id", (req, res) => {
    const { name, role, imagePath, message } = req.body;
    const id = req.params.id;

    db.query(
        "UPDATE faculty_messages SET name = ?, role = ?, imagePath = ?, message = ? WHERE id = ?",
        [name, role, imagePath, message, id],
        (err, result) => {
            if (err) res.status(500).json({ message: "Error updating faculty", error: err });
            else res.json({ message: `Faculty member ID ${id} updated successfully` });
        }
    );
});

// ✅ DELETE Faculty Member
app.delete("/deleteFaculty/:id", (req, res) => {
    const id = req.params.id;

    db.query("DELETE FROM faculty_messages WHERE id = ?", [id], (err, result) => {
        if (err) res.status(500).json({ message: "Error deleting faculty member", error: err });
        else res.json({ message: `Faculty member ID ${id} deleted successfully` });
    });
});

// ✅ ADD New Faculty Member
app.post("/addFaculty", (req, res) => {
    const { name, role, imagePath, message } = req.body;

    db.query(
        "INSERT INTO faculty_messages (name, role, imagePath, message) VALUES (?, ?, ?, ?)",
        [name, role, imagePath, message],
        (err, result) => {
            if (err) res.status(500).json({ message: "Error adding faculty", error: err });
            else res.json({ message: "New faculty member added successfully" });
        }
    );
});

// ✅ GET all Gallery Images
app.get("/getGallery", (req, res) => {
    db.query("SELECT * FROM gallery", (err, results) => {
        if (err) res.status(500).json({ message: "Error fetching gallery images", error: err });
        else res.json(results);
    });
});

// ✅ ADD a New Gallery Image
app.post("/addGallery", (req, res) => {
    const { imagePath, title } = req.body;

    db.query(
        "INSERT INTO gallery (imagePath, title) VALUES (?, ?)",
        [imagePath, title],
        (err, result) => {
            if (err) res.status(500).json({ message: "Error adding gallery image", error: err });
            else res.json({ message: "Gallery image added successfully" });
        }
    );
});

// ✅ UPDATE a Gallery Image
app.put("/updateGallery/:id", (req, res) => {
    const { imagePath, title } = req.body;
    const id = req.params.id;

    db.query(
        "UPDATE gallery SET imagePath = ?, title = ? WHERE id = ?",
        [imagePath, title, id],
        (err, result) => {
            if (err) res.status(500).json({ message: "Error updating gallery image", error: err });
            else res.json({ message: `Gallery image ID ${id} updated successfully` });
        }
    );
});

// ✅ DELETE a Gallery Image
app.delete("/deleteGallery/:id", (req, res) => {
    const id = req.params.id;

    db.query("DELETE FROM gallery WHERE id = ?", [id], (err, result) => {
        if (err) res.status(500).json({ message: "Error deleting gallery image", error: err });
        else res.json({ message: `Gallery image ID ${id} deleted successfully` });
    });
});

// ✅ GET all Previous Event Images
app.get("/getPreviousEvents", (req, res) => {
    db.query("SELECT * FROM previous_events", (err, results) => {
        if (err) res.status(500).json({ message: "Error fetching data", error: err });
        else res.json(results);
    });
});

// ✅ ADD a New Previous Event Image
app.post("/addPreviousEvent", (req, res) => {
    const { imagePath, title } = req.body;

    db.query(
        "INSERT INTO previous_events (imagePath, title) VALUES (?, ?)",
        [imagePath, title],
        (err, result) => {
            if (err) res.status(500).json({ message: "Error adding image", error: err });
            else res.json({ message: "Previous event image added successfully" });
        }
    );
});

// ✅ UPDATE a Previous Event Image
app.put("/updatePreviousEvent/:id", (req, res) => {
    const { imagePath, title } = req.body;
    const id = req.params.id;

    db.query(
        "UPDATE previous_events SET imagePath = ?, title = ? WHERE id = ?",
        [imagePath, title, id],
        (err, result) => {
            if (err) res.status(500).json({ message: "Error updating image", error: err });
            else res.json({ message: `Previous event image ID ${id} updated successfully` });
        }
    );
});

// ✅ DELETE a Previous Event Image
app.delete("/deletePreviousEvent/:id", (req, res) => {
    const id = req.params.id;

    db.query("DELETE FROM previous_events WHERE id = ?", [id], (err, result) => {
        if (err) res.status(500).json({ message: "Error deleting image", error: err });
        else res.json({ message: `Previous event image ID ${id} deleted successfully` });
    });
});

// Start Server
app.listen(3001, () => console.log("Server running on port 3001"));
