const express = require("express");
const db = require("./database/db");
const path = require("path");
const bodyParser = require("body-parser");
const session = require("express-session");
const multer = require("multer");

const app = express();

const PORT = 3000;

// ================= MIDDLEWARE =================

app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

app.use("/uploads", express.static("uploads"));

app.set("view engine", "ejs");

// ================= SESSION =================

app.use(session({
    secret: "lostfoundsecret",
    resave: false,
    saveUninitialized: true
}));
// Global User Middleware

app.use((req, res, next) => {

    res.locals.user = req.session.user || null;

    next();
});

// ================= MULTER =================

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },

    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }

});

const upload = multer({ storage: storage });

// ================= ROUTES =================

// HOME PAGE
app.get("/", (req, res) => {
    res.render("index");
});

// REGISTER PAGE
app.get("/register", (req, res) => {
    res.render("register");
});

// LOGIN PAGE
app.get("/login", (req, res) => {
    res.render("login");
});

// DASHBOARD
app.get("/dashboard", (req, res) => {

    if(req.session.user){

        res.render("dashboard", {
            user: req.session.user
        });

    }
    else{
        res.redirect("/login");
    }

});

// LOGOUT
app.get("/logout", (req, res) => {

    req.session.destroy();

    res.redirect("/login");
});

// ================= REGISTER =================

app.post("/register", (req, res) => {

    const { name, email, password } = req.body;

    const sql = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";

    db.query(sql, [name, email, password], (err, result) => {

        if(err){
            console.log(err);
            res.send("Registration Failed");
        }
        else{
            res.redirect("/login");
        }

    });

});

// ================= LOGIN =================

app.post("/login", (req, res) => {

    const { email, password } = req.body;

    const sql = "SELECT * FROM users WHERE email = ? AND password = ?";

    db.query(sql, [email, password], (err, result) => {

        if(err){
            console.log(err);
            res.send("Login Failed");
        }
        else{

            if(result.length > 0){

                req.session.user = result[0];

                res.redirect("/dashboard");
            }
            else{
                res.send("Invalid Email or Password");
            }

        }

    });

});

// ================= ADD ITEM PAGE =================

app.get("/add-item", (req, res) => {

    if(req.session.user){
        res.render("add-item");
    }
    else{
        res.redirect("/login");
    }

});

// ================= SAVE ITEM =================

