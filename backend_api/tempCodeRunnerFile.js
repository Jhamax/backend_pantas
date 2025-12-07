const mysql = require("mysql2");

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "", // default XAMPP kosong
    database: "pantas_db"
});

db.connect((err) => {
    if (err) {
        console.log("DB ERROR ❌", err);
    } else {
        console.log("DB Connected ✅");
    }
});

module.exports = db;