import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { VoucherPDF } from '@/components/VoucherPDF';
import { renderToBuffer } from '@react-pdf/renderer';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Fetch complete voucher data
    const voucher = await prisma.voucher.findUnique({
      where: { id },
      include: {
        vendor: true,
        items: true,
        journals: { include: { coa: true } },
        auditLogs: { include: { user: true } },
        attachments: true
      }
    });

    if (!voucher) {
      return NextResponse.json({ error: 'Voucher not found' }, { status: 404 });
    }

    // 2. Generate the React-PDF document for the Voucher Cover
    // Note: React elements must be created explicitly here if we use renderToBuffer in a route.
    // However, VoucherPDF is a function that returns a React element.
    const reactPdfElement = VoucherPDF({ voucher });
    const coverBuffer = await renderToBuffer(reactPdfElement);

    // 3. Load the generated cover into pdf-lib
    const mainPdfDoc = await PDFDocument.load(coverBuffer);

    // 4. Find and append PDF attachments
    if (voucher.attachments && voucher.attachments.length > 0) {
      for (const attachment of voucher.attachments) {
        // Only merge PDF files
        if (attachment.originalName.toLowerCase().endsWith('.pdf') || attachment.filePath.toLowerCase().endsWith('.pdf')) {
          try {
            // Attachment filePath is actually the URL path like '/uploads/filename.ext'
            // We need to resolve this to the local filesystem path in the 'public' directory
            const localPath = path.join(process.cwd(), 'public', attachment.filePath);
            
            const attachmentBytes = await fs.readFile(localPath);
            const attachmentPdf = await PDFDocument.load(attachmentBytes);
            
            // Copy pages from attachment to main document
            const copiedPages = await mainPdfDoc.copyPages(attachmentPdf, attachmentPdf.getPageIndices());
            copiedPages.forEach((page) => {
              mainPdfDoc.addPage(page);
            });
          } catch (err) {
            console.error(`Failed to merge attachment ${attachment.originalName}:`, err);
            // We continue with the rest if one fails
          }
        }
      }
    }

    // 5. Save the final merged document
    const finalPdfBytes = await mainPdfDoc.save();
    
    // 6. Return as a downloadable PDF
    return new NextResponse(Buffer.from(finalPdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Voucher_${voucher.voucherNumber}.pdf"`
      }
    });
  } catch (error) {
    console.error('GET /api/vouchers/[id]/pdf error:', error);
    return NextResponse.json({ error: 'Internal server error generating PDF' }, { status: 500 });
  }
}
