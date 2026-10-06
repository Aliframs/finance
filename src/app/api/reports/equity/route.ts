import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { GET as getProfitLoss } from "../profit-loss/route";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(request.url);
    const fiscalYear = searchParams.get("fiscalYear") || "2025";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // 1. Get Net Income by calling the Profit-Loss API
    const plResponse = await getProfitLoss(request);
    if (!plResponse.ok) {
        return new NextResponse("Failed to calculate Profit Loss", { status: plResponse.status });
    }
    const plData = await plResponse.json();
    const netIncome = plData.netIncome || 0;

    // 2. Fetch Equity COAs (3xxxx)
    const coas = await prisma.masterCOA.findMany({
      where: { 
        fiscalYear,
        accountNumber: { startsWith: '3' }
      },
      orderBy: { accountNumber: 'asc' }
    });

    const journalWhere: any = {
      coa: { fiscalYear },
      voucher: { status: "COMPLETED" },
    };

    if (startDateParam && endDateParam) {
      journalWhere.date = {
        gte: new Date(startDateParam),
        lte: new Date(endDateParam + 'T23:59:59.999Z')
      };
    } else if (startDateParam) {
      journalWhere.date = { gte: new Date(startDateParam) };
    } else if (endDateParam) {
      journalWhere.date = { lte: new Date(endDateParam + 'T23:59:59.999Z') };
    }

    const aggregations = await prisma.journal.groupBy({
      by: ['coaId'],
      where: journalWhere,
      _sum: {
        debit: true,
        credit: true
      }
    });

    const aggregationMap = aggregations.reduce((acc, curr) => {
      acc[curr.coaId] = {
        debit: curr._sum.debit || 0,
        credit: curr._sum.credit || 0
      };
      return acc;
    }, {} as Record<string, { debit: number; credit: number }>);

    let saldoAwalModalSaham = 0;
    let setoranModal = 0;
    let saldoAwalTidakDitentukan = 0;
    let saldoAwalDitentukan = 0;
    let saldoAwalOCI = 0;

    // --- Calculate Opening Balances if fiscalYear is 2026 (from 2025) ---
    if (fiscalYear === '2026') {
        // [USER REQUEST] Sementara dikosongkan dulu untuk Saldo 1 Januari 2026
        // 1. Get 2025 Net Income
        /*
        const prevUrl = new URL(request.url);
        prevUrl.searchParams.set('fiscalYear', '2025');
        const prevRequest = new Request(prevUrl.toString(), { headers: request.headers });
        const prevPlRes = await getProfitLoss(prevRequest);
        if (prevPlRes.ok) {
            const prevPlData = await prevPlRes.json();
            saldoAwalTidakDitentukan += (prevPlData.netIncome || 0);
        }

        // 2. Get 2025 COA Mutations
        const prevAggregations = await prisma.journal.groupBy({
            by: ['coaId'],
            where: { coa: { fiscalYear: '2025' }, voucher: { status: 'COMPLETED' } },
            _sum: { debit: true, credit: true }
        });
        
        // We need to map coaId to accountNumber to know which one is Modal
        const prevCoas = await prisma.masterCOA.findMany({
            where: { fiscalYear: '2025', accountNumber: { startsWith: '3' } }
        });

        const prevMap = prevAggregations.reduce((acc, curr) => {
            acc[curr.coaId] = { debit: curr._sum.debit || 0, credit: curr._sum.credit || 0 };
            return acc;
        }, {} as Record<string, { debit: number; credit: number }>);

        prevCoas.forEach(c => {
            const m = prevMap[c.id] || { debit: 0, credit: 0 };
            const mutVal = m.credit - m.debit;
            if (c.accountNumber === '300000') saldoAwalModalSaham += mutVal;
            if (c.accountNumber === '310000') saldoAwalTidakDitentukan += mutVal;
        });
        */
    }
    // --------------------------------------------------------------------

    coas.forEach(coa => {
      const num = coa.accountNumber;
      const mutasi = aggregationMap[coa.id] || { debit: 0, credit: 0 };
      const mutationValue = mutasi.credit - mutasi.debit;

      if (num === '300000') {
        setoranModal += mutationValue;
      }
    });

    const responseData = {
        rows: [
            {
                label: `Saldo 1 Januari ${fiscalYear}`,
                modalSaham: saldoAwalModalSaham,
                oci: saldoAwalOCI,
                ditentukan: saldoAwalDitentukan,
                tidakDitentukan: saldoAwalTidakDitentukan,
                isTotal: false,
            },
            {
                label: 'Setoran Modal',
                modalSaham: setoranModal,
                oci: 0,
                ditentukan: 0,
                tidakDitentukan: 0,
                isTotal: false,
            },
            {
                label: 'Laba (Rugi) Tahun Berjalan',
                modalSaham: 0,
                oci: 0,
                ditentukan: 0,
                tidakDitentukan: netIncome,
                isTotal: false,
            },
            {
                label: 'Laba (Rugi) Komprehensif Lainnya',
                modalSaham: 0,
                oci: 0,
                ditentukan: 0,
                tidakDitentukan: 0,
                isTotal: false,
            },
            {
                label: `Saldo per 31 Desember ${fiscalYear}`,
                modalSaham: saldoAwalModalSaham + setoranModal,
                oci: saldoAwalOCI,
                ditentukan: saldoAwalDitentukan,
                tidakDitentukan: saldoAwalTidakDitentukan + netIncome,
                isTotal: true,
            }
        ]
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("[EQUITY_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
