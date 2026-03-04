import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encryptFields, decryptFields } from '@/app/lib/utils/crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// All sensitive fields across all document types
const SENSITIVE_FIELDS = [
  // Common
  'additional_info',
  // Barangay Clearance
  'ctc_no',
  'ctc_date_issued',
  'ctc_place_issued',
  'purok',
  // Business Clearance
  'business_name',
  // Certification of Death
  'deceased_name',
  'deceased_age',
  'date_of_death',
  'place_of_death',
  'relationship_to_deceased',
  // Job Seeker
  'bcn_no',
  'years_of_residency',
] as const;

// ── POST /api/requests — submit new request (encrypts sensitive fields) ───────
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
    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── GET /api/requests — fetch and decrypt requests ────────────────────────────
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

    // Decrypt all sensitive fields before returning to client
    const decrypted = (data ?? []).map(row =>
      decryptFields(row, [...SENSITIVE_FIELDS])
    );

    return NextResponse.json({ data: decrypted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}