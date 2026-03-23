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

    const { data, error } = await supabase
      .from('requests')
      .insert(encrypted)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

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

    const decrypted = (data ?? []).map(row => decryptFields(row, [...SENSITIVE_FIELDS]));
    return NextResponse.json({ data: decrypted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PATCH /api/requests ───────────────────────────────────────────────────────
// Handles: approve, reject, file upload.
// Writes an audit_log row for every status change and file upload.
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const body = await req.json();

    // ── Resolve the acting admin ──────────────────────────────────────────────
    // The client passes `admin_id` in the body (set from supabase.auth.getUser()
    // on the client). We use it only for audit logging — never for access control.
    const adminId    = body.admin_id    ?? null;
    const adminEmail = body.admin_email ?? null;

    // Strip audit meta fields before writing to requests table
    const { admin_id: _aid, admin_email: _aem, ...updatePayload } = body;

    // ── Encrypt sensitive fields ──────────────────────────────────────────────
    const fieldsToEncrypt = SENSITIVE_FIELDS.filter(f => f in updatePayload);
    const payload = fieldsToEncrypt.length > 0
      ? encryptFields(updatePayload, fieldsToEncrypt)
      : updatePayload;

    // ── Track approved_by / rejected_by ───────────────────────────────────────
    if (updatePayload.status === 'approved' && adminId) {
      (payload as any).approved_by = adminId;
    }
    if (updatePayload.status === 'rejected' && adminId) {
      (payload as any).rejected_by = adminId;
    }

    // ── Update the request row ────────────────────────────────────────────────
    const { data, error } = await supabase
      .from('requests')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // ── Write audit log ───────────────────────────────────────────────────────
    // Determine what action was taken
    let action: string | null = null;
    let notes: string | null  = null;

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
      // Fire-and-forget — don't block the response on audit write
      supabase.from('audit_logs').insert({
        request_id:      id,
        action,
        performed_by:    adminId,
        performer_email: adminEmail,
        notes,
      }).then(({ error: auditErr }) => {
        if (auditErr) console.error('[audit] Failed to write log:', auditErr.message);
      });
    }

    const decrypted = decryptFields(data, [...SENSITIVE_FIELDS]);
    return NextResponse.json({ data: decrypted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}