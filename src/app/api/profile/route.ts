import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encryptFields, decryptFields } from '@/app/lib/utils/crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Snake_case DB columns that are encrypted at rest.
const SENSITIVE_FIELDS = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'address',
  'birthday',
  'civil_status',
] as const;

// Remap DB snake_case row → camelCase for the client.
function toClientShape(row: Record<string, any>) {
  return {
    ...row,
    firstName:   row.first_name,
    lastName:    row.last_name,
    civilStatus: row.civil_status,
  };
}

// ── GET /api/profile?id=xxx ───────────────────────────────────────────────────
// Fetches and decrypts ALL sensitive profile fields.
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
    return NextResponse.json({ data: toClientShape(decrypted) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PATCH /api/profile?id=xxx ─────────────────────────────────────────────────
// Encrypts PII fields then updates the profile row.
export async function PATCH(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const body = await req.json();

    // Map camelCase keys from the client → snake_case DB columns.
    const mapped: Record<string, any> = {
      ...(body.firstName   !== undefined && { first_name:   body.firstName }),
      ...(body.lastName    !== undefined && { last_name:    body.lastName }),
      ...(body.civilStatus !== undefined && { civil_status: body.civilStatus }),
      ...(body.phone       !== undefined && { phone:        body.phone }),
      ...(body.address     !== undefined && { address:      body.address }),
      ...(body.birthday    !== undefined && { birthday:     body.birthday }),
      ...(body.username    !== undefined && { username:     body.username }),
    };

    // Encrypt only the sensitive fields that are present in the payload.
    const fieldsToEncrypt = SENSITIVE_FIELDS.filter(f => f in mapped);
    const encrypted = encryptFields(mapped, fieldsToEncrypt);

    const { data, error } = await supabase
      .from('profiles')
      .update(encrypted)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Decrypt and return camelCase so the UI can display it immediately.
    const decrypted = decryptFields(data, [...SENSITIVE_FIELDS]);
    return NextResponse.json({ data: toClientShape(decrypted) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}