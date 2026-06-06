import cron from "node-cron";
import { LeadStatus } from "@prisma/client";
import { prisma } from "../config/db";
import { emitBroadcast } from "../config/socket";

const INACTIVE_DAYS = 30;

export function startCronJobs(): void {
  // Daily at 01:00 — mark leads inactive if no follow-up in 30 days
  cron.schedule("0 1 * * *", async () => {
    const cutoff = new Date(Date.now() - INACTIVE_DAYS * 86400000);
    const leads = await prisma.lead.findMany({
      where: {
        isActive: true,
        leadStatus: { notIn: [LeadStatus.WON, LeadStatus.LOST, LeadStatus.CLOSED] },
        OR: [{ lastContactDate: { lt: cutoff } }, { lastContactDate: null, createdAt: { lt: cutoff } }],
      },
      select: { id: true },
      take: 500,
    });
    if (leads.length) {
      await prisma.lead.updateMany({
        where: { id: { in: leads.map((l) => l.id) } },
        data: { isActive: false, leadStatus: LeadStatus.INACTIVE },
      });
      emitBroadcast("leads:auto-inactive", { count: leads.length });
    }
  });

  // Hourly — follow-up reminders for today
  cron.schedule("0 * * * *", async () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const due = await prisma.followup.findMany({
      where: { followupDate: { gte: start, lte: end }, followupStatus: "PENDING" },
      include: { lead: { select: { assignedToId: true, name: true } } },
      take: 100,
    });
    for (const f of due) {
      if (f.lead.assignedToId) {
        emitBroadcast("followup:reminder", {
          userId: f.lead.assignedToId,
          leadName: f.lead.name,
          followupId: f.id,
        });
      }
    }
  });
}
