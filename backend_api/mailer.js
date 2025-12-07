require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    }
});

// Cek koneksi
transporter.verify((err, success) => {
    if (err) console.log("Mailer ERROR ❌", err);
    else console.log("Mailer siap ✅");
});

module.exports = transporter;