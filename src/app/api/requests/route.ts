import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encryptFields, decryptFields } from '@/app/lib/utils/crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SENSITIVE_FIELDS = [
  'additional_info', 'purpose', 'custom_purpose',
  'purok', 'ctc_no', 'ctc_date_issued', 'ctc_place_issued',
  'business_name',
  'deceased_name', 'deceased_age', 'date_of_death', 'place_of_death', 'relationship_to_deceased',
  'bcn_no', 'years_of_residency',
  'notes',
] as const;

// ── POST /api/requests ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const encrypted = encryptFields(body, [...SENSITIVE_FIELDS]);
    const { data, error } = await supabase.from('requests').insert(encrypted).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data: decryptFields(data, [...SENSITIVE_FIELDS]) }, { status: 201 });
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

    const decrypted = (data ?? []).map(row => decryptFields(row, [...SENSITIVE_FIELDS]));
    return NextResponse.json({ data: decrypted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PATCH /api/requests ───────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const body = await req.json();

    // ── Extract audit identity fields (never written to requests table) ──────
    const adminId    = body.admin_id    ?? null;
    const adminEmail = body.admin_email ?? null;
    const adminName  = body.admin_name  ?? null;   // ← decrypted real name

    const { admin_id: _a, admin_email: _b, admin_name: _c, ...updatePayload } = body;

    // ── Encrypt sensitive fields ──────────────────────────────────────────────
    const fieldsToEncrypt = SENSITIVE_FIELDS.filter(f => f in updatePayload);
    const payload = fieldsToEncrypt.length > 0
      ? encryptFields(updatePayload, fieldsToEncrypt)
      : updatePayload;

    // Track approved_by / rejected_by on the request row itself
    if (updatePayload.status === 'approved' && adminId) (payload as any).approved_by = adminId;
    if (updatePayload.status === 'rejected' && adminId) (payload as any).rejected_by = adminId;

    // ── Update request row ────────────────────────────────────────────────────
    const { data, error } = await supabase
      .from('requests').update(payload).eq('id', id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // ── Write audit log ───────────────────────────────────────────────────────
    let action: string | null = null;
    let notes:  string | null = null;

    if (updatePayload.status === 'approved') {
      action = 'approved';
      notes  = updatePayload.notes ?? null;
    } else if (updatePayload.status === 'rejected') {
      action = 'rejected';
      notes  = updatePayload.notes ?? null;
    } else if (updatePayload.file_url) {
      action = 'document_uploaded';
      notes  = `File: ${updatePayload.file_url.split('/').pop() ?? 'unknown'}`;
    }

    if (action) {
      supabase.from('audit_logs').insert({
        request_id:      id,
        action,
        performed_by:    adminId,
        performer_email: adminEmail,
        performer_name:  adminName,   // ← stored so the list page can show the real name
        notes,
      }).then(({ error: auditErr }) => {
        if (auditErr) console.error('[audit] write failed:', auditErr.message);
      });
    }

    return NextResponse.json({ data: decryptFields(data, [...SENSITIVE_FIELDS]) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}