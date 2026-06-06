import { Router } from "express";
import { requireAuth } from "../../middleware/authMiddleware";
import { validateBody } from "../../middleware/validate";
import { createDealSchema, updateDealSchema } from "./deals.validation";
import * as ctrl from "./deals.controller";

const router = Router();
router.use(requireAuth);
router.get("/", ctrl.list);
router.get("/pipeline", ctrl.pipeline);
router.get("/analytics", ctrl.analytics);
router.post("/", validateBody(createDealSchema), ctrl.create);
router.patch("/:id", validateBody(updateDealSchema), ctrl.update);
export default router;
