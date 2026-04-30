import Submission from "../models/Submission.js";
import Task from "../models/Task.js";
import User from "../models/User.js";
import { getUploadedFileUrl } from "../config/storage.js";
import { transcribeSpeech } from "../services/speech.service.js";
import { analyzeSpeakingText } from "../services/aiFeedback.service.js";
import { calculateNewStreak } from "../utils/streak.js";

const updateStudentProgress = async (student, score) => {
  const streakState = calculateNewStreak(student.lastSubmissionDate);
  if (streakState === "increment") student.streakCount += 1;
  if (streakState === 1) student.streakCount = 1;

  student.lastSubmissionDate = new Date();
  student.totalSubmissions += 1;
  student.totalScore += score;
  await student.save();
};

export const createSubmission = async (req, res, next) => {
  try {
    const { taskId } = req.body;
    if (!taskId) {
      const err = new Error("taskId required");
      err.status = 400;
      throw err;
    }
    const task = await Task.findById(taskId);
    if (!task) {
      const err = new Error("Task not found");
      err.status = 404;
      throw err;
    }

    const fileUrl = getUploadedFileUrl(req.file);
    const transcript = await transcribeSpeech(fileUrl);
    const aiFeedback = await analyzeSpeakingText(transcript);

    const submission = await Submission.create({
      userId: req.user._id,
      taskId,
      fileUrl,
      transcript,
      aiFeedback,
      finalScore: aiFeedback.overallScore,
    });

    const student = await User.findById(req.user._id);
    await updateStudentProgress(student, aiFeedback.overallScore);

    res.status(201).json(submission);
  } catch (error) {
    next(error);
  }
};

export const getSubmissions = async (req, res, next) => {
  try {
    const { role, _id } = req.user;
    let query = {};
    if (role === "student") query = { userId: _id };
    const submissions = await Submission.find(query)
      .sort({ createdAt: -1 })
      .populate("userId", "name email")
      .populate("taskId", "title");
    res.json(submissions);
  } catch (error) {
    next(error);
  }
};

export const getLeaderboard = async (_req, res, next) => {
  try {
    const students = await User.find({ role: "student" })
      .select("name totalScore totalSubmissions streakCount")
      .lean();

    const leaderboard = students
      .map((s) => ({
        ...s,
        averageScore: s.totalSubmissions > 0 ? Number((s.totalScore / s.totalSubmissions).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.averageScore - a.averageScore);

    res.json(leaderboard);
  } catch (error) {
    next(error);
  }
};
