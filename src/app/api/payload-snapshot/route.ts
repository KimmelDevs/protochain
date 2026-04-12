import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const hash = searchParams.get('hash');
    if (!hash) return NextResponse.json({ error: 'Missing hash' }, { status: 400 });

    const { data, error } = await supabase
      .from('requests')
      .select('payload_snapshot')
      .eq('payload_hash', hash)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ payload_snapshot: data?.payload_snapshot ?? null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
