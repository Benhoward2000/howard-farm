// Load environment variables from .env
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const nodemailer = require("nodemailer");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { sql, poolPromise } = require("./db");
const authRoutes = require("./Auth");
const router = express.Router();
const fetch = require("node-fetch");
const app = express();
const EASYPOST_API_KEY = process.env.EASYPOST_API_KEY; // load from .env
const PORT = process.env.PORT || 3001;
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:8080",
  "https://howardsfarm.org",
  "https://www.howardsfarm.org",
  "https://howards-farm-app-c0cmbderahfva9er.westus2-01.azurewebsites.net"
];

// 👇 Add this BEFORE session middleware
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1); // trust Azure reverse proxy
}

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    const normalizedOrigin = origin?.replace(/\/$/, ""); // remove trailing slash
    console.log("🌐 Incoming origin:", normalizedOrigin);

    if (!origin || allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      console.log("🚫 Blocked by CORS:", normalizedOrigin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "super-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 2 // 2 hours
    }
    
  })
);

// Middleware: check if session user is admin
function isAuthenticated(req, res, next) {
  if (req.session?.user?.isAdmin) {
    return next();
  }
  return res.status(403).json({ error: "Access denied" });
}

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/shipping", router); // 👈 this exposes /api/shipping/validate-address

// Root test route
app.get("/", (req, res) => {
  res.send("Howard's Farm API is running.");
});



