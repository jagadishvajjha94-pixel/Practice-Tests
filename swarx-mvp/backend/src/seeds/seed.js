import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import Task from "../models/Task.js";

dotenv.config();

const run = async () => {
  await connectDB();

  await Promise.all([User.deleteMany({}), Task.deleteMany({})]);

  const password = await bcrypt.hash("password123", 10);
  const admin = await User.create({
    name: "SWARX Admin",
    email: "admin@swarx.com",
    password,
    role: "admin",
  });
  const trainer = await User.create({
    name: "SWARX Trainer",
    email: "trainer@swarx.com",
    password,
    role: "trainer",
  });
  const student = await User.create({
    name: "SWARX Student",
    email: "student@swarx.com",
    password,
    role: "student",
    assignedTrainer: trainer._id,
  });

  await Task.create({
    title: "Introduce Yourself in 90 Seconds",
    description: "Record a short self-introduction focusing on clarity and confidence.",
    createdBy: trainer._id,
    assignedTo: [student._id],
    isDaily: true,
    dueDate: new Date(),
  });

  console.log("Seeded users:");
  console.log("admin@swarx.com / password123");
  console.log("trainer@swarx.com / password123");
  console.log("student@swarx.com / password123");
  console.log("Done.");
  process.exit(0);
};

run();
