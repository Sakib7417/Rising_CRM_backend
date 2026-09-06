import { DealStage, FollowupStatus, LeadStatus } from "@prisma/client";
import { prisma } from "../../config/db";

export async function getDashboardStats(userId?: string, role?: string) {
  const leadWhere =
    role === "SALES_AGENT" || role === "EMPLOYEE" ? { assignedToId: userId } : undefined;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - todayStart.getDay());

  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

  const now = new Date();
  const upcomingEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    totalLeads,
    todaysLeads,
    thisWeekLeads,
    thisMonthLeads,
    followupsToday,
    upcomingFollowups,
    missedFollowups,
    wonLeads,
    lostLeads,
    newLeads,
    recentLeads,
    recentActivities,
  ] = await Promise.all([
    prisma.lead.count({ where: leadWhere }),
    prisma.lead.count({ where: { ...leadWhere, createdAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.lead.count({ where: { ...leadWhere, createdAt: { gte: weekStart, lte: todayEnd } } }),
    prisma.lead.count({ where: { ...leadWhere, createdAt: { gte: monthStart, lte: todayEnd } } }),
    prisma.followup.count({
      where: {
        followupStatus: FollowupStatus.PENDING,
        followupDate: { gte: todayStart, lte: todayEnd },
        lead: leadWhere ? { assignedToId: userId } : undefined,
      },
    }),
    prisma.followup.count({
      where: {
        followupStatus: FollowupStatus.PENDING,
        followupDate: { gte: now, lte: upcomingEnd },
        lead: leadWhere ? { assignedToId: userId } : undefined,
      },
    }),
    prisma.followup.count({
      where: {
        followupStatus: FollowupStatus.PENDING,
        followupDate: { lt: now },
        lead: leadWhere ? { assignedToId: userId } : undefined,
      },
    }),
    prisma.lead.count({ where: { ...leadWhere, leadStatus: LeadStatus.WON } }),
    prisma.lead.count({ where: { ...leadWhere, leadStatus: LeadStatus.LOST } }),
    prisma.lead.count({ where: { ...leadWhere, leadStatus: LeadStatus.NEW } }),
    prisma.lead.findMany({
      where: leadWhere,
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { createdBy: { select: { id: true, name: true } } },
    }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  return {
    totalLeads,
    todaysLeads,
    thisWeekLeads,
    thisMonthLeads,
    followupsToday,
    upcomingFollowups,
    missedFollowups,
    wonLeads,
    lostLeads,
    newLeads,
    recentLeads,
    recentActivities,
  };
}

export async function salesAnalytics() {
  const bySource = await prisma.lead.groupBy({
    by: ["leadSource"],
    _count: true,
  });
  const byStatus = await prisma.lead.groupBy({
    by: ["leadStatus"],
    _count: true,
  });
  const revenueByMonth = await prisma.$queryRaw<
    { month: string; revenue: string }[]
  >`SELECT to_char("updatedAt", 'YYYY-MM') as month, SUM(amount)::text as revenue FROM "Deal" WHERE stage = 'WON' GROUP BY 1 ORDER BY 1 DESC LIMIT 12`;
  return { bySource, byStatus, revenueByMonth };
}
