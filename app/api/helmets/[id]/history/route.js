// app/api/helmets/[id]/history/route.js
import { NextResponse } from 'next/server';
import { getHelmet } from '@/lib/store';

export async function GET(request, { params }) {
  const h = getHelmet(params.id);
  if (!h) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(h.history);
}