// 📦 EasyPost Validate Address
router.post("/validate-address", async (req, res) => {
  const { street, city, state, zip } = req.body;
  // ✅ Convert full state name to abbreviation
  const stateMap = {
    "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA",
    "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE", "Florida": "FL", "Georgia": "GA",
    "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
    "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD", "Massachusetts": "MA",
    "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS", "Missouri": "MO", "Montana": "MT",
    "Nebraska": "NE", "Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM",
    "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
    "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
    "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT", "Vermont": "VT",
    "Virginia": "VA", "Washington": "WA", "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY"
  };

  const fixedState = stateMap[state] || state;

  const requestBody = {
    address: {
      street1: street,
      city,
      state: fixedState,
      zip,
      country: "US",
      verify: ["delivery"],
    },
  };

  // 🔍 Log what we're sending
  console.log("📦 Sending address to EasyPost for validation:", requestBody);

  try {
    const epRes = await fetch("https://api.easypost.com/v2/addresses", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(EASYPOST_API_KEY + ":").toString("base64"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await epRes.json();

    // 🔍 Log the raw EasyPost response
    console.log("📬 EasyPost response:", data);

    // ✅ Updated validation handling
const wasValidated = data.verifications?.delivery?.success === true;

// ✅ If no verifications object returned (test mode), treat as valid
const treatAsValid = !data.verifications || Object.keys(data.verifications).length === 0;

if (wasValidated || treatAsValid) {
  res.json({ valid: true, address: data });
} else {
  const errorMessage = data.verifications?.delivery?.errors?.[0]?.message || "Invalid address";
  res.status(400).json({ valid: false, message: errorMessage, raw: data });
}

  } catch (err) {
    console.error("❌ EasyPost validation error:", err);
    res.status(500).json({
      valid: false,
      message: "Server error validating address",
      raw: err,
    });
  }
});


// 📦 EasyPost Calculate Shipping Rates
router.post("/rates", async (req, res) => {
  const { street, city, state, zip, cartItems } = req.body;

  if (!street || !city || !state || !zip || !Array.isArray(cartItems)) {
    return res.status(400).json({ error: "Missing address or cart items" });
  }

  try {
    const toAddress = {
      street1: street,
      city,
      state,
      zip,
      country: "US",
    };

    const fromAddress = {
      street1: "32802 Pittsburg Road",
      city: "Saint Helens",
      state: "OR",
      zip: "97051",
      country: "US",
    };

    const totalWeightOz = cartItems.reduce((sum, item) => {
      const weightOz = parseFloat(item.weight);
      const qty = parseInt(item.quantity) || 1;
    
      if (isNaN(weightOz)) {
        console.warn("⚠️ Invalid weight for item:", item);
        return sum;
      }
    
      return sum + weightOz * qty;
    }, 0);
    

    const parcel = {
      weight: parseFloat(totalWeightOz.toFixed(2)), // ✅ Keep weight as number
      length: 6,
      width: 6,
      height: 6,
    };
    
    
    
    console.log("📦 Parcel weight (oz):", totalWeightOz);
    console.log("🛒 Cart items:", cartItems);
    console.log("🧪 Parcel for EasyPost:", parcel);
    console.log("🔑 EASYPOST_API_KEY:", process.env.EASYPOST_API_KEY);
    // Fix state abbreviations for both to_address and from_address
   
    const stateMap = {
      "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA",
      "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE", "Florida": "FL", "Georgia": "GA",
      "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
      "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD", "Massachusetts": "MA",
      "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS", "Missouri": "MO", "Montana": "MT",
      "Nebraska": "NE", "Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM",
      "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
      "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
      "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT", "Vermont": "VT",
      "Virginia": "VA", "Washington": "WA", "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY"
    };
    
    

// Replace state names with abbreviations if needed
if (toAddress?.state) {
  toAddress.state = stateMap[toAddress.state] || toAddress.state;
}
if (fromAddress?.state) {
  fromAddress.state = stateMap[fromAddress.state] || fromAddress.state;
}

    
    const shipmentResponse = await fetch("https://api.easypost.com/v2/shipments", {
      method: "POST",
      headers: {
        
        Authorization: "Basic " + Buffer.from(process.env.EASYPOST_API_KEY + ":").toString("base64"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        shipment: {
          to_address: toAddress,
          from_address: fromAddress,
          parcel,
        },
      }),
    });

    const shipmentText = await shipmentResponse.text();
console.log("🛑 Raw EasyPost response:", shipmentText);
const shipmentData = JSON.parse(shipmentText);

    if (shipmentData.error) {
      throw new Error(shipmentData.error.message);
    }

    const rates = shipmentData.rates.map((rate) => ({
      carrier: rate.carrier,
      service: rate.service,
      rate: parseFloat(rate.rate),
      delivery_days: rate.delivery_days,
      rate_id: rate.id,
    }));

    res.json(rates);
  } catch (err) {
    console.error("Error fetching shipping rates:", err);
    res.status(500).json({ error: "Failed to get shipping rates" });
  }
});

module.exports = router;


// Stripe PaymentIntent
app.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || typeof amount !== "number") {
      return res.status(400).json({ error: "Amount must be a number in cents." });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
    });

    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("PaymentIntent error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Get active products (not archived) ordered by DisplayOrder
// Get active products (non-archived)
app.get("/products", async (req, res) => {
  try {
    console.log("🔌 Attempting DB connection...");
    const pool = await poolPromise;
    console.log("✅ Connected to DB");

    const result = await pool.request().query(`
      SELECT * FROM Products 
      WHERE IsArchived = 0 
      ORDER BY DisplayOrder ASC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("❌ SQL error:", err.message);
    console.error("🧠 Full stack:", err.stack);
    res.status(500).send("Failed to fetch products");
  }
});


app.get("/products/all", isAuthenticated, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT * FROM Products 
      ORDER BY DisplayOrder ASC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("SQL error:", err.message);
    res.status(500).send("Failed to fetch all products");
  }
});
app.put("/products/:id/archive", isAuthenticated, async (req, res) => {
  const { id } = req.params;
  const { isArchived } = req.body;

  try {
    const pool = await poolPromise;
    await pool.request()
      .input("id", sql.Int, id)
      .input("isArchived", sql.Bit, isArchived)
      .query(`
        UPDATE Products
        SET IsArchived = @isArchived
        WHERE ProductId = @id
      `);
    res.sendStatus(200);
  } catch (err) {
    console.error("Archive toggle failed:", err.message);
    res.status(500).send("Failed to update archive status");
  }
});


// ✅ Update product
app.put("/products/:id", isAuthenticated, async (req, res) => {
  const { id } = req.params;
  const {
    name,
    description,
    price,
    stock,
    imageURL,
    localPickupOnly,
    displayOrder,
    weight,
    length,
    width,
    height
  } = req.body;

  try {
    const pool = await poolPromise;
    await pool.request()
      .input("id", sql.Int, id)
      .input("name", sql.VarChar(100), name)
      .input("desc", sql.Text, description)
      .input("price", sql.Decimal(10, 2), price)
      .input("stock", sql.Int, stock)
      .input("img", sql.VarChar(255), imageURL)
      .input("pickup", sql.Bit, localPickupOnly)
      .input("order", sql.Int, displayOrder || 0)
      .input("Weight", sql.Decimal(5, 2), weight)
      .input("Length", sql.Decimal(5, 2), length)
      .input("Width", sql.Decimal(5, 2), width)
      .input("Height", sql.Decimal(5, 2), height)
      .query(`
        UPDATE Products
        SET Name = @name,
            Description = @desc,
            Price = @price,
            StockQty = @stock,
            ImageUrl = @img,
            LocalPickupOnly = @pickup,
            DisplayOrder = @order,
            Weight = @Weight,
            Length = @Length,
            Width = @Width,
            Height = @Height
        WHERE ProductId = @id
      `);

    res.sendStatus(200);
  } catch (err) {
    console.error("Update failed:", err.message);
    res.status(500).json({ error: "Update failed" });
  }
});


// Add product
app.post("/products", isAuthenticated, async (req, res) => {
  const { name, description, price, stock, imageURL, localPickupOnly, displayOrder, weight, length, width, height } = req.body;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input("Name", sql.VarChar(100), name)
      .input("Description", sql.Text, description)
      .input("Price", sql.Decimal(10, 2), price)
      .input("StockQty", sql.Int, stock)
      .input("ImageUrl", sql.VarChar(255), imageURL)
      .input("LocalPickupOnly", sql.Bit, localPickupOnly)
      .input("DisplayOrder", sql.Int, displayOrder || 0)
      .input("Weight", sql.Decimal(5, 2), weight)
.input("Length", sql.Decimal(5, 2), length)
.input("Width", sql.Decimal(5, 2), width)
.input("Height", sql.Decimal(5, 2), height)
.query(`
  INSERT INTO Products (Name, Description, Price, StockQty, ImageUrl, LocalPickupOnly, DisplayOrder, Weight, Length, Width, Height)
  VALUES (@Name, @Description, @Price, @StockQty, @ImageUrl, @LocalPickupOnly, @DisplayOrder, @Weight, @Length, @Width, @Height)
`);


    res.status(201).send("Product added");
  } catch (err) {
    console.error("Insert error:", err.message);
    res.status(500).send("Failed to add product");
  }
});

// Delete product
app.delete("/products/:id", isAuthenticated, async (req, res) => {
  try {
    const pool = await poolPromise;
    await pool.request()
      .input("ProductId", sql.Int, req.params.id)
      .query("DELETE FROM Products WHERE ProductId = @ProductId");

    res.send("Product deleted");
  } catch (err) {
    console.error("Delete error:", err.message);
    res.status(500).send("Failed to delete product");
  }
});

// Final checkout route (only one!)
app.post("/checkout", async (req, res) => {
  const { shippingInfo, shippingMethod, shippingCost, cartItems } = req.body; // ✅ NEW

  if (!shippingInfo || !Array.isArray(cartItems) || cartItems.length === 0) {
    return res.status(400).json({ error: "Missing shipping info or cart items." });
  }

  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const emailToUse = req.session.user?.email || shippingInfo.email;

    const shippingResult = await transaction.request()
      .input("FullName", sql.NVarChar, shippingInfo.fullName)
      .input("Street", sql.NVarChar, shippingInfo.street)
      .input("City", sql.NVarChar, shippingInfo.city)
      .input("State", sql.NVarChar, shippingInfo.state)
      .input("Zip", sql.NVarChar, shippingInfo.zip)
      .input("Email", sql.NVarChar, emailToUse)
      .input("Phone", sql.NVarChar, shippingInfo.phone)
      .query(`
        INSERT INTO ShippingDetails (FullName, Street, City, State, Zip, Email, Phone, CreatedAt)
        OUTPUT INSERTED.Id
        VALUES (@FullName, @Street, @City, @State, @Zip, @Email, @Phone, GETDATE())
      `);

    const shippingId = shippingResult.recordset[0].Id;
    const insertedOrders = [];

    for (const item of cartItems) {
      const orderResult = await transaction.request()
        .input("ShippingId", sql.Int, shippingId)
        .input("ProductId", sql.Int, item.productId)
        .input("Quantity", sql.Int, item.quantity)
        .input("Price", sql.Decimal(10, 2), item.price)
        .input("OrderStatus", sql.NVarChar, "Pending")
        .input("ShippingMethod", sql.NVarChar, shippingMethod) // ✅ NEW
        .input("ShippingCost", sql.Decimal(10, 2), shippingCost) // ✅ NEW
        .query(`
          INSERT INTO Orders (ShippingId, ProductId, Quantity, Price, CreatedAt, OrderStatus, ShippingMethod, ShippingCost)
          OUTPUT INSERTED.*
          VALUES (@ShippingId, @ProductId, @Quantity, @Price, GETDATE(), @OrderStatus, @ShippingMethod, @ShippingCost)
        `);

      insertedOrders.push(orderResult.recordset[0]);

      await transaction.request()
        .input("ProductId", sql.Int, item.productId)
        .input("Quantity", sql.Int, item.quantity)
        .query(`
          UPDATE Products
          SET StockQty = StockQty - @Quantity
          WHERE ProductId = @ProductId
        `);
    }

    await transaction.commit();

    const insertedOrder = insertedOrders[0];
    if (!insertedOrder || !insertedOrder.OrderId) {
      throw new Error("Inserted order is missing or invalid.");
    }

    const result = await pool.request()
      .input("OrderId", sql.Int, insertedOrder.OrderId)
      .query(`
        SELECT 
          o.OrderId, o.ProductId, o.Quantity, o.Price, o.CreatedAt, o.OrderStatus,
          o.TrackingNumber, o.ShippedAt, o.ShippingMethod, o.ShippingCost, -- ✅ NEW
          p.Name AS ProductName,
          s.FullName, s.Street, s.City, s.State, s.Zip, s.Email, s.Phone
        FROM Orders o
        JOIN Products p ON o.ProductId = p.ProductId
        JOIN ShippingDetails s ON o.ShippingId = s.Id
        WHERE o.OrderId = @OrderId
      `);

    const orderDetails = result.recordset[0];
    const recipientEmail = orderDetails?.Email || shippingInfo.email;

    if (recipientEmail) {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT, 10),
        secure: process.env.EMAIL_SECURE === "true",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const price = typeof orderDetails.Price === "number" ? orderDetails.Price : 0;
      const quantity = typeof orderDetails.Quantity === "number" ? orderDetails.Quantity : 0;
      const shippingFee = typeof orderDetails.ShippingCost === "number" ? orderDetails.ShippingCost : 0;
      const total = price * quantity + shippingFee;

      const emailHtml = `
        <h2>Thank you for your order from Howard's Farm!</h2>
        <p><strong>Order ID:</strong> ${orderDetails.OrderId}</p>
        <p><strong>Date:</strong> ${new Date(orderDetails.CreatedAt).toLocaleString()}</p>
        <h3>Items Ordered:</h3>
        <p>${quantity} × ${orderDetails.ProductName} @ $${price.toFixed(2)}</p>
        <p><strong>Shipping:</strong> ${orderDetails.ShippingMethod || "N/A"} – $${shippingFee.toFixed(2)}</p>
        <p><strong>Total:</strong> $${total.toFixed(2)}</p>
        <h3>Shipping Address:</h3>
        <p>${orderDetails.FullName}<br>${orderDetails.Street}<br>${orderDetails.City}, ${orderDetails.State} ${orderDetails.Zip}</p>
        <p><strong>Status:</strong> ${orderDetails.OrderStatus}</p>
        <hr />
        <p>This is a confirmation of your purchase. You’ll receive another email when your order ships.</p>
      `;

      try {
        await transporter.sendMail({
          from: `"Howard's Farm" <${process.env.EMAIL_USER}>`,
          to: recipientEmail,
          replyTo: process.env.ORDER_REPLY_TO,
          bcc: process.env.ORDER_BCC,
          subject: `Your Howard's Farm Order #${orderDetails.OrderId}`,
          html: emailHtml,
        });
      } catch (emailErr) {
        console.error("❌ Email send failed:", emailErr.message);
      }
    }

    res.status(200).json(orderDetails);
  } catch (err) {
    if (transaction._aborted !== true) {
      try {
        await transaction.rollback();
      } catch (rollbackErr) {
        console.error("Rollback failed:", rollbackErr.message);
      }
    }
    console.error("❌ Checkout failed:", err.message);
    res.status(500).json({ error: "Checkout failed" });
  }
});


