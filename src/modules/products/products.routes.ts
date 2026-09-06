import { Router } from "express";
import { requireAuth } from "../../middleware/authMiddleware";
import { validateBody } from "../../middleware/validate";
import { createProductSchema, updateProductSchema } from "./products.validation";
import * as ctrl from "./products.controller";

const router = Router();
router.use(requireAuth);
router.get("/", ctrl.list);
router.post("/", validateBody(createProductSchema), ctrl.create);
router.get("/:id", ctrl.get);
router.patch("/:id", validateBody(updateProductSchema), ctrl.update);
router.delete("/:id", ctrl.remove);
export default router;
