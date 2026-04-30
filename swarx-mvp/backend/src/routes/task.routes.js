import { Router } from "express";
import { createTask, getTasks } from "../controllers/task.controller.js";
import { protect, restrictTo } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", protect, getTasks);
router.post("/", protect, restrictTo("trainer", "admin"), createTask);

export default router;
