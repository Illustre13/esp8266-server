import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { upsertHelmet } from '@/lib/store';

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
// Body: { id, temp, hum, gas, hr, alert, lat, lon }
export async function POST(request) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Update in-memory store (for live dashboard)
    const result = upsertHelmet(body);

    // Persist to MongoDB
    try {
      const client = await clientPromise;
      const db = client.db();
      const now = new Date();

      // Upsert latest helmet state
      await db.collection('helmets').updateOne(
        { id: body.id },
        { $set: { ...body, status: result.status, updatedAt: now } },
        { upsert: true }
      );

      // Append to readings history
      await db.collection('readings').insertOne({
        helmetId: body.id,
        temp:     parseFloat(body.temp)  || 0,
        hum:      parseFloat(body.hum)   || 0,
        gas:      parseFloat(body.gas)   || 0,
        hr:       parseInt(body.hr)      || 0,
        alert:    parseInt(body.alert)   || 0,
        lat:      parseFloat(body.lat)   || 0,
        lon:      parseFloat(body.lon)   || 0,
        status:   result.status,
        ts:       now,
      });

      console.log(`[DB] ${body.id} saved | ${result.status}`);
    } catch (dbErr) {
      console.error('[DB ERROR]', dbErr.message);
      // Still return OK — don't fail the ESP8266 POST if DB is down
    }

    console.log(`[DATA] ${body.id} | T:${body.temp} H:${body.hum} G:${body.gas} HR:${body.hr} AL:${body.alert} | ${result.status}`);

    return NextResponse.json(
      { ok: true, status: result.status },
      { headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
}
