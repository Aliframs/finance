import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();
    // if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(request.url);
    const fiscalYear = searchParams.get("fiscalYear") || "2025";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // Fetch all COAs for the fiscal year
    const coas = await prisma.masterCOA.findMany({
      where: { fiscalYear },
      include: {
        startingBalances: {
          where: { fiscalYear }
        }
      },
      orderBy: { accountNumber: 'asc' }
    });

    // Build queries
    const baseWhere: any = {
      coa: { fiscalYear },
      voucher: { status: "COMPLETED" },
    };

    // 1. Calculate mutations BEFORE startDate to adjust Starting Balance
    const pastMutationsWhere = { ...baseWhere };
    if (startDateParam) {
      pastMutationsWhere.date = { lt: new Date(startDateParam) };
    } else {
      // If no start date, there are no past mutations (assuming from beginning of year)
      // We'll set an impossible condition just to return empty, or skip it.
      pastMutationsWhere.date = { lt: new Date('1970-01-01') }; // effectively 0
    }

    const pastAggregations = await prisma.journal.groupBy({
      by: ['coaId'],
      where: startDateParam ? pastMutationsWhere : { id: 'skip' }, // Skip if no startDate
      _sum: { debit: true, credit: true }
    });

    const pastMap = pastAggregations.reduce((acc, curr) => {
      acc[curr.coaId] = {
        debit: curr._sum.debit || 0,
        credit: curr._sum.credit || 0
      };
      return acc;
    }, {} as Record<string, { debit: number; credit: number }>);

    // 2. Calculate mutations DURING the selected period
    const periodWhere = { ...baseWhere };
    if (startDateParam && endDateParam) {
      periodWhere.date = {
        gte: new Date(startDateParam),
        lte: new Date(endDateParam + 'T23:59:59.999Z')
      };
    } else if (startDateParam) {
      periodWhere.date = { gte: new Date(startDateParam) };
    } else if (endDateParam) {
      periodWhere.date = { lte: new Date(endDateParam + 'T23:59:59.999Z') };
    }

    const periodAggregations = await prisma.journal.groupBy({
      by: ['coaId'],
      where: periodWhere,
      _sum: { debit: true, credit: true }
    });

    const periodMap = periodAggregations.reduce((acc, curr) => {
      acc[curr.coaId] = {
        debit: curr._sum.debit || 0,
        credit: curr._sum.credit || 0
      };
      return acc;
    }, {} as Record<string, { debit: number; credit: number }>);

    // Build Trial Balance Data
    const trialBalanceData = coas.map(coa => {
      const jan1Balance = coa.startingBalances.length > 0 ? coa.startingBalances[0].amount : 0;
      
      let adjustedJan1 = jan1Balance;
      if (coa.normalBalance === 'CREDIT') {
        adjustedJan1 = -jan1Balance;
      }

      // Add past mutations to get the Starting Balance for this period
      const pastMut = pastMap[coa.id] || { debit: 0, credit: 0 };
      const periodStartBalance = adjustedJan1 + pastMut.debit - pastMut.credit;

      // Period mutations
      const periodMut = periodMap[coa.id] || { debit: 0, credit: 0 };
      
      // Ending balance for this period
      const endingBalance = periodStartBalance + periodMut.debit - periodMut.credit;

      return {
        id: coa.id,
        accountNumber: coa.accountNumber,
        accountName: coa.accountName,
        category: coa.category || "Uncategorized",
        normalBalance: coa.normalBalance,
        startingBalance: periodStartBalance,
        debit: periodMut.debit,
        credit: periodMut.credit,
        endingBalance
      };
    });

    return NextResponse.json(trialBalanceData);

  } catch (error) {
    console.error("[TRIAL_BALANCE_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
