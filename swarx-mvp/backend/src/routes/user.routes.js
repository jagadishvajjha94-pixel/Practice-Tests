import { Router } from "express";
import { getAssignedStudents, me } from "../controllers/user.controller.js";
import { protect, restrictTo } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/me", protect, me);
router.get("/assigned-students", protect, restrictTo("trainer"), getAssignedStudents);

export default router;
