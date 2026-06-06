import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/authMiddleware";
import { validateBody } from "../../middleware/validate";
import { createCustomerSchema } from "./customers.validation";
import * as ctrl from "./customers.controller";

const router = Router();
router.use(requireAuth);
router.get("/", ctrl.list);
router.get("/:id", ctrl.getOne);
router.post("/", validateBody(createCustomerSchema), ctrl.create);
router.post("/:id/notes", validateBody(z.object({ note: z.string().min(1) })), ctrl.addNote);
export default router;
