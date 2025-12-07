const mysql = require("mysql2");

// Jika ada DATABASE_URL (Railway), pakai itu
// Jika tidak ada, berarti sedang localhost/XAMPP
const db = mysql
    .createPool(
        process.env.DATABASE_URL ?
        {
            uri: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false },
        } :
        {
            host: "localhost",
            user: "root",
            password: "",
            database: "pantas_db",
        }
    )
    .promise();

module.exports = db;