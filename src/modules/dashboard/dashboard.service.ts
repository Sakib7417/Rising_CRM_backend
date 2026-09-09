import { DealStage, FollowupStatus, LeadStatus, TaskStatus } from "@prisma/client";
import { prisma } from "../../config/db";

export async function getDashboardStats(userId?: string, role?: string) {
  const leadWhere =
    role === "SALES_AGENT" || role === "EMPLOYEE" ? { assignedToId: userId } : undefined;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

  const [
    totalLeads,
    activeLeads,
    inactiveLeads,
    todayFollowups,
    pendingTasks,
    wonDeals,
    lostDeals,
    monthlyRevenueAgg,
    recentLeads,
    recentActivities,
    upcomingFollowups,
  ] = await Promise.all([
    prisma.lead.count({ where: leadWhere }),
    prisma.lead.count({
      where: {
        ...leadWhere,
        isActive: true,
        leadStatus: { notIn: [LeadStatus.WON, LeadStatus.LOST, LeadStatus.CLOSED, LeadStatus.INACTIVE] },
      },
    }),
    prisma.lead.count({ where: { ...leadWhere, isActive: false } }),
    prisma.followup.count({
      where: {
        followupStatus: FollowupStatus.PENDING,
        followupDate: { gte: todayStart, lte: todayEnd },
        lead: leadWhere ? { assignedToId: userId } : undefined,
      },
    }),
    prisma.task.count({ where: { ...leadWhere, status: TaskStatus.PENDING } }),
    prisma.deal.count({ where: { ...leadWhere, stage: DealStage.WON } }),
    prisma.deal.count({ where: { ...leadWhere, stage: DealStage.LOST } }),
    prisma.deal.aggregate({
      _sum: { amount: true },
      where: {
        ...leadWhere,
        stage: DealStage.WON,
        updatedAt: { gte: monthStart, lte: todayEnd },
      },
    }),
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
    prisma.followup.findMany({
      where: {
        followupStatus: FollowupStatus.PENDING,
        followupDate: { gte: todayStart },
        lead: leadWhere ? { assignedToId: userId } : undefined,
      },
      orderBy: { followupDate: "asc" },
      take: 5,
      include: { lead: { select: { id: true, name: true, companyName: true, phone: true, email: true } } },
    }),
  ]);

  const monthlyRevenue = Number(monthlyRevenueAgg._sum.amount ?? 0);
  const conversionRate = totalLeads ? Math.round((wonDeals / totalLeads) * 100) : 0;

  return {
    totalLeads,
    activeLeads,
    inactiveLeads,
    todayFollowups,
    pendingTasks,
    wonDeals,
    lostDeals,
    monthlyRevenue,
    conversionRate,
    recentLeads,
    recentActivities,
    upcomingFollowups,
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
