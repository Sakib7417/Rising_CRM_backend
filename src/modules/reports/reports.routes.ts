import { Router } from "express";
import { requireAuth } from "../../middleware/authMiddleware";
import { managerRoles, requireRoles } from "../../middleware/rbacMiddleware";
import * as ctrl from "./reports.controller";

const router = Router();
router.use(requireAuth, requireRoles(...managerRoles));
router.get("/:type/excel", ctrl.excel);
router.get("/:type/pdf", ctrl.pdf);
export default router;
