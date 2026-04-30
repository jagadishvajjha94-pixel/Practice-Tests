import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["student", "trainer", "admin"],
      default: "student",
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    assignedTrainer: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    assignedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    streakCount: { type: Number, default: 0 },
    lastSubmissionDate: { type: Date, default: null },
    totalScore: { type: Number, default: 0 },
    totalSubmissions: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
