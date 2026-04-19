// app/api/data/route.js
import { NextResponse } from 'next/server';
import { upsertHelmet } from '@/lib/store';

// Allow ESP8266 to POST without CORS issues
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// POST /api/data
// Body (JSON): { id, temp, hum, gas, hr, alert, lat, lon }
// ESP8266 sends: application/json
export async function POST(request) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const result = upsertHelmet(body);
    console.log(`[DATA] ${body.id} | T:${body.temp} H:${body.hum} G:${body.gas} HR:${body.hr} AL:${body.alert} | ${result.status}`);

    return NextResponse.json(
      { ok: true, status: result.status },
      { headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }
}
