import express from 'express';
import session from 'express-session';
import path from "path";
import db from "./db.js";

const app = express();

app.use(session({
    secret: "test-secret",
    resave: false,
    saveUninitialized: true
}));

app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.sendFile(path.resolve("pages/index.html"));
});

app.get('/login', (req, res) => {
    if (req.session.loggedIn) {
        return res.redirect("/admin");
    }

    res.sendFile(path.resolve("pages/login.html"));
});

app.post("/login", (req, res) => {
    const { username, password } = req.body;

    const sql = `
        SELECT userid, username
        FROM tblusers
        WHERE username = ? AND userpassword = ?
        LIMIT 1
    `;

    db.query(sql, [username, password], (err, results) => {
        if (err) {
            console.error(err);
            return res.send("Database error");
        }

        if (results.length === 0) {
            return res.send("Invalid login");
        }

        // LOGIN SUCCESS
        req.session.loggedIn = true;
        req.session.userid = results[0].userid;
        req.session.username = results[0].username;

        res.redirect("/admin");
    });
});

app.get('/register', (req, res) => {
    res.send("Hmmmm... Would be weird if I let you register as an admin.");
});

app.get("/admin", (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect("/login");
    }

    res.sendFile(path.resolve("pages/admin.html"));
});

app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});

app.listen(3000, () => {
    console.log('Server started on port 3000');
});