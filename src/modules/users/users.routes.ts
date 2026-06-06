import { Router } from "express";
import { requireAuth } from "../../middleware/authMiddleware";
import { adminRoles, managerRoles, requireRoles } from "../../middleware/rbacMiddleware";
import { validateBody } from "../../middleware/validate";
import { assignLeadsSchema, createUserSchema, updateUserSchema } from "./users.validation";
import * as ctrl from "./users.controller";

const router = Router();

router.use(requireAuth);

router.get("/", requireRoles(...managerRoles), ctrl.list);
router.get("/:id/performance", requireRoles(...managerRoles), ctrl.performance);
router.get("/:id", requireRoles(...managerRoles), ctrl.getOne);
router.post("/", requireRoles(...adminRoles), validateBody(createUserSchema), ctrl.create);
router.patch("/:id", requireRoles(...adminRoles), validateBody(updateUserSchema), ctrl.update);
router.delete("/:id", requireRoles(...adminRoles), ctrl.remove);
router.post("/:id/assign-leads", requireRoles(...managerRoles), validateBody(assignLeadsSchema), ctrl.assignLeads);

export default router;
