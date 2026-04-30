import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    submissionId: { type: mongoose.Schema.Types.ObjectId, ref: "Submission", required: true },
    trainerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    comments: { type: String, required: true },
    score: { type: Number, min: 1, max: 10, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Feedback", feedbackSchema);
