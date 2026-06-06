import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../../middleware/authMiddleware";
import { managerRoles, requireRoles } from "../../middleware/rbacMiddleware";
import { validateBody, validateQuery } from "../../middleware/validate";
import {
  assignLeadBodySchema,
  bulkAssignSchema,
  changeStatusSchema,
  createLeadSchema,
  importIndiaMartSchema,
  leadListQuerySchema,
  toggleActiveSchema,
  updateLeadSchema,
} from "./leads.validation";
import * as ctrl from "./leads.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router();
router.use(requireAuth);

router.get("/", validateQuery(leadListQuerySchema), ctrl.list);
router.post("/", validateBody(createLeadSchema), ctrl.create);
router.post("/import-indiamart", validateBody(importIndiaMartSchema), ctrl.importIndiaMart);
router.post("/bulk-import", upload.single("file"), ctrl.bulkCsv);
router.get("/:id/timeline", ctrl.timeline);
router.get("/:id", ctrl.getOne);
router.patch("/:id", validateBody(updateLeadSchema), ctrl.update);
router.delete("/:id", requireRoles(...managerRoles), ctrl.remove);
router.post("/:id/assign", validateBody(assignLeadBodySchema), ctrl.assign);
router.post("/bulk-assign", validateBody(bulkAssignSchema), ctrl.bulkAssign);
router.post("/:id/status", validateBody(changeStatusSchema), ctrl.changeStatus);
router.post("/:id/active", validateBody(toggleActiveSchema), ctrl.toggleActive);
router.post("/:id/convert", ctrl.convert);

export default router;
