import { Router } from "express";
import { requireAuth } from "../../middleware/authMiddleware";
import { validateBody, validateQuery } from "../../middleware/validate";
import { createFollowupSchema, followupQuerySchema, updateFollowupSchema } from "./followups.validation";
import * as ctrl from "./followups.controller";

const router = Router();
router.use(requireAuth);

router.post("/", validateBody(createFollowupSchema), ctrl.create);
router.patch("/:id", validateBody(updateFollowupSchema), ctrl.update);
router.delete("/:id", ctrl.remove);
router.get("/lead/:leadId", ctrl.history);
router.get("/daily", validateQuery(followupQuerySchema.partial()), ctrl.daily);
router.get("/missed", ctrl.missed);
router.get("/upcoming", validateQuery(followupQuerySchema.partial()), ctrl.upcoming);

export default router;