// Admin: Get all orders with shipping and product info
app.get("/api/admin/orders", isAuthenticated, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
  o.OrderId AS orderId,
  o.ShippingId AS shippingId,
  o.ProductId AS productId,
  o.Quantity AS quantity,
  o.Price AS price,
  o.CreatedAt AS createdAt,
  o.OrderStatus AS orderStatus,
  o.TrackingNumber AS trackingNumber,
  o.ShippedAt AS shippedAt,
  s.FullName AS fullName,
  s.Street AS street,
  s.City AS city,
  s.State AS state,
  s.Zip AS zip,
  s.Email AS email,
  s.Phone AS phone,
  p.Name AS productName
FROM Orders o
JOIN ShippingDetails s ON o.ShippingId = s.Id
JOIN Products p ON o.ProductId = p.ProductId
ORDER BY o.CreatedAt DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Fetch orders error:", err.message);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Admin: Update order status and tracking number and send Shipping E-mail (once)
app.put("/api/admin/orders/:id", isAuthenticated, async (req, res) => {
  const { id } = req.params;
  const { orderStatus, trackingNumber } = req.body;

  try {
    const pool = await poolPromise;

    // 🔍 Step 1: Fetch current order before updating
    const result = await pool.request()
      .input("OrderId", sql.Int, id)
      .query(`
        SELECT o.OrderId, o.OrderStatus, o.Quantity, o.Price, o.ShippingEmailSent,
               s.Email, s.FullName, s.Street, s.City, s.State, s.Zip,
               p.Name AS ProductName
        FROM Orders o
        JOIN ShippingDetails s ON o.ShippingId = s.Id
        JOIN Products p ON o.ProductId = p.ProductId
        WHERE o.OrderId = @OrderId
      `);

    const currentOrder = result.recordset[0];
    const wasShipped = currentOrder?.OrderStatus === "Shipped";
    const alreadyEmailed = currentOrder?.ShippingEmailSent;

    // ✅ Step 2: Perform the update (this matches your original logic exactly)
    await pool.request()
      .input("OrderId", sql.Int, id)
      .input("OrderStatus", sql.NVarChar, orderStatus)
      .input("TrackingNumber", sql.NVarChar, trackingNumber || "")
      .query(`
        UPDATE Orders
        SET OrderStatus = @OrderStatus,
            TrackingNumber = @TrackingNumber,
            ShippedAt = CASE 
                         WHEN @OrderStatus = 'Shipped' AND ShippedAt IS NULL THEN GETDATE()
                         ELSE ShippedAt
                       END
        WHERE OrderId = @OrderId
      `);

    // ✅ Step 3: Send email only if status changed to "Shipped" and hasn't been emailed yet
    if (!wasShipped && orderStatus === "Shipped" && !alreadyEmailed) {
      console.log("📬 Sending shipping email...");

      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT, 10),
        secure: process.env.EMAIL_SECURE === "true",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const price = parseFloat(currentOrder.Price || 0);
      const quantity = parseInt(currentOrder.Quantity || 0);
      const total = price * quantity;

      const emailHtml = `
        <h2>Your order has shipped from Howard's Farm! 📦</h2>
        <p><strong>Order ID:</strong> ${currentOrder.OrderId}</p>
        <p><strong>Date Shipped:</strong> ${new Date().toLocaleString()}</p>

        <h3>Items Shipped:</h3>
        <p>${quantity} × ${currentOrder.ProductName} @ $${price.toFixed(2)}</p>
        <p><strong>Total:</strong> $${total.toFixed(2)}</p>

        <h3>Shipping Address:</h3>
        <p>${currentOrder.FullName}<br>${currentOrder.Street}<br>${currentOrder.City}, ${currentOrder.State} ${currentOrder.Zip}</p>

        ${trackingNumber ? `<p><strong>Tracking Number:</strong> ${trackingNumber}</p>` : ""}
        <hr />
        <p>This is a confirmation that your order has shipped. You’ll receive delivery soon. Thank you for shopping with us!</p>
      `;

      await transporter.sendMail({
        from: `"Howard's Farm" <${process.env.EMAIL_USER}>`,
        to: currentOrder.Email,
        replyTo: process.env.ORDER_REPLY_TO,
        bcc: process.env.ORDER_BCC,
        subject: `📬 Your Howard's Farm Order #${currentOrder.OrderId} Has Shipped!`,
        html: emailHtml,
      });

      console.log(`✅ Shipping email sent to ${currentOrder.Email}`);

      // ✅ Step 4: Mark email sent in the DB
      await pool.request()
        .input("OrderId", sql.Int, id)
        .query(`
          UPDATE Orders
          SET ShippingEmailSent = 1
          WHERE OrderId = @OrderId
        `);
    }

    res.json({ message: "Order updated successfully" });
  } catch (err) {
    console.error("❌ Order update error:", err.message);
    res.status(500).json({ error: "Failed to update order" });
  }
});




