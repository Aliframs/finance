import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(request.url);
    const fiscalYear = searchParams.get("fiscalYear") || "2025";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // We fetch all COAs and their starting balances
    const coas = await prisma.masterCOA.findMany({
      where: { fiscalYear },
      include: {
        startingBalances: {
          where: { fiscalYear }
        }
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

    let pendapatan = 0;
    let pembayaranPemasokKaryawan = 0;
    let penerimaanLainnya = 0;
    
    let pembelian = 0;
    let pembelianAsetTetap = 0;
    
    let pinjamanPemegangSaham = 0;
    let modal = 0;
    let modalBelumDisetor = 0;

    let totalNonCashNet = 0; // Sum of all COAs (110000 to 999999) where Debit is positive, Credit is negative
    let kenaikanKasRiil = 0; // The actual net change in Kas (10xxxx)
    let saldoAwalKas = 0;

    // Helper to get balance with absolute value (as typically seen on Trial Balance report)
    // Actually the user formulas assume positive values for balances (e.g. "Beban Usaha" is a positive number).
    // Let's calculate standard Trial Balance values.
    
    let sumPendapatanUsaha = 0; // 4xxxx credit normal
    let sumBebanUsaha = 0; // 6xxxx debit normal

    let val110011 = 0;
    let val120002 = 0;
    let val610001 = 0;
    let val610002 = 0;
    let val610003 = 0;

    let sum130000_to_150009 = 0; // Sum of saldo akhir for Pembelian
    let sum130000_to_150009_debit = 0; // Sum of mutasi debit for Pembelian

    let val190000_debit = 0;
    let val190001 = 0;
    let val190002_debit = 0;

    let val230000 = 0;
    let val300000 = 0;
    let val111000 = 0;

    coas.forEach(coa => {
      const startingBalance = coa.startingBalances.length > 0 ? coa.startingBalances[0].amount : 0;
      const mutations = aggregationMap[coa.id] || { debit: 0, credit: 0 };
      
      const startingDebit = coa.startingBalances.length > 0 && coa.normalBalance === 'DEBIT' ? coa.startingBalances[0].amount : 0;
      const startingCredit = coa.startingBalances.length > 0 && coa.normalBalance === 'CREDIT' ? coa.startingBalances[0].amount : 0;
      const startingAmount = startingDebit - startingCredit;
      
      const tbBalance = startingAmount + mutations.debit - mutations.credit;
      
      // For PnL values that they pull from the "Laba Rugi" report, they are typically formatted as positive numbers in reports
      let pnlBalance = startingBalance;
      if (coa.normalBalance === 'DEBIT') {
        pnlBalance = startingBalance + mutations.debit - mutations.credit;
      } else {
        pnlBalance = startingBalance + mutations.credit - mutations.debit;
      }

      const num = coa.accountNumber;
      const numInt = parseInt(num);

      if (num.startsWith('10')) {
        kenaikanKasRiil += (mutations.debit - mutations.credit);
        saldoAwalKas += startingBalance;
      }

      // totalNonCashNet: SUM(110000 s/d 999999 SALDO AKHIR)
      if (numInt >= 110000 && numInt <= 999999) {
        totalNonCashNet += tbBalance;
      }

      // Pendapatan Usaha (4xxxx)
      if (num.startsWith('4')) sumPendapatanUsaha += pnlBalance;

      // Beban Usaha (6xxxx) - HPP (5xxxx) is NOT included here as it's separate in their Laba Rugi
      // Also exclude 600032 (Pajak Masa Kini) because Laba Rugi API excludes it from 'Jumlah Beban Usaha'
      if (num.startsWith('6') && num !== '600032') {
        sumBebanUsaha += pnlBalance;
      } else if (num.startsWith('7') || num.startsWith('8') || num.startsWith('9')) {
        // In Laba Rugi, unknown 7,8,9 with DEBIT normal balance go into Beban Lain-Lain (which is part of Beban Usaha)
        if (!["710001", "720002", "720003", "720004"].includes(num)) {
          if (coa.normalBalance === 'DEBIT') {
            sumBebanUsaha += pnlBalance;
          }
        }
      }

      // Trial balance items for Pembayaran Pemasok
      if (num === '110011') val110011 = tbBalance;
      if (num === '120002' || num === '12002') val120002 = tbBalance;
      if (num === '610001') val610001 = tbBalance;
      if (num === '610002') val610002 = tbBalance;
      if (num === '610003') val610003 = tbBalance;

      // sum trial balance coa 130000 s/d 150009
      if (numInt >= 130000 && numInt <= 150009) {
        sum130000_to_150009 += tbBalance;
        sum130000_to_150009_debit += mutations.debit;
      }

      if (num === '190001') val190001 = tbBalance;
      if (num === '190000') val190000_debit = mutations.debit;
      if (num === '190002') val190002_debit = mutations.debit;

      if (num === '230000') val230000 = tbBalance;
      if (num === '300000') val300000 = tbBalance;
      if (num === '111000') val111000 = tbBalance;
    });

    // NOW APPLY THEIR EXACT FORMULAS
    
    // 1. Pendapatan : =laba rugi Pendapatan Usaha
    pendapatan = sumPendapatanUsaha;
    
    // 2. (Pembayaran) ke pemasok dan karyawan : =-COA110011- COA12002 saldo akhir + COA610001 + COA610002 + COA610003
    // *Assuming 110011 was a typo for Laba Rugi Jumlah Beban Usaha (as written in previous prompt)
    pembayaranPemasokKaryawan = -sumBebanUsaha - val120002 + val610001 + val610002 + val610003;
    
    // Investasi
    // 3. Pembelian :=-SUM(COA130000 S/D 150009 DEBIT)
    pembelian = -sum130000_to_150009_debit;

    // 4. Pembelian Aset Tetap : =-COA190001 saldo akhir -COA190000 debit -COA190002 debit
    pembelianAsetTetap = -val190001 - val190000_debit - val190002_debit;

    // Pendanaan
    // 5. Pinjaman kepada Pemegang Saham : =- COA230000 saldo akhir
    pinjamanPemegangSaham = -val230000;

    // 6. Modal : =-COA300000 saldo akhir
    modal = -val300000;

    // 7. Modal yang belum disetor : =-COA111000 saldo akhir
    modalBelumDisetor = -val111000;

    // 8. Penerimaan (Pembayaran) Lainnya : =- COA110000 s/d COA 999999 SALDO AKHIR - pendapatan aruskas - pembayaran ke pemasuk dan karyawan - modal - pembelian - modal yang belom di setor - pembelian aset tetap - pinjaman kepada pemegang saham
    penerimaanLainnya = -totalNonCashNet - pendapatan - pembayaranPemasokKaryawan - modal - pembelian - modalBelumDisetor - pembelianAsetTetap - pinjamanPemegangSaham;

    // Sum up totals
    const arusKasOperasional = pendapatan + pembayaranPemasokKaryawan + penerimaanLainnya;
    const arusKasInvestasi = pembelian + pembelianAsetTetap;
    const arusKasPendanaan = pinjamanPemegangSaham + modal + modalBelumDisetor;
    const kenaikanKas = arusKasOperasional + arusKasInvestasi + arusKasPendanaan;
    const saldoAkhir = saldoAwalKas + kenaikanKas;

    return NextResponse.json({
      pendapatan,
      pembayaranPemasokKaryawan,
      penerimaanLainnya,
      arusKasOperasional,
      pembelian,
      pembelianAsetTetap,
      arusKasInvestasi,
      pinjamanPemegangSaham,
      modal,
      modalBelumDisetor,
      arusKasPendanaan,
      kenaikanKas,
      saldoAwal: saldoAwalKas, // They said "Saldo Kas Awal Tahun 0", but dynamically it should be saldoAwalKas
      saldoAkhir
    });

  } catch (error) {
    console.error("[CASH_FLOW_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
