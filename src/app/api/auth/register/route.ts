import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encryptFields } from '@/app/lib/utils/crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SENSITIVE_FIELDS = ['phone', 'address', 'birthday'] as const;

export async function POST(req: NextRequest) {
  try {
    const { email, password, profile } = await req.json();

    // 1. Sign up normally first
    const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      console.error('[register] signUp error:', signUpError);
      return NextResponse.json({ error: signUpError.message }, { status: 400 });
    }

    const userId = signUpData.user!.id;

    // 2. Force confirm the email via admin
    const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });

    if (confirmError) {
      console.error('[register] confirm error:', confirmError);
      // Non-fatal — continue anyway
    }

    // 3. Encrypt PII fields
    const encrypted = encryptFields(
      {
        id:          userId,
        email,
        firstName:   profile.firstName,
        lastName:    profile.lastName,
        username:    profile.username,
        phone:       profile.phone,
        address:     profile.address,
        birthday:    profile.birthday,
        civilStatus: profile.civilStatus,
        role:        profile.role ?? 'resident',
    avatar_base64:  profile.avatar_base64 ?? null,
      },
      [...SENSITIVE_FIELDS]
    );

    // 4. Insert encrypted profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert(encrypted);

    if (profileError) {
      console.error('[register] profile error:', profileError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err: any) {
    console.error('[register] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}