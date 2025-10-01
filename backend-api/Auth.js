const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { sql, poolPromise } = require("./db");
const { sendEmail } = require("./mailer");
const router = express.Router();
const FRONTEND_URL = process.env.FRONTEND_URL || "https://howardsfarm.org";

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("Email", sql.NVarChar, email)
      .query("SELECT * FROM Users WHERE Email = @Email");

    if (result.recordset.length === 0) return res.status(401).json({ message: "Invalid credentials" });

    const user = result.recordset[0];
    const match = await bcrypt.compare(password, user.PasswordHash);

    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    req.session.user = {
      id: user.UserId,
      name: user.Name,
      email: user.Email,
      isAdmin: !!user.IsAdmin,
      street: user.Street || "",
      city: user.City || "",
      state: user.State || "",
      zip: user.Zip || "",
      marketingOptIn: !!user.MarketingOptIn,
      smsAlertOptIn: !!user.SmsAlertOptIn 
    };

    res.json({ message: "Login successful", user: req.session.user });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// REGISTER
router.post("/register", async (req, res) => {
  const { email, password, name, marketingOptIn, phone } = req.body;

  const isPasswordStrong = (p) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/.test(p);
  if (!isPasswordStrong(password)) {
    return res.status(400).json({ message: "Weak password." });
  }

  try {
    const pool = await poolPromise;
    const existing = await pool
      .request()
      .input("Email", sql.NVarChar, email)
      .query("SELECT * FROM Users WHERE Email = @Email");

    if (existing.recordset.length > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hash = await bcrypt.hash(password, 10);
    const verificationCode = generateCode();

    await pool
      .request()
      .input("Email", sql.NVarChar, email)
      .input("PasswordHash", sql.NVarChar, hash)
      .input("Name", sql.NVarChar, name)
      .input("MarketingOptIn", sql.Bit, marketingOptIn ? 1 : 0)
      .input("isVerified", sql.Bit, 0)
      .input("verificationCode", sql.NVarChar, verificationCode)
      .input("Phone", sql.NVarChar, phone || "")
      .query(`
        INSERT INTO Users (Email, PasswordHash, Name, CreatedAt, MarketingOptIn, isVerified, verificationCode, Phone)
        VALUES (@Email, @PasswordHash, @Name, GETDATE(), @MarketingOptIn, @isVerified, @verificationCode, @Phone)
      `);

    await sendEmail(
      email,
      "Verify your account",
      `<p>Your 6-digit verification code is: <strong>${verificationCode}</strong></p>`
    );

    res.json({ message: "Verification code sent to your email." });
  } catch (err) {
    console.error("Registration error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});


// VERIFY CODE
router.post("/verify-code", async (req, res) => {
  const { email, code } = req.body;

  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("Email", sql.NVarChar, email)
      .input("Code", sql.NVarChar, code)
      .query("SELECT * FROM Users WHERE Email = @Email AND verificationCode = @Code");

    if (result.recordset.length === 0) {
      return res.status(400).json({ message: "Invalid verification code." });
    }

    await pool
      .request()
      .input("Email", sql.NVarChar, email)
      .query("UPDATE Users SET isVerified = 1, verificationCode = NULL WHERE Email = @Email");

    res.json({ message: "✅ Email verified successfully." });
  } catch (err) {
    console.error("Code verification error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// LOGOUT
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Logout failed" });
    res.clearCookie("connect.sid");
    res.sendStatus(200);
  });
});

// GET CURRENT USER
router.get("/me", async (req, res) => {
  if (!req.session.user) return res.status(401).json({ message: "Not logged in" });

  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("UserId", sql.Int, req.session.user.id)
      .query("SELECT * FROM Users WHERE UserId = @UserId");

    const user = result.recordset[0];
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      id: user.UserId,
      name: user.Name,
      email: user.Email,
      phone: user.Phone || "",
      isAdmin: !!user.IsAdmin,
      street: user.Street || "",
      city: user.City || "",
      state: user.State || "",
      zip: user.Zip || "",
      marketingOptIn: !!user.MarketingOptIn,
      smsAlertOptIn: !!user.SmsAlertOptIn
    });
  } catch (err) {
    console.error("Get /me error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// ADMIN: toggle SMS order-alert opt-in for the CURRENT admin user
router.put("/account/alerts/optin", async (req, res) => {
  if (!req.session.user) return res.status(401).json({ message: "Unauthorized" });
  if (!req.session.user.isAdmin) return res.status(403).json({ message: "Admins only" });

  const { smsAlertOptIn } = req.body;
  const value = smsAlertOptIn === true || smsAlertOptIn === 1 ? 1 : 0;

  try {
    const pool = await poolPromise;
    await pool.request()
      .input("UserId", sql.Int, req.session.user.id)
      .input("OptIn", sql.Bit, value)
      .query(`
        UPDATE Users
        SET SmsAlertOptIn = @OptIn
        WHERE UserId = @UserId AND IsAdmin = 1
      `);

    // keep session in sync
    req.session.user.smsAlertOptIn = !!value;

    res.json({ message: "SMS alert opt-in updated", smsAlertOptIn: !!value });
  } catch (err) {
    console.error("Admin opt-in update error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// CHANGE PASSWORD
router.post("/account/changepassword", async (req, res) => {
  if (!req.session.user) return res.status(401).json({ message: "Unauthorized" });

  const { oldPassword, newPassword } = req.body;
  const isPasswordStrong = (p) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/.test(p);

  if (!isPasswordStrong(newPassword)) {
    return res.status(400).json({ message: "Weak password." });
  }

  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("UserId", sql.Int, req.session.user.id)
      .query("SELECT * FROM Users WHERE UserId = @UserId");

    const user = result.recordset[0];
    if (!user) return res.status(404).json({ message: "User not found" });

    const match = await bcrypt.compare(oldPassword, user.PasswordHash);
    if (!match) return res.status(400).json({ message: "Old password is incorrect." });

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool
      .request()
      .input("UserId", sql.Int, req.session.user.id)
      .input("PasswordHash", sql.NVarChar, newHash)
      .query("UPDATE Users SET PasswordHash = @PasswordHash WHERE UserId = @UserId");

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Password change error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE ACCOUNT INFO (supports admin-only SmsAlertOptIn)
router.post("/account/update", async (req, res) => {
  if (!req.session.user) return res.status(401).json({ message: "Unauthorized" });

  // include smsAlertOptIn in the payload
  const { name, phone, street, city, state, zip, marketingOptIn, smsAlertOptIn } = req.body;

  try {
    const pool = await poolPromise;

    const canSetSms =
      !!req.session.user.isAdmin &&
      (smsAlertOptIn === true || smsAlertOptIn === false || smsAlertOptIn === 1 || smsAlertOptIn === 0);

    const request = pool
      .request()
      .input("UserId", sql.Int, req.session.user.id)
      .input("Name", sql.NVarChar, name)
      .input("Phone", sql.NVarChar, phone)
      .input("Street", sql.NVarChar, street)
      .input("City", sql.NVarChar, city)
      .input("State", sql.NVarChar, state)
      .input("Zip", sql.NVarChar, zip)
      .input("MarketingOptIn", sql.Bit, marketingOptIn ? 1 : 0);

    let sqlText = `
      UPDATE Users
      SET Name = @Name, Phone = @Phone, Street = @Street, City = @City,
          State = @State, Zip = @Zip, MarketingOptIn = @MarketingOptIn
      WHERE UserId = @UserId
    `;

    if (canSetSms) {
      request.input("SmsAlertOptIn", sql.Bit, smsAlertOptIn ? 1 : 0);
      sqlText = `
        UPDATE Users
        SET Name = @Name, Phone = @Phone, Street = @Street, City = @City,
            State = @State, Zip = @Zip, MarketingOptIn = @MarketingOptIn,
            SmsAlertOptIn = @SmsAlertOptIn
        WHERE UserId = @UserId
      `;
    }

    await request.query(sqlText);

    // keep session in sync with what you show in the UI
    req.session.user.name = name;
    req.session.user.phone = phone;
    if (canSetSms) req.session.user.smsAlertOptIn = !!smsAlertOptIn;

    res.json({ message: "Account updated successfully" });
  } catch (err) {
    console.error("Account update error:", err);
    res.status(500).json({ message: "Server error" });
  }
});



module.exports = router;






