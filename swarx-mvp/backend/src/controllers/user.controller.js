import User from "../models/User.js";

export const me = async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  res.json(user);
};

export const getAssignedStudents = async (req, res, next) => {
  try {
    const students = await User.find({ assignedTrainer: req.user._id, role: "student" }).select(
      "name email streakCount totalSubmissions totalScore"
    );
    res.json(students);
  } catch (error) {
    next(error);
  }
};
