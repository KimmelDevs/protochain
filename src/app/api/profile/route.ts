import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encryptFields, decryptFields } from '@/app/lib/utils/crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// DB columns that are encrypted at rest.
// These match the ACTUAL quoted camelCase column names in the profiles table
// e.g. "firstName", "lastName", "civilStatus".
const SENSITIVE_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'address',
  'birthday',
  'civilStatus',
] as const;

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
    return NextResponse.json({ data: decrypted });
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

    // The client sends camelCase keys which match the DB column names directly
    // ("firstName", "lastName", "civilStatus") so no remapping needed.
    const payload: Record<string, any> = {
      ...(body.firstName   !== undefined && { firstName:   body.firstName }),
      ...(body.lastName    !== undefined && { lastName:    body.lastName }),
      ...(body.civilStatus !== undefined && { civilStatus: body.civilStatus }),
      ...(body.phone       !== undefined && { phone:       body.phone }),
      ...(body.address     !== undefined && { address:     body.address }),
      ...(body.birthday    !== undefined && { birthday:    body.birthday }),
      ...(body.username    !== undefined && { username:    body.username }),
    };

    // Encrypt only the sensitive fields that are present in the payload.
    const fieldsToEncrypt = SENSITIVE_FIELDS.filter(f => f in payload);
    const encrypted = encryptFields(payload, fieldsToEncrypt);

    const { data, error } = await supabase
      .from('profiles')
      .update(encrypted)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Decrypt and return so the UI can display it immediately.
    const decrypted = decryptFields(data, [...SENSITIVE_FIELDS]);
    return NextResponse.json({ data: decrypted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}