import express from 'express';
import session from 'express-session';
import path from "path";

const app = express();

app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.sendFile(path.resolve("pages/index.html"));
    
});

app.get('/login', (req, res) => {
    res.send("Login page works");
    res.sendFile(path.resolve("pages/login.html"));
});

app.listen(3000, () => {
    console.log('Server started on port 3000');
});