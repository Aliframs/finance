const SECRET_TOKEN = "rahasia_finance_2026"; 
const SHEET_PREFIX = "Jurnal "; // Format tab akan menjadi "Jurnal 2025", "Jurnal 2026"

function doGet(e) {
  try {
    if (!e.parameter.secret || e.parameter.secret !== SECRET_TOKEN) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Unauthorized" })).setMimeType(ContentService.MimeType.JSON);
    }
    // Jika ada parameter year, ambil tab tersebut, jika tidak default 2025
    const year = e.parameter.year || "2025";
    const sheetName = SHEET_PREFIX + year;
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Sheet " + sheetName + " tidak ditemukan" })).setMimeType(ContentService.MimeType.JSON);
    }

    const data = sheet.getDataRange().getValues();
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: data })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    if (payload.secret !== SECRET_TOKEN) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Unauthorized" })).setMimeType(ContentService.MimeType.JSON);
    }

    // --- LOGIKA PEMILIHAN TAHUN (FISCAL YEAR) ---
    // Mencoba mengambil fiscalYear dari payload.journal atau fallback ke 2025
    const fiscalYear = (payload.journal && payload.journal.fiscalYear) ? payload.journal.fiscalYear : (payload.fiscalYear || "2025");
    const targetSheetName = SHEET_PREFIX + fiscalYear;

    let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(targetSheetName);
    
    // Jika tab untuk tahun tersebut belum ada, buatkan otomatis
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(targetSheetName);
      // Agar header otomatis bisa bekerja, pastikan Anda membuat header manual di baris pertama
      // Jika kosong, script ini akan error karena "Baris Header tidak ditemukan".
    }

    const data = sheet.getDataRange().getValues();
    
    // Cari baris header otomatis
    let headerRowIndex = -1;
    for (let i = 0; i < data.length; i++) {
      const rowString = data[i].join("").toLowerCase();
      if (rowString.includes("journal id") || rowString.includes("no voucher")) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) throw new Error("Baris Header tidak ditemukan di sheet " + targetSheetName + ". Mohon buat header manual terlebih dahulu.");
    const headers = data[headerRowIndex].map(h => h.toString().toLowerCase().trim());
    const idCol = headers.findIndex(h => h.includes("journal id"));

    // --- FITUR 1: CREATE (Tambah Otomatis) ---
    if (action === "CREATE") {
      const journal = payload.journal;
      
      // Idempotency Check (Anti-Duplikat berdasarkan ID)
      if (idCol !== -1) {
        for (let i = headerRowIndex + 1; i < data.length; i++) {
          if (data[i][idCol] === journal.id) {
             return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Data sudah ada (Idempotent)" })).setMimeType(ContentService.MimeType.JSON);
          }
        }
      }

      const newRow = new Array(headers.length).fill("");
      
      headers.forEach((h, i) => {
        if (h.includes("tanggal")) newRow[i] = journal.tanggal;
        else if (h.includes("no voucher")) newRow[i] = journal.noVoucher;
        else if (h.includes("no perkiraan") || h.includes("no akun")) newRow[i] = journal.noAkun;
        else if (h.includes("account name") || h.includes("nama akun")) newRow[i] = journal.namaAkun;
        else if (h.includes("nama vendor")) newRow[i] = journal.namaVendor || "-";
        else if (h.includes("keterangan")) newRow[i] = journal.keterangan;
        else if (h.includes("debit")) newRow[i] = journal.debit;
        else if (h.includes("kredit")) newRow[i] = journal.credit;
        else if (h.includes("journal id")) newRow[i] = journal.id;
        else if (h.includes("jenis voucher")) newRow[i] = journal.jenisVoucher || "-";
      });

      sheet.appendRow(newRow);
      return ContentService.createTextOutput(JSON.stringify({ success: true, sheet: targetSheetName })).setMimeType(ContentService.MimeType.JSON);
    }

    // --- FITUR 2: UPDATE (Edit Otomatis) ---
    if (action === "UPDATE") {
      if (idCol !== -1) {
        const journal = payload.journal;
        const journalIdToUpdate = journal.id;
        let isUpdated = false;
        
        for (let i = headerRowIndex + 1; i < data.length; i++) {
          if (data[i][idCol] === journalIdToUpdate) {
            const updatedRow = new Array(headers.length).fill("");
            
            headers.forEach((h, colIndex) => {
              if (h.includes("tanggal")) updatedRow[colIndex] = journal.tanggal;
              else if (h.includes("no voucher")) updatedRow[colIndex] = journal.noVoucher;
              else if (h.includes("no perkiraan") || h.includes("no akun")) updatedRow[colIndex] = journal.noAkun;
              else if (h.includes("account name") || h.includes("nama akun")) updatedRow[colIndex] = journal.namaAkun;
              else if (h.includes("nama vendor")) updatedRow[colIndex] = journal.namaVendor || "-";
              else if (h.includes("keterangan")) updatedRow[colIndex] = journal.keterangan;
              else if (h.includes("debit")) updatedRow[colIndex] = journal.debit;
              else if (h.includes("kredit")) updatedRow[colIndex] = journal.credit;
              else if (h.includes("journal id")) updatedRow[colIndex] = journal.id;
              else if (h.includes("jenis voucher")) updatedRow[colIndex] = journal.jenisVoucher || "-";
              else updatedRow[colIndex] = data[i][colIndex]; // Pertahankan isi kolom lainnya
            });
            
            sheet.getRange(i + 1, 1, 1, headers.length).setValues([updatedRow]);
            isUpdated = true;
            break; 
          }
        }
        return ContentService.createTextOutput(JSON.stringify({ success: true, updated: isUpdated, sheet: targetSheetName })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // --- FITUR 3: DELETE (Hapus Otomatis) ---
    if (action === "DELETE") {
      if (idCol !== -1) {
        const journalIdToDelete = payload.journal.id;
        let deletedCount = 0;
        // Hapus dari bawah ke atas agar index baris tidak bergeser salah
        for (let i = data.length - 1; i > headerRowIndex; i--) {
          if (data[i][idCol] === journalIdToDelete) {
            sheet.deleteRow(i + 1); 
            deletedCount++;
          }
        }
        return ContentService.createTextOutput(JSON.stringify({ success: true, deleted: deletedCount, sheet: targetSheetName })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // --- FITUR 4: BULK UPDATE (Tarik Data Masal) ---
    if (action === "BULK_UPDATE") {
      const startRow = payload.startRow;
      const journalIds = payload.journalIds; 
      const voucherLinks = payload.voucherLinks; 
      const journalIdColIndex = payload.journalIdColIndex; 
      const voucherColIndex = payload.voucherColIndex; 
      
      if (journalIds && journalIds.length > 0) sheet.getRange(startRow, journalIdColIndex, journalIds.length, 1).setValues(journalIds);
      if (voucherLinks && voucherLinks.length > 0) sheet.getRange(startRow, voucherColIndex, voucherLinks.length, 1).setValues(voucherLinks);
      
      return ContentService.createTextOutput(JSON.stringify({ success: true, sheet: targetSheetName })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}
