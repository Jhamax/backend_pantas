const express = require("express");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const db = require("./db");
const transporter = require("./mailer.js");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());


// ===================
// ✅ API REGISTER
// ===================
app.post("/register", async(req, res) => {
    const { nama_panggilan, email, password } = req.body;

    if (!nama_panggilan || !email || !password) {
        return res.status(400).json({ message: "Semua field wajib diisi" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const query = "INSERT INTO users (nama_panggilan, email, password) VALUES (?, ?, ?)";
    db.execute(query, [nama_panggilan, email, hashedPassword], (err) => {
        if (err) {
            if (err.code === "ER_DUP_ENTRY") {
                return res.status(400).json({ message: "Email sudah terdaftar" });
            }
            return res.status(500).json({ message: "Server error" });
        }

        res.status(201).json({ message: "Pendaftaran berhasil" });
    });
});


// ===================
// ✅ API LOGIN
// ===================
app.post("/login", async(req, res) => {
    const { email, password } = req.body;

    try {
        const [users] = await db.promise().query(
            "SELECT * FROM users WHERE email = ?", [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: "Email atau password salah" });
        }

        const user = users[0];

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Email atau password salah" });
        }

        res.json({
            message: "Login berhasil",
            user: {
                id: user.id,
                nama_panggilan: user.nama_panggilan,
                email: user.email
            }
        });

    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});


// ===============================
// ✅ API KATA TIDAK PANTAS
// ===============================
app.get("/get-kata", (req, res) => {
    const query = "SELECT regex_pattern, base_word FROM kata_tidak_pantas";

    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: err });
        } else {
            const data = results.map(row => ({
                regex: row.regex_pattern,
                base: row.base_word
            }));
            res.json(data);
        }
    });
});


// ===============================
// ✅ REQUEST OTP
// ===============================
app.post("/request-otp", async(req, res) => {
    const { email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000);
    const expired = new Date(Date.now() + 5 * 60000); // 5 menit

    try {
        const [user] = await db.promise().query(
            "SELECT * FROM users WHERE email = ?", [email]
        );

        if (user.length === 0)
            return res.status(404).json({ message: "Email tidak terdaftar!" });

        await db.promise().query(
            "INSERT INTO reset_otp (email, otp, expired_at) VALUES (?, ?, ?)", [email, otp, expired]
        );

        await transporter.sendMail({
            to: email,
            subject: "Kode OTP Reset Password",
            html: `<h2>Kode OTP Kamu: ${otp}</h2><p>Berlaku 5 menit</p>`
        });

        res.json({ message: "OTP berhasil dikirim ke email!" });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Gagal kirim OTP" });
    }
});


// ===============================
// ✅ VERIFY OTP + RESET PASSWORD (DI-HASH)
// ===============================
app.post("/verify-otp", async(req, res) => {
    const { email, otp, newPassword } = req.body;

    try {
        const [data] = await db.promise().query(
            "SELECT * FROM reset_otp WHERE email=? AND otp=? AND expired_at > NOW()", [email, otp]
        );

        if (data.length === 0)
            return res.status(400).json({ message: "OTP salah atau kadaluarsa!" });

        // ✅ HASH PASSWORD BARU
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // ✅ SIMPAN YANG SUDAH DI-HASH
        await db.promise().query(
            "UPDATE users SET password=? WHERE email=?", [hashedPassword, email]
        );

        await db.promise().query(
            "DELETE FROM reset_otp WHERE email=?", [email]
        );

        res.json({ message: "Password berhasil direset!" });

    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// ===============================
// ✅ API KIRIM PESAN KONTAK KAMI
// ===============================
app.post("/kontak", async(req, res) => {
    const { email, nama, alasan, pesan } = req.body;

    if (!email || !nama || !alasan || !pesan) {
        return res.status(400).json({ message: "Semua field wajib diisi" });
    }

    try {
        await transporter.sendMail({
            from: `"${nama}" <${email}>`, // Nama dan email pengirim
            to: process.env.GMAIL_USER, // Email kamu sendiri
            subject: `[${alasan}] Pesan dari ${nama}`,
            html: `
                <h2>Pesan Kontak dari ${nama}</h2>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Alasan:</strong> ${alasan}</p>
                <p><strong>Pesan:</strong><br>${pesan}</p>
            `
        });

        res.json({ message: "Pesan berhasil dikirim!" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Gagal mengirim pesan" });
    }
});


// ===================
// ✅ JALANKAN SERVER
// ===================
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT} ✅`);
});