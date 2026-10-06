# PRD – Finance Voucher Approval & Automation System
**Version:** 3.1 Final (with Digital Signature & Deduction)  
**Architecture:** Website + n8n Middleware

# 1. Executive Summary
Sistem digunakan untuk digitalisasi proses voucher pengeluaran perusahaan.
Website menjadi aplikasi utama (Single Source of Truth), sedangkan n8n hanya digunakan sebagai middleware integrasi (Google Sheet, Google Drive, notifikasi, dan automasi).

# 2. Objectives
- Digitalisasi approval voucher.
- Menyimpan seluruh histori approval.
- Menghasilkan PDF final beserta lampiran dan tanda tangan digital.
- Sinkronisasi jurnal otomatis ke Google Sheet.
- Mendukung amendment tanpa approval ulang.

# 3. High Level Architecture

Website
- Authentication
- Voucher
- Approval & Digital Signature
- Master Data
- Journal
- Audit Log & Timeline
- Amendment
- Dashboard

n8n
- Google Sheet Sync
- Google Drive Upload
- Notification
- Future Automation

Storage
- MySQL
- Local Storage
- Google Drive

# 4. Workflow

Admin
→ Accounting 2
→ Accounting 3
→ Accounting 1
→ Finance
→ Direktur Utama
→ Direktur
→ Admin Final Check
→ Completed

# 5. Status

DRAFT
WAITING_ACCOUNTING_2
WAITING_ACCOUNTING_3
WAITING_ACCOUNTING_1
WAITING_FINANCE
WAITING_DIREKTUR_UTAMA
WAITING_DIREKTUR
FINAL_CHECK_ADMIN
COMPLETED
CANCELLED

# 6. Roles

Admin
- Create Voucher
- Edit
- Soft Delete
- Approve Final
- Upload Attachment
- Download Preview

Accounting 2
- Approve
- Edit
- Delete
- Amendment
- Input Journal
- Upload Attachment

Accounting 3
- Approve
- Edit
- Delete
- Upload Attachment

Accounting 1
- Approve
- Edit
- Delete
- Amendment
- Upload Attachment

Finance
- Approve
- Upload Attachment

Direktur Utama
- Approve
- Upload Attachment

Direktur
- Approve
- Upload Attachment

Semua role:
- Download preview PDF
- Upload lampiran

# 7. Voucher Fields

Admin mengisi:
- Nomor Voucher (manual, unique, format contoh 25-00001)
- Kepada (Master Data)
- Bank (otomatis)
- Nomor Rekening (otomatis)
- Nama Rekening (otomatis)
- Tanggal
- Keterangan
- Nominal (Gunakan awalan `=-` jika nominal bersifat mengurangi/potongan, contoh: `=-50000`)

# 8. Master Data

## Master Vendor / Kepada
- Nama
- Bank
- Nomor Rekening
- Nama Rekening

## Master COA
- Nomor Akun
- Nama Akun

# 9. Journal Entry

Diisi oleh Accounting 2.

Field:
- Nomor Akun
- Nama Akun (otomatis dari Master COA)
- Debit
- Kredit
- Tampilkan pada Voucher (checkbox)

Mendukung multiple rows.

# 10. Notes

Accounting 1,2,3 dapat memberi catatan.
Semua role dapat melihat.
Catatan hanya tampil di website dan audit log.
Tidak dimasukkan ke PDF.

# 11. Attachment & File Archiving

Hak Akses:
- Semua role dapat Upload, Replace jika salah, dan Download Preview.

Struktur File (Merged PDF):
- Sistem hanya menghasilkan satu file PDF gabungan (Final PDF).
- Urutan Halaman PDF:
  1. Halaman 1: Voucher Pengeluaran (Selalu di urutan pertama).
  2. Halaman 2 dan seterusnya: Berisi dokumen lampiran yang diurutkan secara kronologis berdasarkan waktu (tanggal & jam) dokumen tersebut diunggah. Lampiran yang diunggah lebih dulu (berdasarkan timeframe) akan menjadi halaman ke-2, dan seterusnya.

