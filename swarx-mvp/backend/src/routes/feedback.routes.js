import { Router } from "express";
import { createFeedback, getFeedbackBySubmission } from "../controllers/feedback.controller.js";
import { protect, restrictTo } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", protect, restrictTo("trainer", "admin"), createFeedback);
router.get("/:submissionId", protect, getFeedbackBySubmission);

export default router;
