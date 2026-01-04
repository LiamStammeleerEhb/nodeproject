import express from 'express';
import session from 'express-session';
import path from "path";
import db from "./db.js";
import fs from "fs";

const app = express();

app.use(session({
    secret: "test-secret",
    resave: false,
    saveUninitialized: true
}));

app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    const category = req.query.category || "";
    const page = parseInt(req.query.page) || 1;
    const ARTICLES_PER_PAGE = 5;
    const offset = (page - 1) * ARTICLES_PER_PAGE;

    // 1️⃣ Load categories
    const categorySql = `SELECT categoryname FROM tblcategories ORDER BY categoryname`;

    db.query(categorySql, (catErr, categories) => {
        if (catErr) {
            console.error(catErr);
            return res.send("Database error");
        }

        let whereClause = "";
        let params = [];

        if (category) {
            whereClause = "WHERE c.categoryname = ?";
            params.push(category);
        }

        // 2️⃣ Load articles
        const articleSql = `
            SELECT 
                a.articleID,
                a.articlename,
                a.articlecontent,
                a.publishedon,
                u.username,
                c.categoryname
            FROM tblarticles a
            JOIN tblusers u ON a.userid = u.userid
            JOIN tblcategories c ON a.categoryID = c.categoryID
            ${whereClause}
            ORDER BY a.publishedon DESC
            LIMIT ${ARTICLES_PER_PAGE} OFFSET ${offset}
        `;

        db.query(articleSql, params, (artErr, results) => {
            if (artErr) {
                console.error(artErr);
                return res.send("Database error");
            }

            let html = fs.readFileSync("pages/index.html", "utf-8");

            // 🔽 Build category <select>
            let categoryOptions = `<option value="">All categories</option>`;

            categories.forEach(cat => {
                const selected =
                    cat.categoryname === category ? "selected" : "";

                categoryOptions += `
                    <option value="${cat.categoryname}" ${selected}>
                        ${cat.categoryname}
                    </option>
                `;
            });

            html = html.replace(
                '<select name="category" id="category">',
                `<select name="category" id="category">${categoryOptions}`
            );

            // 📰 Build articles
            let articlesHTML = "";

            results.forEach(article => {
                const preview = article.articlecontent.substring(0, 100);

                articlesHTML += `
                    <article style="margin-bottom: 30px;">
                        <h2>${article.articlename}</h2>
                        <p>
                            ${preview}${article.articlecontent.length > 100 ? "..." : ""}
                            <a href="/article/${article.articleID}">Read more</a>
                        </p>
                        <small>
                            By <strong>${article.username}</strong>
                            in <em>${article.categoryname}</em>
                            on ${new Date(article.publishedon).toLocaleDateString()}
                        </small>
                    </article>
                    <hr />
                `;
            });

            // 📄 Pagination
            let paginationHTML = `<div id="pagination">`;

            if (page > 1) {
                paginationHTML += `
                    <a href="/?${category ? `category=${category}&` : ""}page=${page - 1}">
                        ← Previous
                    </a>
                `;
            }

            if (results.length === ARTICLES_PER_PAGE) {
                paginationHTML += `
                    <a href="/?${category ? `category=${category}&` : ""}page=${page + 1}">
                        Next →
                    </a>
                `;
            }

            paginationHTML += `</div>`;

            html = html.replace(
                '<div id="articles">',
                `<div id="articles">${articlesHTML}${paginationHTML}`
            );

            res.send(html);
        });
    });
});


app.get("/article/:id", (req, res) => {
    const articleId = req.params.id;

    const sql = `
        SELECT 
            a.articlename,
            a.articlecontent,
            a.publishedon,
            u.username,
            c.categoryname
        FROM tblarticles a
        JOIN tblusers u ON a.userid = u.userid
        JOIN tblcategories c ON a.categoryID = c.categoryID
        WHERE a.articleID = ?
        LIMIT 1
    `;

    db.query(sql, [articleId], (err, results) => {
        if (err) {
            console.error(err);
            return res.send("Database error");
        }

        if (results.length === 0) {
            return res.send("Article not found");
        }

        const article = results[0];

        res.send(`
            <small>
                By <strong>${article.username}</strong>
                in <em>${article.categoryname}</em>
                on ${new Date(article.publishedon).toLocaleDateString()}
            </small>
            <h1>${article.articlename}</h1>
            <p>${article.articlecontent}</p>
            <br>
            <a href="/">← Back to articles</a>
        `);
    });
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