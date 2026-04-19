// app/api/status/route.js
import { NextResponse } from 'next/server';
import { getAllHelmets } from '@/lib/store';

export async function GET() {
  return NextResponse.json({
    ok:      true,
    helmets: getAllHelmets().length,
    time:    new Date().toISOString(),
  });
}
