import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const QR_SIGNING_SECRET =
  process.env.QR_SIGNING_SECRET || 'salahnear_secure_mosque_hmac_secret_2026_kerala';

function generateHmacSignature(mosqueId: string, session: string, timestamp: number): string {
  const data = `${mosqueId}:${session}:${timestamp}`;
  return crypto.createHmac('sha256', QR_SIGNING_SECRET).update(data).digest('hex').substring(0, 16);
}

// GET /api/qr?mosqueId=m1&session=fajr
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mosqueId = searchParams.get('mosqueId') || 'm1';
  const session = searchParams.get('session') || 'fajr';
  const timestamp = Date.now();
  const signature = generateHmacSignature(mosqueId, session, timestamp);

  const payload = `salahnear://mosque/${mosqueId}?session=${session}&ts=${timestamp}&sig=${signature}`;

  return NextResponse.json({
    success: true,
    mosque_id: mosqueId,
    session,
    timestamp,
    expires_in_seconds: 60,
    expires_at: timestamp + 60 * 1000,
    signature,
    payload,
  });
}

// POST /api/qr (Validate token from Flutter scanner)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mosqueId, session, timestamp, signature } = body;

    if (!mosqueId || !session || !timestamp || !signature) {
      return NextResponse.json(
        { valid: false, error: 'Missing token parameters' },
        { status: 400 }
      );
    }

    const now = Date.now();
    const tokenTime = Number(timestamp);

    // Reject tokens older than 90 seconds or in the future by > 10 seconds
    if (now - tokenTime > 90 * 1000 || tokenTime - now > 10 * 1000) {
      return NextResponse.json(
        { valid: false, error: 'Token expired or invalid timestamp' },
        { status: 400 }
      );
    }

    // Verify cryptographic signature
    const expectedSig = generateHmacSignature(mosqueId, session, tokenTime);
    if (signature !== expectedSig) {
      return NextResponse.json(
        { valid: false, error: 'Cryptographic signature mismatch (tampered token)' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      valid: true,
      mosque_id: mosqueId,
      session,
      verified_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { valid: false, error: err.message || 'Validation failed' },
      { status: 500 }
    );
  }
}

