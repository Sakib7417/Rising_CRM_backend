import { Router } from "express";
import { requireAuth } from "../../middleware/authMiddleware";
import { validateBody } from "../../middleware/validate";
import { createInvoiceSchema, updateInvoiceSchema, addPaymentSchema } from "./invoices.validation";
import * as ctrl from "./invoices.controller";

const router = Router();
router.use(requireAuth);
router.get("/", ctrl.list);
router.post("/", validateBody(createInvoiceSchema), ctrl.create);
router.get("/:id", ctrl.get);
router.patch("/:id", validateBody(updateInvoiceSchema), ctrl.update);
router.delete("/:id", ctrl.remove);
router.post("/:id/payments", validateBody(addPaymentSchema), ctrl.addPayment);
export default router;
