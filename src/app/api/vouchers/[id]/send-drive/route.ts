import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { VoucherPDF } from '@/components/VoucherPDF';
import { renderToBuffer } from '@react-pdf/renderer';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import { google } from 'googleapis';
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-helpers';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (user.role !== 'ADMIN') return forbiddenResponse('Hanya Admin yang dapat mengirim ke Google Drive');

    const { id } = await params;

    // Check environment variables
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const folderId = process.env.DRIVE_FOLDER_ID;

    if (!clientEmail || !privateKey || !folderId) {
      return NextResponse.json({ error: 'Kredensial Google Drive belum dikonfigurasi di .env' }, { status: 500 });
    }

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
    const reactPdfElement = VoucherPDF({ voucher });
    const coverBuffer = await renderToBuffer(reactPdfElement);

    // 3. Load the generated cover into pdf-lib
    const mainPdfDoc = await PDFDocument.load(coverBuffer);

    // 4. Find and append PDF attachments
    if (voucher.attachments && voucher.attachments.length > 0) {
      for (const attachment of voucher.attachments) {
        if (attachment.originalName.toLowerCase().endsWith('.pdf') || attachment.filePath.toLowerCase().endsWith('.pdf')) {
          try {
            const localPath = path.join(process.cwd(), 'public', attachment.filePath);
            const attachmentBytes = await fs.readFile(localPath);
            const attachmentPdf = await PDFDocument.load(attachmentBytes);
            
            const copiedPages = await mainPdfDoc.copyPages(attachmentPdf, attachmentPdf.getPageIndices());
            copiedPages.forEach((page) => {
              mainPdfDoc.addPage(page);
            });
          } catch (err) {
            console.error(`Failed to merge attachment ${attachment.originalName}:`, err);
          }
        }
      }
    }

    // 5. Save the final merged document
    const finalPdfBytes = await mainPdfDoc.save();
    const fileName = `Voucher_${voucher.voucherNumber}.pdf`;

    // 6. Upload to Google Drive
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });

    const { Readable } = require('stream');
    const bufferStream = new Readable();
    bufferStream.push(Buffer.from(finalPdfBytes));
    bufferStream.push(null);

    const fileMetadata = {
      name: fileName,
      parents: [folderId]
    };
    const media = {
      mimeType: 'application/pdf',
      body: bufferStream
    };

    const driveRes = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink'
    });

    return NextResponse.json({ 
      success: true, 
      driveId: driveRes.data.id,
      link: driveRes.data.webViewLink,
      message: 'Berhasil dikirim ke Google Drive'
    });

  } catch (error: any) {
    console.error('POST /api/vouchers/[id]/send-drive error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error uploading to Drive' }, { status: 500 });
  }
}
