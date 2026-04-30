import { Router } from "express";
import {
  analytics,
  assignTrainer,
  createUser,
  deleteUser,
  listUsers,
  updateUser,
} from "../controllers/admin.controller.js";
import { protect, restrictTo } from "../middleware/auth.middleware.js";

const router = Router();

router.use(protect, restrictTo("admin"));
router.get("/users", listUsers);
router.post("/users", createUser);
router.patch("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);
router.post("/assign-trainer", assignTrainer);
router.get("/analytics", analytics);

export default router;
