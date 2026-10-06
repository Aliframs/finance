import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { POPDF } from '@/components/POPDF';
import { renderToBuffer } from '@react-pdf/renderer';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        pic: true,
        items: true,
        auditLogs: { include: { user: true } },
      }
    });

    if (!po) {
      return NextResponse.json({ error: 'PO not found' }, { status: 404 });
    }

    const reactPdfElement = POPDF({ po });
    const pdfBuffer = await renderToBuffer(reactPdfElement);

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="PO_${po.poNumber}.pdf"`
      }
    });
  } catch (error) {
    console.error('GET /api/po/[id]/pdf error:', error);
    return NextResponse.json({ error: 'Internal server error generating PDF' }, { status: 500 });
  }
}
