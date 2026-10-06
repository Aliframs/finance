import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  const session = await auth();
  
  // Hanya ADMIN yang boleh mendownload
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let dbPath = process.env.DATABASE_URL?.replace('file:', '');
    
    // Fallback jika tidak ada env atau path salah
    if (!dbPath || !fs.existsSync(dbPath)) {
        dbPath = path.join(process.cwd(), 'dev.db');
    }

    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ error: 'Database file not found' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(dbPath);
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Disposition': 'attachment; filename=financeflow_dev.db',
        'Content-Type': 'application/x-sqlite3',
      },
    });
  } catch (error) {
    console.error('Error downloading DB:', error);
    return NextResponse.json({ error: 'Failed to download database' }, { status: 500 });
  }
}
