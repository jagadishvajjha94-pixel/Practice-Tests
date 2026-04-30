import { Router } from "express";
import { createSubmission, getLeaderboard, getSubmissions } from "../controllers/submission.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { upload } from "../config/storage.js";

const router = Router();

router.get("/", protect, getSubmissions);
router.get("/leaderboard", protect, getLeaderboard);
router.post("/", protect, upload.single("media"), createSubmission);

export default router;
