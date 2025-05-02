const express = require("express");
const bcrypt = require("bcrypt");
const { sql, poolPromise } = require("./db");
const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("Email", sql.NVarChar, email)
      .query("SELECT * FROM Users WHERE Email = @Email");

    if (result.recordset.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

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
      marketingOptIn: !!user.MarketingOptIn
    };

    res.json({ message: "Login successful", user: req.session.user });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/register", async (req, res) => {
  const { email, password, name, marketingOptIn } = req.body;

  const isPasswordStrong = (password) => {
    const lengthCheck = password.length >= 8;
    const uppercaseCheck = /[A-Z]/.test(password);
    const lowercaseCheck = /[a-z]/.test(password);
    const numberCheck = /[0-9]/.test(password);
    const specialCharCheck = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    return lengthCheck && uppercaseCheck && lowercaseCheck && numberCheck && specialCharCheck;
  };

  try {
    if (!isPasswordStrong(password)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and special character.",
      });
    }

    const pool = await poolPromise;

    const existing = await pool
      .request()
      .input("Email", sql.NVarChar, email)
      .query("SELECT * FROM Users WHERE Email = @Email");

    if (existing.recordset.length > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hash = await bcrypt.hash(password, 10);

    await pool
      .request()
      .input("Email", sql.NVarChar, email)
      .input("PasswordHash", sql.NVarChar, hash)
      .input("Name", sql.NVarChar, name)
      .input("MarketingOptIn", sql.Bit, marketingOptIn ? 1 : 0)
      .query(`
        INSERT INTO Users (Email, PasswordHash, Name, CreatedAt, MarketingOptIn)
        VALUES (@Email, @PasswordHash, @Name, GETDATE(), @MarketingOptIn)
      `);

    res.json({ message: "Registration successful" });
  } catch (err) {
    console.error("Registration error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ error: "Logout failed" });
    }
    res.clearCookie("connect.sid");
    res.sendStatus(200);
  });
});

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
      isAdmin: !!user.IsAdmin,
      street: user.Street || "",
      city: user.City || "",
      state: user.State || "",
      zip: user.Zip || "",
      marketingOptIn: !!user.MarketingOptIn
    });
  } catch (err) {
    console.error("Get /me error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/account/changepassword", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { oldPassword, newPassword } = req.body;

  const isPasswordStrong = (password) => {
    const lengthCheck = password.length >= 8;
    const uppercaseCheck = /[A-Z]/.test(password);
    const lowercaseCheck = /[a-z]/.test(password);
    const numberCheck = /[0-9]/.test(password);
    const specialCharCheck = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    return lengthCheck && uppercaseCheck && lowercaseCheck && numberCheck && specialCharCheck;
  };

  try {
    if (!isPasswordStrong(newPassword)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and special character.",
      });
    }

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("UserId", sql.Int, req.session.user.id)
      .query("SELECT * FROM Users WHERE UserId = @UserId");

    const user = result.recordset[0];

    if (!user) return res.status(404).json({ message: "User not found" });

    const match = await bcrypt.compare(oldPassword, user.PasswordHash);

    if (!match) {
      return res.status(400).json({ message: "Old password is incorrect." });
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await pool
      .request()
      .input("UserId", sql.Int, req.session.user.id)
      .input("PasswordHash", sql.NVarChar, newHash)
      .query(`
        UPDATE Users
        SET PasswordHash = @PasswordHash
        WHERE UserId = @UserId
      `);

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Password change error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/account/update", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { name, street, city, state, zip, marketingOptIn } = req.body;

  try {
    const pool = await poolPromise;

    await pool
      .request()
      .input("UserId", sql.Int, req.session.user.id)
      .input("Name", sql.NVarChar, name)
      .input("Street", sql.NVarChar, street)
      .input("City", sql.NVarChar, city)
      .input("State", sql.NVarChar, state)
      .input("Zip", sql.NVarChar, zip)
      .input("MarketingOptIn", sql.Bit, marketingOptIn ? 1 : 0)
      .query(`
        UPDATE Users
        SET Name = @Name,
            Street = @Street,
            City = @City,
            State = @State,
            Zip = @Zip,
            MarketingOptIn = @MarketingOptIn
        WHERE UserId = @UserId
      `);

    req.session.user.name = name;

    res.json({ message: "Account updated successfully" });
  } catch (err) {
    console.error("❌ Account update error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;


