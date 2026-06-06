import { DealStage, FollowupStatus } from "@prisma/client";
import { prisma } from "../../config/db";

export async function getDashboardStats(userId?: string, role?: string) {
  const leadWhere =
    role === "SALES_AGENT" || role === "EMPLOYEE" ? { assignedToId: userId } : undefined;
  const dealWhere =
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
    convertedLeads,
    wonDeals,
    lostDeals,
    pendingFollowups,
    todaysFollowups,
    monthlyRevenue,
    recentActivities,
  ] = await Promise.all([
    prisma.lead.count({ where: leadWhere }),
    prisma.lead.count({ where: { ...leadWhere, isActive: true } }),
    prisma.lead.count({ where: { ...leadWhere, isActive: false } }),
    prisma.lead.count({ where: { ...leadWhere, convertedAt: { not: null } } }),
    prisma.deal.count({ where: { ...dealWhere, stage: DealStage.WON } }),
    prisma.deal.count({ where: { ...dealWhere, stage: DealStage.LOST } }),
    prisma.followup.count({
      where: {
        followupStatus: FollowupStatus.PENDING,
        lead: leadWhere ? { assignedToId: userId } : undefined,
      },
    }),
    prisma.followup.count({
      where: {
        followupDate: { gte: todayStart, lte: todayEnd },
        lead: leadWhere ? { assignedToId: userId } : undefined,
      },
    }),
    prisma.deal.aggregate({
      where: {
        ...dealWhere,
        stage: DealStage.WON,
        updatedAt: { gte: monthStart },
      },
      _sum: { amount: true },
    }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  const totalForRate = totalLeads || 1;
  const conversionRate = Math.round((convertedLeads / totalForRate) * 10000) / 100;

  const employeePerformance = await prisma.user.findMany({
    where: { isActive: true, role: { in: ["SALES_AGENT", "SALES_MANAGER", "EMPLOYEE"] } },
    select: {
      id: true,
      name: true,
      email: true,
      targetAmount: true,
      achievedAmount: true,
      _count: { select: { leadsAssigned: true, dealsAssigned: true } },
    },
    take: 20,
  });

  return {
    totalLeads,
    activeLeads,
    inactiveLeads,
    convertedLeads,
    wonDeals,
    lostDeals,
    pendingFollowups,
    todaysFollowups,
    monthlyRevenue: monthlyRevenue._sum.amount?.toString() ?? "0",
    conversionRate,
    employeePerformance,
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
