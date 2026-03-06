import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encryptFields, decryptFields } from '@/app/lib/utils/crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ALL sensitive fields that get encrypted on write and decrypted on read.
// Must stay in sync with what encryptFields() writes.
const SENSITIVE_FIELDS = [
  // Common
  'additional_info',
  'purpose',
  'custom_purpose',
  // Barangay Clearance
  'purok',
  'ctc_no',
  'ctc_date_issued',
  'ctc_place_issued',
  // Business Clearance
  'business_name',
  // Certification of Death
  'deceased_name',
  'deceased_age',
  'date_of_death',
  'place_of_death',
  'relationship_to_deceased',
  // Job Seeker / Oath of Undertaking
  'bcn_no',
  'years_of_residency',
  // Notes (set by admin on approve/reject)
  'notes',
] as const;

// ── POST /api/requests ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const encrypted = encryptFields(body, [...SENSITIVE_FIELDS]);

    const { data, error } = await supabase
      .from('requests')
      .insert(encrypted)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Return decrypted so the client gets clean data immediately
    const decrypted = decryptFields(data, [...SENSITIVE_FIELDS]);
    return NextResponse.json({ data: decrypted }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── GET /api/requests ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get('user_id');
    const id      = searchParams.get('id');
    const status  = searchParams.get('status');

    let query = supabase.from('requests').select('*');
    if (id)      query = query.eq('id', id);
    if (user_id) query = query.eq('user_id', user_id);
    if (status)  query = query.eq('status', status);
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const decrypted = (data ?? []).map(row =>
      decryptFields(row, [...SENSITIVE_FIELDS])
    );

    return NextResponse.json({ data: decrypted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PATCH /api/requests — admin updates status/notes/file ────────────────────
// Used by approve, reject, and file upload actions.
// Encrypts any sensitive fields in the update payload before writing.
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const body = await req.json();

    // Only encrypt fields that are in SENSITIVE_FIELDS and present in the payload
    const fieldsToEncrypt = SENSITIVE_FIELDS.filter(f => f in body);
    const payload = fieldsToEncrypt.length > 0
      ? encryptFields(body, fieldsToEncrypt)
      : body;

    const { data, error } = await supabase
      .from('requests')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const decrypted = decryptFields(data, [...SENSITIVE_FIELDS]);
    return NextResponse.json({ data: decrypted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}