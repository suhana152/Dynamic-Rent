const express = require("express");
const cors = require("cors");
require("dotenv").config();
const path = require("path");
const connectDB = require("./config/db");

const app = express();
connectDB();

// Middleware: runs on every request
app.use(cors());
app.use(express.json());

// Makes uploaded photos open in the browser at /uploads/...
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});
// Home route: a friendly page instead of "Route not found"
app.get("/", (req, res) => {
  res.json({
    name: "DynamicRent API",
    status: "running",
    health: "/api/health",
    docs: "See the README on GitHub for all endpoints",
    endpoints: [
      "/api/auth",
      "/api/listings",
      "/api/pricing/quote",
      "/api/bookings",
      "/api/users",
    ],
  });
});
// Test route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "DynamicRent server is running" });
});

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/listings", require("./routes/listingRoutes"));
app.use("/api/pricing", require("./routes/pricingRoutes"));
app.use("/api/bookings", require("./routes/bookingRoutes"));
app.use("/api/users", require("./routes/userRoutes"));

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, (err) => {
  if (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
  console.log(`Server running on http://localhost:${PORT}`);
});