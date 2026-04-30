import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Submission from "../models/Submission.js";

export const listUsers = async (_req, res, next) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { name, email, role = "student", password = "password123" } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, role, password: hash });
    res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select("-password");
    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
  } catch (error) {
    next(error);
  }
};

export const assignTrainer = async (req, res, next) => {
  try {
    const { studentId, trainerId } = req.body;
    const student = await User.findById(studentId);
    const trainer = await User.findById(trainerId);
    if (!student || !trainer) {
      const err = new Error("Student or trainer not found");
      err.status = 404;
      throw err;
    }
    if (trainer.role !== "trainer") {
      const err = new Error("Assigned user must be trainer");
      err.status = 400;
      throw err;
    }
    student.assignedTrainer = trainer._id;
    await student.save();
    res.json({ message: "Trainer assigned" });
  } catch (error) {
    next(error);
  }
};

export const analytics = async (_req, res, next) => {
  try {
    const [totalUsers, totalStudents, totalTrainers, totalSubmissions] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "trainer" }),
      Submission.countDocuments(),
    ]);
    res.json({ totalUsers, totalStudents, totalTrainers, totalSubmissions });
  } catch (error) {
    next(error);
  }
};
