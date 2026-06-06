import { Router } from "express";
import { requireAuth } from "../../middleware/authMiddleware";
import * as ctrl from "./notifications.controller";

const router = Router();
router.use(requireAuth);
router.get("/", ctrl.list);
router.post("/:id/read", ctrl.markRead);
export default router;
