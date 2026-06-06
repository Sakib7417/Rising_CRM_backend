import { Router } from "express";
import { requireAuth } from "../../middleware/authMiddleware";
import { validateBody } from "../../middleware/validate";
import { createNoteSchema } from "./notes.validation";
import * as ctrl from "./notes.controller";

const router = Router();
router.use(requireAuth);
router.post("/", validateBody(createNoteSchema), ctrl.create);
router.get("/lead/:leadId", ctrl.list);
export default router;
