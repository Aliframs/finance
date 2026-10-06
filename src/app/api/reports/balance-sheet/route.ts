import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(request.url);
    const fiscalYear = searchParams.get("fiscalYear") || "2025";
    const endDateParam = searchParams.get("endDate");
    const asOfDateParam = endDateParam || searchParams.get("asOfDate");

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

    if (asOfDateParam) {
      journalWhere.date = { lte: new Date(asOfDateParam + 'T23:59:59.999Z') };
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

    // Common
    let currentYearEarnings = 0;

    // Rollup buckets for 2025
    let aKasBank = 0;
    let aPiutangUsaha = 0;
    let aUangMuka = 0;
    let aPajakDibayarDimuka = 0;
    let aBiayaDibayarDimuka = 0;
    let aPiutangLainLain = 0;
    let aPiutangPesananSaham = 0;
    let aAktivaTetap = 0;
    let aAkumulasiPenyusutan = 0;

    let lUtangUsaha = 0;
    let lUangMukaPenjualan = 0;
    let lHutangPajak = 0;
    let lHutangLainLain = 0;
    let lHutangPemegangSaham = 0;

    let eModalSaham = 0;

    // Rollup buckets for 2026
    let aKasBank26 = 0;
    let aPiutangUsaha26 = 0;
    let aPiutangPajak26 = 0; // 112xxx
    let aUangMuka26 = 0; // 12-15
    let aPajakDibayarDimuka26 = 0; // 17
    let aBiayaDibayarDimuka26 = 0; // 16
    let aPiutangLainLain26 = 0; // 181
    let aPinjamanKaryawan26 = 0; // 180
    let aPiutangPemegangSaham26 = 0; // 111000
    let aInvestasiPrima26 = 0; // 192000
    let aAktivaTetap26 = 0; // 190
    let aAkumulasiPenyusutan26 = 0; // 191

    let lUtangUsaha26 = 0; // 210
    let lUangMukaPenjualan26 = 0; // 211000
    let lHutangPajak26 = 0; // 220
    let lBiayaMasihHarusDibayar26 = 0; // 240
    let lHutangLainLain26 = 0; // 280
    let lHutangPemegangSahamWilliam26 = 0; // 230000
    let lHutangInvestasi26 = 0; // 230001

    let eModalSaham26 = 0; // 300000
    let eLabaDitahan26 = 0; // 320000
    let eDeviden26 = 0; // 310000

    coas.forEach(coa => {
      const startingBalance = coa.startingBalances.length > 0 ? coa.startingBalances[0].amount : 0;
      const mutations = aggregationMap[coa.id] || { debit: 0, credit: 0 };
      
      let endingBalance = startingBalance;
      if (coa.normalBalance === 'DEBIT') {
        endingBalance = startingBalance + mutations.debit - mutations.credit;
      } else {
        endingBalance = startingBalance + mutations.credit - mutations.debit;
      }

      const num = coa.accountNumber;
      const prefix = num.charAt(0);

      // --- Assets ---
      if (prefix === '1') {
        // 2025 Logic
        if (num.startsWith('10')) aKasBank += endingBalance;
        else if (num === '111000') aPiutangPesananSaham += endingBalance;
        else if (num.startsWith('11')) aPiutangUsaha += endingBalance;
        else if (num.startsWith('12') || num.startsWith('13') || num.startsWith('14') || num.startsWith('15')) aUangMuka += endingBalance;
        else if (num.startsWith('17')) aPajakDibayarDimuka += endingBalance;
        else if (num.startsWith('16')) aBiayaDibayarDimuka += endingBalance;
        else if (num.startsWith('18')) aPiutangLainLain += endingBalance;
        else if (num.startsWith('190')) aAktivaTetap += endingBalance;
        else if (num.startsWith('191')) aAkumulasiPenyusutan += endingBalance; 
        
        // 2026 Logic
        if (num.startsWith('10')) aKasBank26 += endingBalance;
        else if (num === '111000') aPiutangPemegangSaham26 += endingBalance;
        else if (num.startsWith('112')) aPiutangPajak26 += endingBalance;
        else if (num.startsWith('11')) aPiutangUsaha26 += endingBalance;
        else if (num.startsWith('12') || num.startsWith('13') || num.startsWith('14') || num.startsWith('15')) aUangMuka26 += endingBalance;
        else if (num.startsWith('17')) aPajakDibayarDimuka26 += endingBalance;
        else if (num.startsWith('16')) aBiayaDibayarDimuka26 += endingBalance;
        else if (num.startsWith('180')) aPinjamanKaryawan26 += endingBalance;
        else if (num.startsWith('181')) aPiutangLainLain26 += endingBalance;
        else if (num === '192000') aInvestasiPrima26 += endingBalance;
        else if (num.startsWith('190')) aAktivaTetap26 += endingBalance;
        else if (num.startsWith('191')) aAkumulasiPenyusutan26 += endingBalance; 
      }
      // --- Liabilities ---
      else if (prefix === '2') {
        // 2025 Logic
        if (num === '211000') lUangMukaPenjualan += endingBalance;
        else if (num.startsWith('21')) lUtangUsaha += endingBalance;
        else if (num.startsWith('22')) lHutangPajak += endingBalance;
        else if (num.startsWith('24') || num.startsWith('28')) lHutangLainLain += endingBalance;
        else if (num.startsWith('23')) lHutangPemegangSaham += endingBalance;

        // 2026 Logic
        if (num === '211000') lUangMukaPenjualan26 += endingBalance;
        else if (num.startsWith('21')) lUtangUsaha26 += endingBalance;
        else if (num.startsWith('22')) lHutangPajak26 += endingBalance;
        else if (num.startsWith('24')) lBiayaMasihHarusDibayar26 += endingBalance;
        else if (num.startsWith('28')) lHutangLainLain26 += endingBalance;
        else if (num === '230000') lHutangPemegangSahamWilliam26 += endingBalance;
        else if (num === '230001') lHutangInvestasi26 += endingBalance;
      }
      // --- Equity ---
      else if (prefix === '3') {
        // 2025 Logic
        if (num === '300000' || num === '310000') eModalSaham += endingBalance;

        // 2026 Logic
        if (num === '300000') eModalSaham26 += endingBalance;
        else if (num === '320000') eLabaDitahan26 += endingBalance;
        else if (num === '310000') eDeviden26 += endingBalance; // We can either add it here or subtract depending on normal balance
      }
      // --- PnL ---
      else if (['4', '5', '6', '7', '8', '9'].includes(prefix)) {
        if (coa.normalBalance === 'CREDIT') {
           currentYearEarnings += endingBalance;
        } else {
           currentYearEarnings -= endingBalance;
        }
      }
    });

    let report: any;

    if (fiscalYear === '2025') {
      const netAktivaTetap = aAktivaTetap - aAkumulasiPenyusutan;
      const formattedPenyusutan = formatCurrency(Math.abs(aAkumulasiPenyusutan));
      const aktivaTetapName = `Aktiva Tetap - Setelah dikurangi akumulasi Penyusutan sebesar Rp.${formattedPenyusutan}`;

      report = {
        assets: {
          current: [
            { name: "Kas & Bank", amount: aKasBank },
            { name: "Piutang Usaha", amount: aPiutangUsaha },
            { name: "Uang Muka Pembelian", amount: aUangMuka },
            { name: "Pajak dibayar dimuka", amount: aPajakDibayarDimuka },
            { name: "Biaya dibayar dimuka", amount: aBiayaDibayarDimuka },
            { name: "Piutang Lain Lain", amount: aPiutangLainLain },
            { name: "Piutang Pesanan Saham (modal yang belum di setor)", amount: aPiutangPesananSaham }
          ],
          nonCurrent: [
            { name: aktivaTetapName, amount: netAktivaTetap }
          ],
          total: aKasBank + aPiutangUsaha + aUangMuka + aPajakDibayarDimuka + aBiayaDibayarDimuka + aPiutangLainLain + aPiutangPesananSaham + netAktivaTetap
        },
        liabilities: {
          current: [
            { name: "Utang Usaha", amount: lUtangUsaha },
            { name: "Uang Muka Penjualan", amount: lUangMukaPenjualan },
            { name: "Hutang Pajak", amount: lHutangPajak },
            { name: "Hutang Lain Lain", amount: lHutangLainLain }
          ],
          nonCurrent: [
            { name: "Hutang Ke pemegang Saham", amount: lHutangPemegangSaham }
          ],
          total: lUtangUsaha + lUangMukaPenjualan + lHutangPajak + lHutangLainLain + lHutangPemegangSaham
        },
        equity: {
          items: [
            { name: "Modal Saham", amount: eModalSaham }
          ],
          currentYearEarnings,
          total: eModalSaham + currentYearEarnings
        },
        totalLiabilitiesAndEquity: 0
      };
    } else {
      // 2026 Layout
      report = {
        assets: {
          current: [
            { name: "Kas & Bank", amount: aKasBank26 },
            { name: "Piutang Usaha", amount: aPiutangUsaha26 },
            { name: "Piutang Pajak", amount: aPiutangPajak26 },
            { name: "Uang Muka Pembelian", amount: aUangMuka26 },
            { name: "Pajak dibayar dimuka", amount: aPajakDibayarDimuka26 },
            { name: "Biaya dibayar dimuka", amount: aBiayaDibayarDimuka26 },
            { name: "Piutang Lain Lain", amount: aPiutangLainLain26 },
            { name: "Pinjaman Karyawan", amount: aPinjamanKaryawan26 },
            { name: "Piutang Pemegang Saham", amount: aPiutangPemegangSaham26 },
            { name: "Investasi PT Prima Bersama Sejahtera", amount: aInvestasiPrima26 }
          ],
          nonCurrent: [
            { name: "Aktiva Tetap", amount: aAktivaTetap26 },
            { name: "Akumulasi Penyusutan Aset Tetap", amount: -Math.abs(aAkumulasiPenyusutan26) } // Often displayed as negative
          ],
          total: aKasBank26 + aPiutangUsaha26 + aPiutangPajak26 + aUangMuka26 + aPajakDibayarDimuka26 + aBiayaDibayarDimuka26 + aPiutangLainLain26 + aPinjamanKaryawan26 + aPiutangPemegangSaham26 + aInvestasiPrima26 + aAktivaTetap26 - Math.abs(aAkumulasiPenyusutan26)
        },
        liabilities: {
          current: [
            { name: "Utang Usaha", amount: lUtangUsaha26 },
            { name: "Uang Muka Penjualan", amount: lUangMukaPenjualan26 },
            { name: "Hutang Pajak", amount: lHutangPajak26 },
            { name: "Biaya yang masih harus di bayar", amount: lBiayaMasihHarusDibayar26 },
            { name: "Hutang Lain Lain", amount: lHutangLainLain26 }
          ],
          nonCurrent: [
            { name: "Hutang Ke pemegang Saham", amount: lHutangPemegangSahamWilliam26 },
            { name: "Hutang Ke pemegang Saham", amount: lHutangInvestasi26 }
          ],
          total: lUtangUsaha26 + lUangMukaPenjualan26 + lHutangPajak26 + lBiayaMasihHarusDibayar26 + lHutangLainLain26 + lHutangPemegangSahamWilliam26 + lHutangInvestasi26
        },
        equity: {
          items: [
            { name: "Modal Saham", amount: eModalSaham26 },
            { name: "Laba Ditahan", amount: eLabaDitahan26 },
            { name: "Deviden", amount: eDeviden26 }
          ],
          currentYearEarnings,
          total: eModalSaham26 + eLabaDitahan26 + eDeviden26 + currentYearEarnings
        },
        totalLiabilitiesAndEquity: 0
      };
    }

    report.totalLiabilitiesAndEquity = report.liabilities.total + report.equity.total;

    return NextResponse.json(report);

  } catch (error) {
    console.error("[BALANCE_SHEET_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
