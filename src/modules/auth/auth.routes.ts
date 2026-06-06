import { Router } from "express";
import {
  changePasswordHandler,
  forgotPasswordHandler,
  login,
  logout,
  me,
  refresh,
  registerPublic,
  registerStaff,
  resetPasswordHandler,
} from "./auth.controller";
import { validateBody } from "../../middleware/validate";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerPublicSchema,
  registerStaffSchema,
  resetPasswordSchema,
} from "./auth.validation";
import { requireAuth } from "../../middleware/authMiddleware";
import { adminRoles, requireRoles } from "../../middleware/rbacMiddleware";
import { authLimiter } from "../../middleware/rateLimiter";

const router = Router();

router.post("/register", authLimiter, validateBody(registerPublicSchema), registerPublic);
router.post(
  "/register-staff",
  authLimiter,
  requireAuth,
  requireRoles(...adminRoles),
  validateBody(registerStaffSchema),
  registerStaff,
);
router.post("/login", authLimiter, validateBody(loginSchema), login);
router.post("/refresh", authLimiter, validateBody(refreshSchema), refresh);
router.post("/logout", requireAuth, validateBody(logoutSchema), logout);
router.get("/me", requireAuth, me);
router.post("/change-password", requireAuth, validateBody(changePasswordSchema), changePasswordHandler);
router.post("/forgot-password", authLimiter, validateBody(forgotPasswordSchema), forgotPasswordHandler);
router.post("/reset-password", authLimiter, validateBody(resetPasswordSchema), resetPasswordHandler);

export default router;
