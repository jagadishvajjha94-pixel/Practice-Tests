import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
    fileUrl: { type: String, required: true },
    transcript: { type: String, default: "" },
    aiFeedback: {
      grammarSuggestions: [{ type: String }],
      vocabularyImprovements: [{ type: String }],
      confidenceTips: [{ type: String }],
      overallScore: { type: Number, default: 0 },
    },
    trainerFeedbackId: { type: mongoose.Schema.Types.ObjectId, ref: "Feedback", default: null },
    finalScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Submission", submissionSchema);
