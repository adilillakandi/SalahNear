import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';
import { sendInvitationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, fullName, role, password, mosqueId } = body;

    if (!email || !fullName || !role || !password) {
      return NextResponse.json(
        { success: false, error: 'Email, Full Name, Role, and Password are required.' },
        { status: 400 }
      );
    }

    if (role !== 'super_admin' && role !== 'mosque_admin') {
      return NextResponse.json(
        { success: false, error: 'Role must be either super_admin or mosque_admin.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = fullName.trim();

    // 1. Fetch mosque name if mosque_admin
    let mosqueName: string | undefined;
    if (role === 'mosque_admin' && mosqueId) {
      const { data: mData } = await supabase
        .from('mosques')
        .select('name')
        .eq('id', mosqueId)
        .single();
      if (mData) mosqueName = mData.name;
    }

    let token = '';
    let rpcSuccess = false;

    // 2. Try calling create_admin_invitation RPC in Supabase
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('create_admin_invitation', {
        p_email: cleanEmail,
        p_password: password,
        p_full_name: cleanName,
        p_role: role,
        p_mosque_id: role === 'mosque_admin' ? mosqueId : null,
        p_invited_by: 'Super Admin',
      });

      if (!rpcError && rpcData?.token) {
        token = rpcData.token;
        rpcSuccess = true;
      }
    } catch {
      // Fallback below
    }

    // 3. Fallback token generation if table/RPC is not yet loaded in Supabase
    if (!token) {
      token = crypto.randomBytes(24).toString('hex');
      // Direct insertion attempt
      try {
        await supabase.from('admin_invitations').insert({
          email: cleanEmail,
          full_name: cleanName,
          role,
          mosque_id: role === 'mosque_admin' ? mosqueId : null,
          token,
          password_hash: crypto.createHash('sha256').update(password).digest('hex'),
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
      } catch {
        // Continue with token
      }
    }

    // 4. Determine host / origin for invitation URL
    const origin =
      request.headers.get('origin') ||
      request.headers.get('x-forwarded-host') ||
      request.nextUrl.origin ||
      'http://localhost:3000';

    const inviteUrl = `${origin.startsWith('http') ? origin : `https://${origin}`}/accept-invite?token=${token}`;

    // 5. Automatically send invitation email
    const emailResult = await sendInvitationEmail({
      toEmail: cleanEmail,
      recipientName: cleanName,
      role,
      mosqueName,
      password,
      inviteUrl,
    });

    return NextResponse.json({
      success: true,
      token,
      inviteUrl,
      email: cleanEmail,
      fullName: cleanName,
      role,
      mosqueName,
      emailSent: emailResult.success,
      emailMessage: emailResult.message,
    });
  } catch (err: any) {
    console.error('Invite API route failed:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to process invitation.' },
      { status: 500 }
    );
  }
}
