import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import app from "./app.js";
import connectDB from "./config/db.js";

dotenv.config();

const uploadsPath = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`SWARX API running on http://localhost:${PORT}`);
  });
};

start();