File Archiving (Penelusuran Lampiran):
- Sistem memiliki pendataan arsip (metadata) untuk setiap file yang masuk. 
- Setiap file lampiran yang diunggah tercatat informasinya: nama file asli, waktu unggah (timestamp), siapa yang mengunggah (user/role), dan terikat/merujuk pada Nomor Voucher berapa. 

Penyimpanan:
- Disimpan di Server dan Google Drive.

# 12. PDF & Digital Signature

Nama file:
[Nomor Voucher] - [Keterangan] - Rp[Jumlah].pdf

Digital Signature (Tanda Tangan Digital):
- Website menyimpan master file/foto tanda tangan digital untuk masing-masing user.
- Preview PDF (In Progress): Untuk menghindari overload sistem (render gambar berat), Preview PDF cukup menampilkan teks penanda (contoh: "Approved by [Nama Role]") atau cap/stamp sederhana di kolom persetujuan bagi role yang sudah melakukan approve.
- Final PDF (Completed): Setelah mencapai status Final Approve, sistem akan merender gambar tanda tangan digital asli secara lengkap dari seluruh approver ke halaman pertama PDF (Voucher Pengeluaran).

Jika amendment:
- Generate ulang PDF
- Replace file lama
- Nama file tetap

# 13. Amendment

Role:
- Accounting 1
- Accounting 2

Boleh mengubah:
- Keterangan
- Journal
- Lampiran

Tidak perlu approval ulang.
Approval lama tetap berlaku.
Audit log wajib dibuat.

# 14. Audit Log & Timeline

Data yang Disimpan:
- Approval
- Reject
- Hold
- Amendment
- Upload File
- Soft Delete

Timeline Visual (UI):
- Riwayat (audit log) wajib ditampilkan dalam bentuk Timeline vertikal pada antarmuka website (di halaman detail voucher). 
- Setiap aktivitas direkam dengan jelas alurnya (Contoh: 08:00 Admin Create Voucher → 09:00 Acc 3 Upload Lampiran → 09:15 Acc 3 Approve). 
- Berfungsi agar seluruh user bisa melacak pergerakan, aktivitas, dan posisi voucher secara real-time.

# 15. Google Sheet Synchronization

Trigger:
Accounting 2 Approve

Flow:
Website -> n8n -> Google Sheet

Kolom:
A Tanggal
B Nomor Voucher
C Nomor Akun
D Nama Akun
E Keterangan
F Debit
G Kredit

Business Rules:
- Multiple row per voucher.
- Nama akun berasal dari Master COA.
- Google Sheet tidak boleh diedit manual.
- Website adalah source of truth.

Amendment:
- Cari seluruh baris berdasarkan Nomor Voucher.
- Replace/update dengan data terbaru.
- Tidak membuat baris baru.

# 16. Dashboard

Menampilkan:
- Draft
- Pending
- Completed
- Cancelled

Filter:
- Status
- Role
- Periode

# 17. Business Rules

- Nomor voucher manual dan unik.
- Nominal mendukung operasi pengurangan/potongan dengan menginput awalan `=-`.
- Soft delete menggunakan status CANCELLED.
- Semua attachment dapat diganti.
- Semua role dapat download preview.
- Amendment tidak mengulang workflow.
- Render full digital signature hanya dieksekusi pada Final PDF, sedangkan Preview PDF menggunakan teks/penanda approve.
- PDF final selalu terdiri dari voucher + lampiran (diurutkan berdasarkan timeframe upload).
- Website menjadi pusat seluruh perubahan data.

# 18. Future Roadmap

- ERP Integration
- OCR Invoice
- AI Metadata Extraction
- Excel Export

# 19. Development Priority

Phase 1
- Authentication
- Master Data
- Voucher (termasuk input `=-` nominal)
- Workflow
- Attachment & Archiving

Phase 2
- PDF Merge & Digital Signature Management
- Amendment
- Audit Log & Timeline UI
- Dashboard

Phase 3
- Google Sheet Sync
- Google Drive Sync
- Notification
- Future Integration
