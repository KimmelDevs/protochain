import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Human-readable field labels
const FIELD_LABELS: Record<string, string> = {
  firstName:   'First name',
  lastName:    'Last name',
  email:       'Email',
  phone:       'Phone',
  address:     'Address',
  birthday:    'Birthday',
  civilStatus: 'Civil status',
  username:    'Username',
};

// ── POST /api/profile-history ─────────────────────────────────────────────────
// Called by the profile PATCH handler to record changes.
// Body: { userId, userEmail, userName, changes: { field, oldValue, newValue }[] }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, userEmail, userName, changes } = body;

    if (!userId || !changes?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const rows = changes.map((c: { field: string; oldValue: string; newValue: string }) => ({
      user_id:    userId,
      user_email: userEmail ?? null,
      user_name:  userName  ?? null,
      field_name: c.field,
      field_label: FIELD_LABELS[c.field] ?? c.field,
      old_value:  c.oldValue ?? '',
      new_value:  c.newValue ?? '',
    }));

    const { error } = await supabase
      .from('profile_change_history')
      .insert(rows);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── GET /api/profile-history ──────────────────────────────────────────────────
// Fetches recent profile changes for superadmin view.
// Query params: ?limit=50&userId=xxx (optional filter by user)
export async function GET(req: NextRequest) {
  try {
    const url   = new URL(req.url);
    const limit  = parseInt(url.searchParams.get('limit') ?? '100', 10);
    const userId = url.searchParams.get('userId');

    let query = supabase
      .from('profile_change_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (userId) query = query.eq('user_id', userId);

    const { data, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ data: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