// Customer Order lookup 
app.get("/api/orders", async (req, res) => {
  //console.log("🔍 SESSION USER", req.session.user);

  if (!req.session?.user?.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("Email", sql.NVarChar, req.session.user.email)
      .query(`
        SELECT 
          o.OrderId AS orderId,
          o.ProductId AS productId,
          o.Quantity AS quantity,
          o.Price AS price,
          o.CreatedAt AS createdAt,
          o.OrderStatus AS orderStatus,
          o.TrackingNumber AS trackingNumber,
          o.ShippedAt AS shippedAt,
          p.Name AS productName
        FROM Orders o
        JOIN ShippingDetails s ON o.ShippingId = s.Id
        JOIN Products p ON o.ProductId = p.ProductId
        WHERE s.Email = @Email
        ORDER BY o.CreatedAt DESC
      `);

    //console.log("✅ Orders found:", result.recordset);
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Fetch user orders error:", err.message);
    res.status(500).json({ error: "Failed to fetch user orders" });
  }
});

// Express route: /api/orders/last

app.get("/api/orders/last", async (req, res) => {
  // Check if the email is available from the session or fallback
  const email = req.session?.user?.email;

  if (!email) {
    return res.status(401).json({ error: "Unauthorized: no session email." });
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("Email", sql.NVarChar, email)
      .query(`
        SELECT TOP 1 
          o.OrderId,
          o.ProductId,
          o.Quantity,
          o.Price,
          o.CreatedAt,
          o.OrderStatus,
          o.TrackingNumber,
          o.ShippedAt,
          p.Name AS ProductName,
          s.FullName,
          s.Street,
          s.City,
          s.State,
          s.Zip,
          s.Email,
          s.Phone
        FROM Orders o
        JOIN Products p ON o.ProductId = p.ProductId
        JOIN ShippingDetails s ON o.ShippingId = s.Id
        WHERE s.Email = @Email
        ORDER BY o.CreatedAt DESC
      `);

    const lastOrder = result.recordset[0];

    if (!lastOrder) {
      return res.status(404).json({ error: "No orders found for this user." });
    }

    res.status(200).json(lastOrder);
  } catch (err) {
    console.error("Error fetching last order:", err);
    res.status(500).json({ error: "Failed to load order." });
  }
});






// Contact form
app.post("/contact", async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT, 10),
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Howard's Farm Contact" <${process.env.EMAIL_USER}>`,
      to: "benhoward2000@gmail.com",
      subject: `New Contact Message from ${name}`,
      html: `
        <h3>New Contact Form Message</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    });

    res.send({ success: true });
  } catch (error) {
    console.error("Email send error:", error.message);
    res.status(500).json({ error: "Failed to send message." });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});

