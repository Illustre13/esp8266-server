// app/api/helmets/route.js
import { NextResponse } from 'next/server';
import { getAllHelmets } from '@/lib/store';

export async function GET() {
  return NextResponse.json(getAllHelmets());
}
