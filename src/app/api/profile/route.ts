import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encryptFields, decryptFields } from '@/app/lib/utils/crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SENSITIVE_FIELDS = ['phone', 'address', 'birthday'] as const;

// ── GET /api/profile?id=xxx ──────────────────────────────────────────────────
// Fetches and decrypts a profile row.
export async function GET(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const decrypted = decryptFields(data, [...SENSITIVE_FIELDS]);
    return NextResponse.json({ data: decrypted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PATCH /api/profile?id=xxx ────────────────────────────────────────────────
// Encrypts PII fields then updates the profile row.
export async function PATCH(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const body = await req.json();

    // Only encrypt fields that are present in the update payload
    const fieldsToEncrypt = SENSITIVE_FIELDS.filter(f => f in body);
    const encrypted = encryptFields(body, fieldsToEncrypt);

    const { data, error } = await supabase
      .from('profiles')
      .update(encrypted)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Return decrypted so the UI can display it immediately
    const decrypted = decryptFields(data, [...SENSITIVE_FIELDS]);
    return NextResponse.json({ data: decrypted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}