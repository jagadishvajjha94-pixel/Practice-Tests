import Feedback from "../models/Feedback.js";
import Submission from "../models/Submission.js";

export const createFeedback = async (req, res, next) => {
  try {
    const { submissionId, comments, score } = req.body;
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      const err = new Error("Submission not found");
      err.status = 404;
      throw err;
    }

    const feedback = await Feedback.create({
      submissionId,
      trainerId: req.user._id,
      comments,
      score,
    });

    submission.trainerFeedbackId = feedback._id;
    submission.finalScore = Number(((submission.aiFeedback.overallScore + score) / 2).toFixed(2));
    await submission.save();

    res.status(201).json(feedback);
  } catch (error) {
    next(error);
  }
};

export const getFeedbackBySubmission = async (req, res, next) => {
  try {
    const feedback = await Feedback.find({ submissionId: req.params.submissionId })
      .populate("trainerId", "name email")
      .sort({ createdAt: -1 });
    res.json(feedback);
  } catch (error) {
    next(error);
  }
};
