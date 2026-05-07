import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/payload-snapshot?hash=<hex>[&lookup=<column>]
 *
 * Resolves a file hash → { payload_snapshot, payload_hash } so the verify
 * page can look up the on-chain payload_hash from whatever hash the user
 * supplies (QR scan, manual paste, or file upload).
 *
 * lookup param
 * ────────────
 * "file_hash"       (default) — QR scan / manual hash paste path.
 *                   Queries the pre-QR blob hash encoded in the QR URL.
 *                   Falls back to final_file_hash if no row is found, so an
 *                   uploaded plain file (no QR injection) still resolves. ✓
 *
 * "final_file_hash" — File-upload verify path.
 *                   Queries ONLY the post-QR blob hash (SHA-256 of the file
 *                   the user actually downloaded). No fallback — if the hash
 *                   doesn't match final_file_hash the document is not found. ✓
 *
 * Both columns point to the same request row, so whichever path matches,
 * the returned payload_hash is always the value recorded on-chain.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const hash   = searchParams.get('hash');
    const lookup = searchParams.get('lookup') ?? 'file_hash';

    if (!hash) return NextResponse.json({ error: 'Missing hash' }, { status: 400 });

    // ── Upload path: query final_file_hash only ───────────────────────────
    if (lookup === 'final_file_hash') {
      const { data, error } = await supabase
        .from('requests')
        .select('payload_snapshot, payload_hash')
        .eq('final_file_hash', hash)
        .maybeSingle();

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });

      return NextResponse.json({
        payload_snapshot: data?.payload_snapshot ?? null,
        payload_hash:     data?.payload_hash     ?? null,
      });
    }

    // ── QR scan / manual hash paste path: query file_hash first ──────────
    const { data: byFileHash, error: err1 } = await supabase
      .from('requests')
      .select('payload_snapshot, payload_hash')
      .eq('file_hash', hash)
      .maybeSingle();

    if (err1) return NextResponse.json({ error: err1.message }, { status: 400 });

    if (byFileHash) {
      return NextResponse.json({
        payload_snapshot: byFileHash.payload_snapshot ?? null,
        payload_hash:     byFileHash.payload_hash     ?? null,
      });
    }

    // ── Fallback: plain-file upload where QR was not injected ─────────────
    //   In this case file_hash === final_file_hash, so we check final_file_hash
    //   as a safety net for QR/manual callers that supply the same hash.
    const { data: byFinalHash, error: err2 } = await supabase
      .from('requests')
      .select('payload_snapshot, payload_hash')
      .eq('final_file_hash', hash)
      .maybeSingle();

    if (err2) return NextResponse.json({ error: err2.message }, { status: 400 });

    return NextResponse.json({
      payload_snapshot: byFinalHash?.payload_snapshot ?? null,
      payload_hash:     byFinalHash?.payload_hash     ?? null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}