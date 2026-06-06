import { Router } from "express";
import { requireAuth } from "../../middleware/authMiddleware";
import { validateBody } from "../../middleware/validate";
import { createQuotationSchema } from "./quotations.validation";
import * as ctrl from "./quotations.controller";

const router = Router();
router.use(requireAuth);
router.get("/", ctrl.list);
router.post("/", validateBody(createQuotationSchema), ctrl.create);
router.post("/:id/generate-pdf", ctrl.generatePdf);
router.get("/:id/download", ctrl.download);
router.post("/:id/send", ctrl.send);
export default router;