app.post("/add-item", upload.single("image"), (req, res) => {

    const {
        item_name,
        category,
        description,
        location,
        status
    } = req.body;

    const image = req.file ? req.file.filename : null;

    const user_id = req.session.user.id;

    const sql = `
        INSERT INTO items
        (item_name, category, description, location, status, image, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [

        item_name,
        category,
        description,
        location,
        status,
        image,
        user_id

    ], (err, result) => {

        if(err){

            console.log(err);

            res.send(err);

        }
        else{

            // NOTIFICATION

            const notificationSql = `
                INSERT INTO notifications
                (user_id, message)
                VALUES (?, ?)
            `;

            db.query(notificationSql, [

                user_id,
                `You uploaded a ${status} item: ${item_name}`

            ]);

            res.redirect("/items");

        }

    });

});
// ================= SHOW ITEMS =================

app.get("/items", (req, res) => {

    const {
        search,
        category,
        location,
        status,
        sort
    } = req.query;

    let sql = `
        SELECT * FROM items
        WHERE 1=1
    `;

    let values = [];

    // SEARCH

    if(search){

        sql += `
            AND item_name LIKE ?
        `;

        values.push(`%${search}%`);

    }

    // CATEGORY FILTER

    if(category){

        sql += `
            AND category = ?
        `;

        values.push(category);

    }

    // LOCATION FILTER

    if(location){

        sql += `
            AND location LIKE ?
        `;

        values.push(`%${location}%`);

    }

    // STATUS FILTER

    if(status){

        sql += `
            AND status = ?
        `;

        values.push(status);

    }

    // SORTING

    if(sort === "oldest"){

        sql += `
            ORDER BY id ASC
        `;

    }
    else{

        sql += `
            ORDER BY id DESC
        `;

    }

    db.query(sql, values, (err, results) => {

        if(err){

            console.log(err);

        }
        else{

            res.render("items", {

                items: results,
                filters: req.query

            });

        }

    });

});

// ================= ITEM DETAILS PAGE =================

app.get("/item/:id", (req, res) => {

    const itemId = req.params.id;

    const sql = "SELECT * FROM items WHERE id = ?";

    db.query(sql, [itemId], (err, result) => {

        if(err){
            console.log(err);
            res.send("Error Loading Item");
        }
        else{

            if(result.length > 0){

                res.render("item-details", {
                    item: result[0]
                });

            }
            else{
                res.send("Item Not Found");
            }

        }

    });

});

// ================= LOST ITEMS =================

app.get("/lost-items", (req, res) => {

    const sql = `
        SELECT * FROM items
        WHERE status = 'Lost'
    `;

    db.query(sql, (err, results) => {

        if(err){
            console.log(err);
        }
        else{

            res.render("lost-items", {
                items: results
            });

        }

    });

});

// ================= FOUND ITEMS =================

app.get("/found-items", (req, res) => {

    const sql = `
        SELECT * FROM items
        WHERE status = 'Found'
    `;

    db.query(sql, (err, results) => {

        if(err){
            console.log(err);
        }
        else{

            res.render("found-items", {
                items: results
            });

        }

    });

});

// ================= ADMIN LOGIN PAGE =================

app.get("/admin/login", (req, res) => {

    res.render("admin-login");

});

// ================= ADMIN LOGIN =================

app.post("/admin/login", (req, res) => {

    const { email, password } = req.body;

    const sql = `
        SELECT * FROM admin
        WHERE email = ? AND password = ?
    `;

    db.query(sql, [email, password], (err, result) => {

        if(err){
            console.log(err);
            res.send("Admin Login Failed");
        }
        else{

            if(result.length > 0){

                req.session.admin = result[0];

                res.redirect("/admin/dashboard");
            }
            else{
                res.send("Invalid Admin Credentials");
            }

        }

    });

});

// ================= ADMIN DASHBOARD =================

app.get("/admin/dashboard", (req, res) => {

    if(!req.session.admin){
        return res.redirect("/admin/login");
    }

    const usersSql = "SELECT * FROM users";

    const itemsSql = "SELECT * FROM items";

    db.query(usersSql, (err, users) => {

        if(err){
            console.log(err);
        }
        else{

            db.query(itemsSql, (err, items) => {

                if(err){
                    console.log(err);
                }
                else{

                    res.render("admin-dashboard", {

                        users: users,
                        items: items

                    });

                }

            });

        }

    });

});

// ================= DELETE USER =================

app.get("/admin/delete-user/:id", (req, res) => {

    const userId = req.params.id;

    const sql = "DELETE FROM users WHERE id = ?";

    db.query(sql, [userId], (err, result) => {

        if(err){
            console.log(err);
        }

        res.redirect("/admin/dashboard");

    });

});

// ================= DELETE ITEM =================

app.get("/admin/delete-item/:id", (req, res) => {

    const itemId = req.params.id;

    const sql = "DELETE FROM items WHERE id = ?";

    db.query(sql, [itemId], (err, result) => {

        if(err){
            console.log(err);
        }

        res.redirect("/admin/dashboard");

    });

});
// ================= EDIT ITEM PAGE =================

app.get("/admin/edit-item/:id", (req, res) => {

    const itemId = req.params.id;

    const sql = "SELECT * FROM items WHERE id = ?";

    db.query(sql, [itemId], (err, result) => {

        if(err){
            console.log(err);
        }
        else{

            res.render("edit-item", {
                item: result[0]
            });

        }

    });

});

// ================= UPDATE ITEM =================

app.post("/admin/update-item/:id", (req, res) => {

    const itemId = req.params.id;

    const {
        item_name,
        category,
        location,
        status,
        description
    } = req.body;

    const sql = `
        UPDATE items
        SET item_name = ?,
        category = ?,
        location = ?,
        status = ?,
        description = ?
        WHERE id = ?
    `;

    db.query(sql, [

        item_name,
        category,
        location,
        status,
        description,
        itemId

    ], (err, result) => {

        if(err){
            console.log(err);
        }

        res.redirect("/admin/dashboard");

    });

});

// ================= PROFILE PAGE =================

app.get("/profile", (req, res) => {

    if(!req.session.user){

        return res.redirect("/login");

    }

    const userId = req.session.user.id;

    const userSql = `
        SELECT * FROM users
        WHERE id = ?
    `;

    const itemsSql = `
        SELECT * FROM items
        WHERE user_id = ?
    `;

    db.query(userSql, [userId], (err, userResult) => {

        if(err){
            console.log(err);
        }
        else{

            db.query(itemsSql, [userId], (err, itemsResult) => {

                if(err){
                    console.log(err);
                }
                else{

                    res.render("profile", {

                        user: userResult[0],
                        items: itemsResult

                    });

                }

            });

        }

    });

});

// ================= UPDATE PROFILE =================

app.post("/update-profile", upload.single("profile_photo"), (req, res) => {

    const userId = req.session.user.id;

    const {
        bio,
        department,
        student_year,
        contact_visibility
    } = req.body;

    let profilePhoto = null;

    if(req.file){

        profilePhoto = req.file.filename;

    }

    const sql = `
        UPDATE users
        SET
        profile_photo = COALESCE(?, profile_photo),
        bio = ?,
        department = ?,
        student_year = ?,
        contact_visibility = ?
        WHERE id = ?
    `;

    db.query(sql, [

        profilePhoto,
        bio,
        department,
        student_year,
        contact_visibility,
        userId

    ], (err, result) => {

        if(err){
            console.log(err);
        }

        res.redirect("/profile");

    });

});

// ================= CHAT PAGE =================

app.get("/chat/:receiverId/:itemId", (req, res) => {

    if(!req.session.user){

        return res.redirect("/login");

    }

    const senderId = req.session.user.id;

    const receiverId = req.params.receiverId;

    const itemId = req.params.itemId;

    const sql = `
        SELECT * FROM messages
        WHERE
        (
            sender_id = ?
            AND receiver_id = ?
        )
        OR
        (
            sender_id = ?
            AND receiver_id = ?
        )
        AND item_id = ?
        ORDER BY created_at ASC
    `;

    db.query(sql, [

        senderId,
        receiverId,

        receiverId,
        senderId,

        itemId

    ], (err, messages) => {

        if(err){
            console.log(err);
        }
        else{

            res.render("chat", {

                messages,
                receiverId,
                itemId,
                currentUser: senderId

            });

        }

    });

});

// ================= SEND MESSAGE =================

app.post("/send-message", (req, res) => {

    const senderId = req.session.user.id;

    const {
        receiver_id,
        item_id,
        message
    } = req.body;

    const sql = `
        INSERT INTO messages
        (
            sender_id,
            receiver_id,
            item_id,
            message
        )
        VALUES (?, ?, ?, ?)
    `;

    db.query(sql, [

        senderId,
        receiver_id,
        item_id,
        message

    ], (err, result) => {

        if(err){
            console.log(err);
        }

        // NOTIFICATION CODE START

        const notificationSql = `
            INSERT INTO notifications
            (user_id, message)
            VALUES (?, ?)
        `;

        db.query(notificationSql, [

            receiver_id,
            `You received a new message about an item.`

        ]);

        // NOTIFICATION CODE END

        res.redirect(
            `/chat/${receiver_id}/${item_id}`
        );

    });

});

// ================= NOTIFICATIONS =================

app.get("/notifications", (req, res) => {

    if(!req.session.user){

        return res.redirect("/login");

    }

    const userId = req.session.user.id;

    const sql = `
        SELECT * FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC
    `;

    db.query(sql, [userId], (err, results) => {

        if(err){
            console.log(err);
        }
        else{

            res.render("notifications", {

                notifications: results

            });

        }

    });

});

// ================= SERVER =================

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});