import Task from "../models/Task.js";
import User from "../models/User.js";

export const createTask = async (req, res, next) => {
  try {
    const { title, description, assignedTo = [], dueDate, isDaily = true } = req.body;
    const task = await Task.create({
      title,
      description,
      assignedTo,
      dueDate,
      isDaily,
      createdBy: req.user._id,
    });
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
};

export const getTasks = async (req, res, next) => {
  try {
    const { role, _id } = req.user;
    let query = {};
    if (role === "student") query = { assignedTo: _id };
    if (role === "trainer") {
      const students = await User.find({ assignedTrainer: _id }).select("_id");
      query = { assignedTo: { $in: students.map((s) => s._id) } };
    }
    const tasks = await Task.find(query).sort({ createdAt: -1 }).populate("createdBy", "name role");
    res.json(tasks);
  } catch (error) {
    next(error);
  }
};
