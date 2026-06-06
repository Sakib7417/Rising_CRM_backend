import { Router } from "express";
import { requireAuth } from "../../middleware/authMiddleware";
import { validateBody } from "../../middleware/validate";
import { createTaskSchema, updateTaskSchema } from "./tasks.validation";
import * as ctrl from "./tasks.controller";

const router = Router();
router.use(requireAuth);
router.get("/", ctrl.list);
router.post("/", validateBody(createTaskSchema), ctrl.create);
router.patch("/:id", validateBody(updateTaskSchema), ctrl.update);
router.delete("/:id", ctrl.remove);
export default router;
