// app/api/helmets/[id]/route.js
import { NextResponse } from 'next/server';
import { getHelmet, deleteHelmet } from '@/lib/store';

export async function GET(request, { params }) {
  const h = getHelmet(params.id);
  if (!h) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(h);
}

export async function DELETE(request, { params }) {
  const ok = deleteHelmet(params.id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true, message: `${params.id} removed` });
}
