import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import usersRoutes from "../modules/users/users.routes";
import leadsRoutes from "../modules/leads/leads.routes";
import followupsRoutes from "../modules/followups/followups.routes";
import notesRoutes from "../modules/notes/notes.routes";
import customersRoutes from "../modules/customers/customers.routes";
import dealsRoutes from "../modules/deals/deals.routes";
import quotationsRoutes from "../modules/quotations/quotations.routes";
import tasksRoutes from "../modules/tasks/tasks.routes";
import dashboardRoutes from "../modules/dashboard/dashboard.routes";
import reportsRoutes from "../modules/reports/reports.routes";
import activitiesRoutes from "../modules/activities/activities.routes";
import notificationsRoutes from "../modules/notifications/notifications.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/leads", leadsRoutes);
router.use("/followups", followupsRoutes);
router.use("/notes", notesRoutes);
router.use("/customers", customersRoutes);
router.use("/deals", dealsRoutes);
router.use("/quotations", quotationsRoutes);
router.use("/tasks", tasksRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/reports", reportsRoutes);
router.use("/activities", activitiesRoutes);
router.use("/notifications", notificationsRoutes);

export default router;
