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

    const coas = await prisma.masterCOA.findMany({
      where: { 
        fiscalYear,
        OR: [
          { accountNumber: { startsWith: '4' } },
          { accountNumber: { startsWith: '5' } },
          { accountNumber: { startsWith: '6' } },
          { accountNumber: { startsWith: '7' } },
          { accountNumber: { startsWith: '8' } },
          { accountNumber: { startsWith: '9' } },
        ]
      },
      include: {
        fiscalAdjustments: {
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

    // Common Totals
    let pendapatanUsaha = 0; let kPendapatanUsahaPos = 0; let kPendapatanUsahaNeg = 0;
    let bebanPokokPenjualan = 0; let kBebanPokokPenjualanPos = 0; let kBebanPokokPenjualanNeg = 0;
    let pendapatanJasaGiro = 0; let kPendapatanJasaGiroPos = 0; let kPendapatanJasaGiroNeg = 0;
    let bebanAdmBank = 0; let kBebanAdmBankPos = 0; let kBebanAdmBankNeg = 0;
    let selisihKurs = 0; let kSelisihKursPos = 0; let kSelisihKursNeg = 0;
    let bebanPajakMasaKini = 0; let kBebanPajakMasaKiniPos = 0; let kBebanPajakMasaKiniNeg = 0;

    // 2025 Buckets

    let bebanGajiTunjangan25 = 0; let kGajiTunjangan25Pos = 0; let kGajiTunjangan25Neg = 0;
    let bebanAsuransi25 = 0; let kAsuransi25Pos = 0; let kAsuransi25Neg = 0;
    let bebanTelekomunikasi25 = 0; let kTelekomunikasi25Pos = 0; let kTelekomunikasi25Neg = 0;
    let bebanTransportasi25 = 0; let kTransportasi25Pos = 0; let kTransportasi25Neg = 0;
    let bebanPerlengkapan25 = 0; let kPerlengkapan25Pos = 0; let kPerlengkapan25Neg = 0;
    let bebanJasa25 = 0; let kJasa25Pos = 0; let kJasa25Neg = 0;
    let bebanPajak25 = 0; let kPajak25Pos = 0; let kPajak25Neg = 0;
    let bebanSewa25 = 0; let kSewa25Pos = 0; let kSewa25Neg = 0;
    let bebanPenyusutan25 = 0; let kPenyusutan25Pos = 0; let kPenyusutan25Neg = 0;
    let bebanLainLainOp25 = 0; let kLainLainOp25Pos = 0; let kLainLainOp25Neg = 0;

    // 2026 Detailed Buckets
    let bGaji = 0; let kGajiPos = 0; let kGajiNeg = 0;
    let bThr = 0; let kThrPos = 0; let kThrNeg = 0;
    let bAsuransiJkk = 0; let kAsuransiJkkPos = 0; let kAsuransiJkkNeg = 0;
    let bAsuransiJht = 0; let kAsuransiJhtPos = 0; let kAsuransiJhtNeg = 0;
    let bBensinTol = 0; let kBensinTolPos = 0; let kBensinTolNeg = 0;
    let bTelekomunikasi = 0; let kTelekomunikasiPos = 0; let kTelekomunikasiNeg = 0;
    let bPerjalananDinas = 0; let kPerjalananDinasPos = 0; let kPerjalananDinasNeg = 0;
    let bTunjPerjalananDinas = 0; let kTunjPerjalananDinasPos = 0; let kTunjPerjalananDinasNeg = 0;
    let bPerlengkapanKantor = 0; let kPerlengkapanKantorPos = 0; let kPerlengkapanKantorNeg = 0;
    let bMaterai = 0; let kMateraiPos = 0; let kMateraiNeg = 0;
    let bListrik = 0; let kListrikPos = 0; let kListrikNeg = 0;
    let bAir = 0; let kAirPos = 0; let kAirNeg = 0;
    let bPengirimanDokumen = 0; let kPengirimanDokumenPos = 0; let kPengirimanDokumenNeg = 0;
    let bIuranLingkungan = 0; let kIuranLingkunganPos = 0; let kIuranLingkunganNeg = 0;
    let bTenagaProfesional = 0; let kTenagaProfesionalPos = 0; let kTenagaProfesionalNeg = 0;
    let bOutsourcing = 0; let kOutsourcingPos = 0; let kOutsourcingNeg = 0;
    let bMaterial = 0; let kMaterialPos = 0; let kMaterialNeg = 0;
    let bTenagaLepas = 0; let kTenagaLepasPos = 0; let kTenagaLepasNeg = 0;
    let bInternet = 0; let kInternetPos = 0; let kInternetNeg = 0;
    let bPajak = 0; let kPajakPos = 0; let kPajakNeg = 0;
    let bBunga = 0; let kBungaPos = 0; let kBungaNeg = 0;
    let bSewa = 0; let kSewaPos = 0; let kSewaNeg = 0;
    let bEntertaiment = 0; let kEntertaimentPos = 0; let kEntertaimentNeg = 0;
    let bTunjMakan = 0; let kTunjMakanPos = 0; let kTunjMakanNeg = 0;
    let bTunjEntertaiment = 0; let kTunjEntertaimentPos = 0; let kTunjEntertaimentNeg = 0;
    let bKeperluanDapur = 0; let kKeperluanDapurPos = 0; let kKeperluanDapurNeg = 0;
    let bPnbp = 0; let kPnbpPos = 0; let kPnbpNeg = 0;
    let bPenyKendaraan = 0; let kPenyKendaraanPos = 0; let kPenyKendaraanNeg = 0;
    let bPenyInventaris = 0; let kPenyInventarisPos = 0; let kPenyInventarisNeg = 0;
    let bPenyFurniture = 0; let kPenyFurniturePos = 0; let kPenyFurnitureNeg = 0;
    let bLainLainOp26 = 0; let kLainLainOp26Pos = 0; let kLainLainOp26Neg = 0;

    coas.forEach(coa => {
      const mutations = aggregationMap[coa.id] || { debit: 0, credit: 0 };
      
      let periodAmount = 0;
      if (coa.normalBalance === 'CREDIT') {
         periodAmount = mutations.credit - mutations.debit;
      } else {
         periodAmount = mutations.debit - mutations.credit;
      }

      if (periodAmount === 0 && mutations.debit === 0 && mutations.credit === 0 && (!coa.fiscalAdjustments || coa.fiscalAdjustments.length === 0)) return;

      const num = coa.accountNumber;
      
      let posAdj = 0;
      let negAdj = 0;
      if (coa.fiscalAdjustments) {
        coa.fiscalAdjustments.forEach(adj => {
          if (adj.type === 'POSITIVE') posAdj += adj.amount;
          if (adj.type === 'NEGATIVE') negAdj += adj.amount;
        });
      }

      const addAdj = (posRef: number, negRef: number) => {
         return { pos: posRef + posAdj, neg: negRef + negAdj };
      };

      if (num.startsWith('4')) {
        pendapatanUsaha += periodAmount;
        const res = addAdj(kPendapatanUsahaPos, kPendapatanUsahaNeg); kPendapatanUsahaPos = res.pos; kPendapatanUsahaNeg = res.neg;
      } else if (num.startsWith('5')) {
        bebanPokokPenjualan += periodAmount;
        const res = addAdj(kBebanPokokPenjualanPos, kBebanPokokPenjualanNeg); kBebanPokokPenjualanPos = res.pos; kBebanPokokPenjualanNeg = res.neg;
      } else if (num.startsWith('6') || num === '999999') {
        // --- Populating 2025 Buckets ---
        if (["600001", "600002", "600003", "600006", "600007", "600008", "600011", "600029", "600031"].includes(num)) {
          bebanGajiTunjangan25 += periodAmount; const r = addAdj(kGajiTunjangan25Pos, kGajiTunjangan25Neg); kGajiTunjangan25Pos = r.pos; kGajiTunjangan25Neg = r.neg;
        } else if (["600009"].includes(num)) {
          bebanAsuransi25 += periodAmount; const r = addAdj(kAsuransi25Pos, kAsuransi25Neg); kAsuransi25Pos = r.pos; kAsuransi25Neg = r.neg;
        } else if (["600013", "600004", "600028"].includes(num)) {
          bebanTelekomunikasi25 += periodAmount; const r = addAdj(kTelekomunikasi25Pos, kTelekomunikasi25Neg); kTelekomunikasi25Pos = r.pos; kTelekomunikasi25Neg = r.neg;
        } else if (["600010", "600015"].includes(num)) {
          bebanTransportasi25 += periodAmount; const r = addAdj(kTransportasi25Pos, kTransportasi25Neg); kTransportasi25Pos = r.pos; kTransportasi25Neg = r.neg;
        } else if (["600014", "600016", "600018", "600022"].includes(num)) {
          bebanPerlengkapan25 += periodAmount; const r = addAdj(kPerlengkapan25Pos, kPerlengkapan25Neg); kPerlengkapan25Pos = r.pos; kPerlengkapan25Neg = r.neg;
        } else if (["600025", "600026", "600027"].includes(num)) {
          bebanJasa25 += periodAmount; const r = addAdj(kJasa25Pos, kJasa25Neg); kJasa25Pos = r.pos; kJasa25Neg = r.neg;
        } else if (["600017", "600020"].includes(num)) {
          bebanPajak25 += periodAmount; const r = addAdj(kPajak25Pos, kPajak25Neg); kPajak25Pos = r.pos; kPajak25Neg = r.neg;
        } else if (num === "600019") {
          bebanSewa25 += periodAmount; const r = addAdj(kSewa25Pos, kSewa25Neg); kSewa25Pos = r.pos; kSewa25Neg = r.neg;
        } else if (num.startsWith("610")) {
          bebanPenyusutan25 += periodAmount; const r = addAdj(kPenyusutan25Pos, kPenyusutan25Neg); kPenyusutan25Pos = r.pos; kPenyusutan25Neg = r.neg;
        } else if (num === "600032") {
          // Handled generically outside
        } else {
          bebanLainLainOp25 += periodAmount; const r = addAdj(kLainLainOp25Pos, kLainLainOp25Neg); kLainLainOp25Pos = r.pos; kLainLainOp25Neg = r.neg;
        }

        // --- Populating 2026 Detailed Buckets ---
        if (["600001", "600002", "600003", "600004", "600007"].includes(num)) { bGaji += periodAmount; const r = addAdj(kGajiPos, kGajiNeg); kGajiPos = r.pos; kGajiNeg = r.neg; }
        else if (num === "600011") { bThr += periodAmount; const r = addAdj(kThrPos, kThrNeg); kThrPos = r.pos; kThrNeg = r.neg; }
        else if (num === "600008") { bAsuransiJkk += periodAmount; const r = addAdj(kAsuransiJkkPos, kAsuransiJkkNeg); kAsuransiJkkPos = r.pos; kAsuransiJkkNeg = r.neg; }
        else if (num === "600009") { bAsuransiJht += periodAmount; const r = addAdj(kAsuransiJhtPos, kAsuransiJhtNeg); kAsuransiJhtPos = r.pos; kAsuransiJhtNeg = r.neg; }
        else if (num === "600010") { bBensinTol += periodAmount; const r = addAdj(kBensinTolPos, kBensinTolNeg); kBensinTolPos = r.pos; kBensinTolNeg = r.neg; }
        else if (num === "600013") { bTelekomunikasi += periodAmount; const r = addAdj(kTelekomunikasiPos, kTelekomunikasiNeg); kTelekomunikasiPos = r.pos; kTelekomunikasiNeg = r.neg; }
        else if (num === "600015") { bPerjalananDinas += periodAmount; const r = addAdj(kPerjalananDinasPos, kPerjalananDinasNeg); kPerjalananDinasPos = r.pos; kPerjalananDinasNeg = r.neg; }
        else if (num === "600005") { bTunjPerjalananDinas += periodAmount; const r = addAdj(kTunjPerjalananDinasPos, kTunjPerjalananDinasNeg); kTunjPerjalananDinasPos = r.pos; kTunjPerjalananDinasNeg = r.neg; }
        else if (num === "600016") { bPerlengkapanKantor += periodAmount; const r = addAdj(kPerlengkapanKantorPos, kPerlengkapanKantorNeg); kPerlengkapanKantorPos = r.pos; kPerlengkapanKantorNeg = r.neg; }
        else if (num === "600018") { bMaterai += periodAmount; const r = addAdj(kMateraiPos, kMateraiNeg); kMateraiPos = r.pos; kMateraiNeg = r.neg; }
        else if (num === "600014") { bListrik += periodAmount; const r = addAdj(kListrikPos, kListrikNeg); kListrikPos = r.pos; kListrikNeg = r.neg; }
        else if (num === "600023") { bAir += periodAmount; const r = addAdj(kAirPos, kAirNeg); kAirPos = r.pos; kAirNeg = r.neg; }
        else if (num === "600022") { bPengirimanDokumen += periodAmount; const r = addAdj(kPengirimanDokumenPos, kPengirimanDokumenNeg); kPengirimanDokumenPos = r.pos; kPengirimanDokumenNeg = r.neg; }
        else if (num === "600030") { bIuranLingkungan += periodAmount; const r = addAdj(kIuranLingkunganPos, kIuranLingkunganNeg); kIuranLingkunganPos = r.pos; kIuranLingkunganNeg = r.neg; }
        else if (num === "600025") { bTenagaProfesional += periodAmount; const r = addAdj(kTenagaProfesionalPos, kTenagaProfesionalNeg); kTenagaProfesionalPos = r.pos; kTenagaProfesionalNeg = r.neg; }
        else if (num === "600026") { bOutsourcing += periodAmount; const r = addAdj(kOutsourcingPos, kOutsourcingNeg); kOutsourcingPos = r.pos; kOutsourcingNeg = r.neg; }
        else if (num === "600029") { bMaterial += periodAmount; const r = addAdj(kMaterialPos, kMaterialNeg); kMaterialPos = r.pos; kMaterialNeg = r.neg; }
        else if (num === "600027") { bTenagaLepas += periodAmount; const r = addAdj(kTenagaLepasPos, kTenagaLepasNeg); kTenagaLepasPos = r.pos; kTenagaLepasNeg = r.neg; }
        else if (num === "600028") { bInternet += periodAmount; const r = addAdj(kInternetPos, kInternetNeg); kInternetPos = r.pos; kInternetNeg = r.neg; }
        else if (["600017", "600020"].includes(num)) { bPajak += periodAmount; const r = addAdj(kPajakPos, kPajakNeg); kPajakPos = r.pos; kPajakNeg = r.neg; }
        else if (num === "600033") { bBunga += periodAmount; const r = addAdj(kBungaPos, kBungaNeg); kBungaPos = r.pos; kBungaNeg = r.neg; }
        else if (num === "600019") { bSewa += periodAmount; const r = addAdj(kSewaPos, kSewaNeg); kSewaPos = r.pos; kSewaNeg = r.neg; }
        else if (num === "600099") { bEntertaiment += periodAmount; const r = addAdj(kEntertaimentPos, kEntertaimentNeg); kEntertaimentPos = r.pos; kEntertaimentNeg = r.neg; }
        else if (num === "600006") { bTunjMakan += periodAmount; const r = addAdj(kTunjMakanPos, kTunjMakanNeg); kTunjMakanPos = r.pos; kTunjMakanNeg = r.neg; }
        else if (num === "600012") { bTunjEntertaiment += periodAmount; const r = addAdj(kTunjEntertaimentPos, kTunjEntertaimentNeg); kTunjEntertaimentPos = r.pos; kTunjEntertaimentNeg = r.neg; }
        else if (num === "600100") { bKeperluanDapur += periodAmount; const r = addAdj(kKeperluanDapurPos, kKeperluanDapurNeg); kKeperluanDapurPos = r.pos; kKeperluanDapurNeg = r.neg; }
        else if (num === "600021") { bPnbp += periodAmount; const r = addAdj(kPnbpPos, kPnbpNeg); kPnbpPos = r.pos; kPnbpNeg = r.neg; }
        else if (num === "610001") { bPenyKendaraan += periodAmount; const r = addAdj(kPenyKendaraanPos, kPenyKendaraanNeg); kPenyKendaraanPos = r.pos; kPenyKendaraanNeg = r.neg; }
        else if (num === "610002") { bPenyInventaris += periodAmount; const r = addAdj(kPenyInventarisPos, kPenyInventarisNeg); kPenyInventarisPos = r.pos; kPenyInventarisNeg = r.neg; }
        else if (num === "610003") { bPenyFurniture += periodAmount; const r = addAdj(kPenyFurniturePos, kPenyFurnitureNeg); kPenyFurniturePos = r.pos; kPenyFurnitureNeg = r.neg; }
        else if (num === "600032") { /* Handled generally */ }
        else { bLainLainOp26 += periodAmount; const r = addAdj(kLainLainOp26Pos, kLainLainOp26Neg); kLainLainOp26Pos = r.pos; kLainLainOp26Neg = r.neg; }

        // General
        if (num === "600032") { bebanPajakMasaKini += periodAmount; const r = addAdj(kBebanPajakMasaKiniPos, kBebanPajakMasaKiniNeg); kBebanPajakMasaKiniPos = r.pos; kBebanPajakMasaKiniNeg = r.neg; }

      } else if (num.startsWith('7') || num.startsWith('8') || num.startsWith('9')) {
        if (num === "710001") {
          pendapatanJasaGiro += periodAmount; const r = addAdj(kPendapatanJasaGiroPos, kPendapatanJasaGiroNeg); kPendapatanJasaGiroPos = r.pos; kPendapatanJasaGiroNeg = r.neg;
        } else if (num === "720003") {
          pendapatanJasaGiro -= periodAmount; const r = addAdj(kPendapatanJasaGiroPos, kPendapatanJasaGiroNeg); kPendapatanJasaGiroPos = r.pos; kPendapatanJasaGiroNeg = r.neg;
        } else if (num === "720002") {
          bebanAdmBank += periodAmount; const r = addAdj(kBebanAdmBankPos, kBebanAdmBankNeg); kBebanAdmBankPos = r.pos; kBebanAdmBankNeg = r.neg;
        } else if (num === "720004") {
          selisihKurs += periodAmount; const r = addAdj(kSelisihKursPos, kSelisihKursNeg); kSelisihKursPos = r.pos; kSelisihKursNeg = r.neg;
        } else {
          if (coa.normalBalance === 'DEBIT') {
             if (fiscalYear === '2025') { bebanLainLainOp25 += periodAmount; const r = addAdj(kLainLainOp25Pos, kLainLainOp25Neg); kLainLainOp25Pos = r.pos; kLainLainOp25Neg = r.neg; }
             else { bLainLainOp26 += periodAmount; const r = addAdj(kLainLainOp26Pos, kLainLainOp26Neg); kLainLainOp26Pos = r.pos; kLainLainOp26Neg = r.neg; }
          } else {
             pendapatanJasaGiro += periodAmount; const r = addAdj(kPendapatanJasaGiroPos, kPendapatanJasaGiroNeg); kPendapatanJasaGiroPos = r.pos; kPendapatanJasaGiroNeg = r.neg;
          }
        }
      }
    });

    const grossProfit = pendapatanUsaha - bebanPokokPenjualan;
    
    let operatingExpenses = [];
    let totalOperatingExpenses = 0;

    if (fiscalYear === '2025') {
      operatingExpenses = [
        { name: "Beban Gaji & Tunjangan", amount: bebanGajiTunjangan25, koreksiPositif: kGajiTunjangan25Pos, koreksiNegatif: kGajiTunjangan25Neg },
        { name: "Beban Asuransi BPJS JHT (2%)", amount: bebanAsuransi25, koreksiPositif: kAsuransi25Pos, koreksiNegatif: kAsuransi25Neg },
        { name: "Beban Telekomunikasi", amount: bebanTelekomunikasi25, koreksiPositif: kTelekomunikasi25Pos, koreksiNegatif: kTelekomunikasi25Neg },
        { name: "Beban Transportasi, Bensin, BBM dan Toll", amount: bebanTransportasi25, koreksiPositif: kTransportasi25Pos, koreksiNegatif: kTransportasi25Neg },
        { name: "Beban Perlengkapan Kantor", amount: bebanPerlengkapan25, koreksiPositif: kPerlengkapan25Pos, koreksiNegatif: kPerlengkapan25Neg },
        { name: "Beban Sehubungan Dengan Jasa", amount: bebanJasa25, koreksiPositif: kJasa25Pos, koreksiNegatif: kJasa25Neg },
        { name: "Beban Pajak", amount: bebanPajak25, koreksiPositif: kPajak25Pos, koreksiNegatif: kPajak25Neg },
        { name: "Beban Sewa", amount: bebanSewa25, koreksiPositif: kSewa25Pos, koreksiNegatif: kSewa25Neg },
        { name: "Beban Penyusutan", amount: bebanPenyusutan25, koreksiPositif: kPenyusutan25Pos, koreksiNegatif: kPenyusutan25Neg },
        { name: "Beban Lain Lain", amount: bebanLainLainOp25, koreksiPositif: kLainLainOp25Pos, koreksiNegatif: kLainLainOp25Neg }
      ];
    } else {
      operatingExpenses = [
        { name: "Beban Gaji & Tunjangan", amount: bGaji, koreksiPositif: kGajiPos, koreksiNegatif: kGajiNeg },
        { name: "Beban THR", amount: bThr, koreksiPositif: kThrPos, koreksiNegatif: kThrNeg },
        { name: "Beban Tunjangan Asuransi BPJS Jkk (0,24%), Jkm (0,3%), JHT (3.7%)", amount: bAsuransiJkk, koreksiPositif: kAsuransiJkkPos, koreksiNegatif: kAsuransiJkkNeg },
        { name: "Beban Asuransi BPJS JHT (2%)", amount: bAsuransiJht, koreksiPositif: kAsuransiJhtPos, koreksiNegatif: kAsuransiJhtNeg },
        { name: "Beban Bensin, Parkir, Tol Kendaraan", amount: bBensinTol, koreksiPositif: kBensinTolPos, koreksiNegatif: kBensinTolNeg },
        { name: "Beban Telekomunikasi", amount: bTelekomunikasi, koreksiPositif: kTelekomunikasiPos, koreksiNegatif: kTelekomunikasiNeg },
        { name: "Beban Perjalanan Dinas", amount: bPerjalananDinas, koreksiPositif: kPerjalananDinasPos, koreksiNegatif: kPerjalananDinasNeg },
        { name: "Beban Tunjangan Perjalanan Dinas", amount: bTunjPerjalananDinas, koreksiPositif: kTunjPerjalananDinasPos, koreksiNegatif: kTunjPerjalananDinasNeg },
        { name: "Beban Perlengkapan Kantor", amount: bPerlengkapanKantor, koreksiPositif: kPerlengkapanKantorPos, koreksiNegatif: kPerlengkapanKantorNeg },
        { name: "Beban Materai", amount: bMaterai, koreksiPositif: kMateraiPos, koreksiNegatif: kMateraiNeg },
        { name: "Beban Listrik", amount: bListrik, koreksiPositif: kListrikPos, koreksiNegatif: kListrikNeg },
        { name: "Beban Air", amount: bAir, koreksiPositif: kAirPos, koreksiNegatif: kAirNeg },
        { name: "Beban Pengiriman Dokumen", amount: bPengirimanDokumen, koreksiPositif: kPengirimanDokumenPos, koreksiNegatif: kPengirimanDokumenNeg },
        { name: "Beban Iuran Pemeliharaan Lingkungan", amount: bIuranLingkungan, koreksiPositif: kIuranLingkunganPos, koreksiNegatif: kIuranLingkunganNeg },
        { name: "Tenaga Profesional", amount: bTenagaProfesional, koreksiPositif: kTenagaProfesionalPos, koreksiNegatif: kTenagaProfesionalNeg },
        { name: "Outsourching", amount: bOutsourcing, koreksiPositif: kOutsourcingPos, koreksiNegatif: kOutsourcingNeg },
        { name: "Beban Material", amount: bMaterial, koreksiPositif: kMaterialPos, koreksiNegatif: kMaterialNeg },
        { name: "Beban Tenaga Lepas (Individu)", amount: bTenagaLepas, koreksiPositif: kTenagaLepasPos, koreksiNegatif: kTenagaLepasNeg },
        { name: "Beban Internet", amount: bInternet, koreksiPositif: kInternetPos, koreksiNegatif: kInternetNeg },
        { name: "Beban Pajak", amount: bPajak, koreksiPositif: kPajakPos, koreksiNegatif: kPajakNeg },
        { name: "Beban Bunga", amount: bBunga, koreksiPositif: kBungaPos, koreksiNegatif: kBungaNeg },
        { name: "Beban Sewa", amount: bSewa, koreksiPositif: kSewaPos, koreksiNegatif: kSewaNeg },
        { name: "Beban Entertaiment", amount: bEntertaiment, koreksiPositif: kEntertaimentPos, koreksiNegatif: kEntertaimentNeg },
        { name: "Beban Tunjangan Makan", amount: bTunjMakan, koreksiPositif: kTunjMakanPos, koreksiNegatif: kTunjMakanNeg },
        { name: "Beban Tunjangan Entertaiment", amount: bTunjEntertaiment, koreksiPositif: kTunjEntertaimentPos, koreksiNegatif: kTunjEntertaimentNeg },
        { name: "Beban Keperluan Dapur", amount: bKeperluanDapur, koreksiPositif: kKeperluanDapurPos, koreksiNegatif: kKeperluanDapurNeg },
        { name: "Beban PNBP", amount: bPnbp, koreksiPositif: kPnbpPos, koreksiNegatif: kPnbpNeg },
        { name: "Beban Penyusutan Kendaraan", amount: bPenyKendaraan, koreksiPositif: kPenyKendaraanPos, koreksiNegatif: kPenyKendaraanNeg },
        { name: "Beban Penyusutan Inventaris Kantor", amount: bPenyInventaris, koreksiPositif: kPenyInventarisPos, koreksiNegatif: kPenyInventarisNeg },
        { name: "Beban Penyusutan Furniture", amount: bPenyFurniture, koreksiPositif: kPenyFurniturePos, koreksiNegatif: kPenyFurnitureNeg },
        { name: "Lain Lain", amount: bLainLainOp26, koreksiPositif: kLainLainOp26Pos, koreksiNegatif: kLainLainOp26Neg }
      ];
    }

    totalOperatingExpenses = operatingExpenses.reduce((sum, item) => sum + item.amount, 0);

    const pendapatanLain = [
      { name: "Pendapatan Jasa Giro", amount: pendapatanJasaGiro, koreksiPositif: kPendapatanJasaGiroPos, koreksiNegatif: kPendapatanJasaGiroNeg }
    ];
    const totalPendapatanLain = pendapatanJasaGiro;
    
    const bebanLain = [
      { name: "Beban Adm.Bank & Buku Cek/Giro", amount: bebanAdmBank, koreksiPositif: kBebanAdmBankPos, koreksiNegatif: kBebanAdmBankNeg },
      { name: "Selisih Kurs", amount: selisihKurs, koreksiPositif: kSelisihKursPos, koreksiNegatif: kSelisihKursNeg }
    ];
    const totalBebanLain = bebanAdmBank + selisihKurs;

    const netIncome = grossProfit - totalOperatingExpenses + totalPendapatanLain - totalBebanLain - bebanPajakMasaKini;

    return NextResponse.json({
      pendapatanUsaha: { amount: pendapatanUsaha, koreksiPositif: kPendapatanUsahaPos, koreksiNegatif: kPendapatanUsahaNeg },
      bebanPokokPenjualan: { amount: bebanPokokPenjualan, koreksiPositif: kBebanPokokPenjualanPos, koreksiNegatif: kBebanPokokPenjualanNeg },
      grossProfit,
      operatingExpenses,
      totalOperatingExpenses,
      pendapatanLain,
      totalPendapatanLain,
      bebanLain,
      totalBebanLain,
      bebanPajakMasaKini: { amount: bebanPajakMasaKini, koreksiPositif: kBebanPajakMasaKiniPos, koreksiNegatif: kBebanPajakMasaKiniNeg },
      netIncome
    });

  } catch (error) {
    console.error("[PNL_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
