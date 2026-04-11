import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FIELD_LABELS: Record<string, string> = {
  purpose:                  'Purpose',
  custom_purpose:           'Custom purpose',
  additional_info:          'Additional info',
  purok:                    'Purok / Zone',
  ctc_no:                   'CTC number',
  ctc_date_issued:          'CTC date issued',
  ctc_place_issued:         'CTC place issued',
  business_name:            'Business name',
  deceased_name:            'Deceased name',
  deceased_age:             'Age at death',
  date_of_death:            'Date of death',
  place_of_death:           'Place of death',
  relationship_to_deceased: 'Relationship',
  years_of_residency:       'Years of residency',
  bcn_no:                   'BCN number',
};

// ── POST /api/request-edits ───────────────────────────────────────────────────
// Body: { requestId, userId, userEmail, userName, changes: {field, oldValue, newValue}[] }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { requestId, userId, userEmail, userName, changes } = body;

    if (!requestId || !userId || !changes?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const rows = changes.map((c: { field: string; oldValue: string; newValue: string }) => ({
      request_id:  requestId,
      user_id:     userId,
      user_email:  userEmail ?? null,
      user_name:   userName  ?? null,
      field_name:  c.field,
      field_label: FIELD_LABELS[c.field] ?? c.field,
      old_value:   c.oldValue ?? '',
      new_value:   c.newValue ?? '',
    }));

    const { error } = await supabase.from('request_edit_history').insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── GET /api/request-edits?requestId=xxx ─────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const requestId = new URL(req.url).searchParams.get('requestId');
    if (!requestId) return NextResponse.json({ error: 'Missing requestId' }, { status: 400 });

    const { data, error } = await supabase
      .from('request_edit_history')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ data: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
