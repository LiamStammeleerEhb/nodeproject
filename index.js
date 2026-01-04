import express from 'express';
import session from 'express-session';
import path from "path";
import db from "./db.js";
import fs from "fs";

const app = express();

function requireAdmin(req, res, next) {
    if (!req.session.loggedIn) {
        return res.redirect("/login");
    }
    next();
}

function isNonEmptyString(value, minLength = 1) {
    return (
        typeof value === "string" &&
        value.trim().length >= minLength
    );
}

function isValidId(value) {
    return Number.isInteger(Number(value)) && Number(value) > 0;
}


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

    if (
        !isNonEmptyString(username) ||
        !isNonEmptyString(password)
    ) {
        return res.send("Username and password are required.");
    }

    const sql = `
        SELECT userid, username
        FROM tblusers
        WHERE username = ? AND userpassword = ?
        LIMIT 1
    `;

    db.query(sql, [username.trim(), password], (err, results) => {
        if (err) {
            console.error(err);
            return res.send("Database error");
        }

        if (results.length === 0) {
            return res.send("Invalid login");
        }

        req.session.loggedIn = true;
        req.session.userid = results[0].userid;
        req.session.username = results[0].username;

        res.redirect("/admin");
    });
});


app.get('/register', (req, res) => {
    res.send("Hmmmm... Would be weird if I let you register as an admin.");
});

