import { Router } from "express";
import { requireAuth } from "../../middleware/authMiddleware";
import { managerRoles, requireRoles } from "../../middleware/rbacMiddleware";
import * as ctrl from "./activities.controller";

const router = Router();
router.use(requireAuth, requireRoles(...managerRoles));
router.get("/", ctrl.list);
export default router;
