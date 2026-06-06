import { Router } from "express";
import { requireAuth } from "../../middleware/authMiddleware";
import * as ctrl from "./dashboard.controller";

const router = Router();
router.use(requireAuth);
router.get("/", ctrl.overview);
router.get("/analytics", ctrl.analytics);
export default router;
