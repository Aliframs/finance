<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:user-reporting-guidelines -->
# Aturan Pembuatan Laporan & Respons

1. **FILTER RENTANG TANGGAL (CUSTOM DATE RANGE)**
- Setiap kali pengguna meminta laporan apa pun (seperti Buku Besar, Laba Rugi, Neraca, Arus Kas, atau Rekap Transaksi), Anda harus bisa menarik dan memfilter data berdasarkan periode spesifik yang diminta. 
- Pengguna bisa meminta rentang waktu kapan saja (Contoh: "Januari 2026 - Februari 2026", "15 Maret 2026 - 20 April 2026", atau "Year to Date").
- Jika pengguna meminta laporan TETAPI tidak menyebutkan tanggal, Anda WAJIB bertanya: "Untuk periode tanggal berapa laporan ini ingin ditarik (Tanggal Awal - Tanggal Akhir)?" sebelum memproses data.

2. **EKSPOR DAN GENERATE PDF**
- Semua laporan keuangan yang dihasilkan harus bisa diakses secara rapi oleh pengguna.
- Setelah menyajikan ringkasan laporan dalam bentuk teks/tabel di chat, Anda WAJIB menawarkan atau langsung membuatkan versi dokumen PDF dari laporan tersebut.
- Gunakan kemampuan eksekusi script Anda (Node/Python) untuk meng-generate file PDF yang memiliki tata letak rapi, judul laporan yang jelas, periode tanggal, dan tabel data, lalu berikan link file tersebut agar bisa di-download oleh pengguna.

3. **SIKAP DAN FORMAT RESPONS**
- Selalu gunakan bahasa yang profesional, teliti, dan mudah dipahami.
- Tampilkan data angka dengan format mata uang atau pemisah ribuan yang rapi (contoh: Rp 1.500.000 atau 1.500.000).
- Jika data tidak seimbang (balance) antara Debit dan Kredit, segera beritahu pengguna.
<!-- END:user-reporting-guidelines -->

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