app.get("/admin", requireAdmin, (req, res) => {
    const sql = `
        SELECT 
            a.articleID,
            a.articlename,
            a.publishedon,
            u.username
        FROM tblarticles a
        JOIN tblusers u ON a.userid = u.userid
        ORDER BY a.publishedon DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.send("Database error");
        }

        let html = `
            <h1>Admin panel</h1>
            <p>Logged in as ${req.session.username} <a href="logout">Logout</a></p>
            <a href="/admin/categories">Add category</a><br><a href="/admin/new">+ New article</a>
            <hr>
        `;

        results.forEach(a => {
            html += `
                <div>
                    <strong>${a.articlename}</strong><br>
                    <small>
                        by ${a.username} on
                        ${new Date(a.publishedon).toLocaleDateString()}
                    </small><br>
                    <a href="/admin/edit/${a.articleID}">Edit</a> |
                    <a href="/admin/delete/${a.articleID}"
                       onclick="return confirm('Delete this article?')">
                       Delete
                    </a>
                </div>
                <hr>
            `;
        });

        res.send(html);
    });
});


app.get("/admin/new", requireAdmin, (req, res) => {
    const sql = `SELECT categoryID, categoryname FROM tblcategories`;

    db.query(sql, (err, categories) => {
        if (err) return res.send("DB error");

        let options = "";
        categories.forEach(c => {
            options += `<option value="${c.categoryID}">${c.categoryname}</option>`;
        });

        res.send(`
            <h1>New article</h1>
            <form method="POST" action="/admin/new">
                <input name="title" placeholder="Title"><br><br>
                <textarea name="content" placeholder="Content"></textarea><br><br>
                <select name="categoryID">${options}</select><br><br>
                <button type="submit">Create</button>
            </form>
            <br>
            <a href="/admin">← Back</a>
        `);
    });
});

app.post("/admin/new", requireAdmin, (req, res) => {
    const { title, content, categoryID } = req.body;

    if (!isNonEmptyString(title, 3)) {
        return res.send("Title must be at least 3 characters.");
    }

    if (!isNonEmptyString(content, 10)) {
        return res.send("Content must be at least 10 characters.");
    }

    if (!isValidId(categoryID)) {
        return res.send("Invalid category.");
    }

    const sql = `
        INSERT INTO tblarticles
        (articlename, articlecontent, publishedon, categoryID, userid)
        VALUES (?, ?, NOW(), ?, ?)
    `;

    db.query(
        sql,
        [title.trim(), content.trim(), categoryID, req.session.userid],
        err => {
            if (err) {
                console.error(err);
                return res.send("DB error");
            }
            res.redirect("/admin");
        }
    );
});


app.get("/admin/edit/:id", requireAdmin, (req, res) => {
    const articleId = req.params.id;

    const sql = `
        SELECT articleID, articlename, articlecontent, categoryID
        FROM tblarticles
        WHERE articleID = ?
    `;

    db.query(sql, [articleId], (err, results) => {
        if (err || results.length === 0) {
            return res.send("Article not found");
        }

        const a = results[0];

        db.query(`SELECT categoryID, categoryname FROM tblcategories`, (e, cats) => {
            let options = "";
            cats.forEach(c => {
                const sel = c.categoryID === a.categoryID ? "selected" : "";
                options += `<option value="${c.categoryID}" ${sel}>${c.categoryname}</option>`;
            });

            res.send(`
                <h1>Edit article</h1>
                <form method="POST" action="/admin/edit/${a.articleID}">
                    <input name="title" value="${a.articlename}"><br><br>
                    <textarea name="content">${a.articlecontent}</textarea><br><br>
                    <select name="categoryID">${options}</select><br><br>
                    <button type="submit">Save</button>
                </form>
                <br>
                <a href="/admin">← Back</a>
            `);
        });
    });
});

app.post("/admin/edit/:id", requireAdmin, (req, res) => {
    const { title, content, categoryID } = req.body;
    const articleId = req.params.id;

    if (!isValidId(articleId)) {
        return res.send("Invalid article ID.");
    }

    if (!isNonEmptyString(title, 3)) {
        return res.send("Title must be at least 3 characters.");
    }

    if (!isNonEmptyString(content, 10)) {
        return res.send("Content must be at least 10 characters.");
    }

    if (!isValidId(categoryID)) {
        return res.send("Invalid category.");
    }

    const sql = `
        UPDATE tblarticles
        SET articlename = ?, articlecontent = ?, categoryID = ?
        WHERE articleID = ?
    `;

    db.query(
        sql,
        [title.trim(), content.trim(), categoryID, articleId],
        err => {
            if (err) {
                console.error(err);
                return res.send("DB error");
            }
            res.redirect("/admin");
        }
    );
});

app.get("/admin/delete/:id", requireAdmin, (req, res) => {
    if (!isValidId(req.params.id)) {
        return res.send("Invalid article ID.");
    }

    const sql = `DELETE FROM tblarticles WHERE articleID = ?`;

    db.query(sql, [req.params.id], err => {
        if (err) {
            console.error(err);
            return res.send("DB error");
        }
        res.redirect("/admin");
    });
});

app.get("/admin/categories", requireAdmin, (req, res) => {
    const sql = `SELECT categoryID, categoryname FROM tblcategories ORDER BY categoryname`;

    db.query(sql, (err, categories) => {
        if (err) {
            console.error(err);
            return res.send("Database error");
        }

        let html = `
            <h1>Categories</h1>
            <a href="/admin">← Back to admin</a><br><br>
            <a href="/admin/categories/new">+ New category</a>
            <hr>
        `;

        categories.forEach(c => {
            html += `
                <div>
                    <strong>${c.categoryname}</strong><br>
                    <a href="/admin/categories/edit/${c.categoryID}">Edit</a> |
                    <a href="/admin/categories/delete/${c.categoryID}"
                       onclick="return confirm('Delete this category?')">
                       Delete
                    </a>
                </div>
                <hr>
            `;
        });

        res.send(html);
    });
});

app.get("/admin/categories/new", requireAdmin, (req, res) => {
    res.send(`
        <h1>New category</h1>
        <form method="POST" action="/admin/categories/new">
            <input name="categoryname" placeholder="Category name">
            <button type="submit">Create</button>
        </form>
        <br>
        <a href="/admin/categories">← Back</a>
    `);
});

app.post("/admin/categories/new", requireAdmin, (req, res) => {
    const { categoryname } = req.body;

    if (!isNonEmptyString(categoryname, 2)) {
        return res.send("Category name must be at least 2 characters.");
    }

    const sql = `INSERT INTO tblcategories (categoryname) VALUES (?)`;

    db.query(sql, [categoryname.trim()], err => {
        if (err) {
            console.error(err);
            return res.send("Database error");
        }
        res.redirect("/admin/categories");
    });
});


app.get("/admin/categories/edit/:id", requireAdmin, (req, res) => {
    const sql = `
        SELECT categoryID, categoryname
        FROM tblcategories
        WHERE categoryID = ?
    `;

    db.query(sql, [req.params.id], (err, results) => {
        if (err || results.length === 0) {
            return res.send("Category not found");
        }

        const c = results[0];

        res.send(`
            <h1>Edit category</h1>
            <form method="POST" action="/admin/categories/edit/${c.categoryID}">
                <input name="categoryname" value="${c.categoryname}">
                <button type="submit">Save</button>
            </form>
            <br>
            <a href="/admin/categories">← Back</a>
        `);
    });
});

app.post("/admin/categories/edit/:id", requireAdmin, (req, res) => {
    const { categoryname } = req.body;

    if (!isValidId(req.params.id)) {
        return res.send("Invalid category ID.");
    }

    if (!isNonEmptyString(categoryname, 2)) {
        return res.send("Category name must be at least 2 characters.");
    }

    const sql = `
        UPDATE tblcategories
        SET categoryname = ?
        WHERE categoryID = ?
    `;

    db.query(sql, [categoryname.trim(), req.params.id], err => {
        if (err) {
            console.error(err);
            return res.send("Database error");
        }
        res.redirect("/admin/categories");
    });
});



app.get("/admin/categories/delete/:id", requireAdmin, (req, res) => {
    const sql = `DELETE FROM tblcategories WHERE categoryID = ?`;

    db.query(sql, [req.params.id], err => {
        if (err) {
            return res.send("Cannot delete category: it has articles.");
        }
        res.redirect("/admin/categories");
    });
});



app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});

app.listen(3000, () => {
    console.log('Server started on port 3000');
});