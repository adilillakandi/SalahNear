import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/invite/accept?token=... -> Verify invitation token details
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { success: false, code: 'INVALID_TOKEN', message: 'Invitation token is missing.' },
      { status: 400 }
    );
  }

  try {
    // 1. Try RPC procedure
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_invitation_details', {
      p_token: token.trim(),
    });

    if (!rpcError && rpcData) {
      return NextResponse.json(rpcData);
    }

    // 2. Direct table lookup fallback
    const { data: inv, error: invError } = await supabase
      .from('admin_invitations')
      .select('id, email, full_name, role, mosque_id, status, expires_at, mosques:mosque_id(name)')
      .eq('token', token.trim())
      .single();

    if (invError || !inv) {
      return NextResponse.json(
        { success: false, code: 'NOT_FOUND', message: 'Invitation not found or link has expired.' },
        { status: 404 }
      );
    }

    if (inv.status === 'accepted') {
      return NextResponse.json({
        success: false,
        code: 'ALREADY_ACCEPTED',
        message: 'This invitation has already been accepted.',
        email: inv.email,
        full_name: inv.full_name,
        role: inv.role,
      });
    }

    if (inv.status === 'revoked') {
      return NextResponse.json({
        success: false,
        code: 'REVOKED',
        message: 'This invitation has been revoked by the Super Administrator.',
      });
    }

    if (new Date(inv.expires_at) < new Date()) {
      return NextResponse.json({
        success: false,
        code: 'EXPIRED',
        message: 'This invitation has expired. Please request a new invitation.',
      });
    }

    const mosqueName = (inv.mosques as any)?.name;

    return NextResponse.json({
      success: true,
      invitation: {
        id: inv.id,
        email: inv.email,
        full_name: inv.full_name,
        role: inv.role,
        mosque_name: mosqueName,
        expires_at: inv.expires_at,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, code: 'SERVER_ERROR', message: err.message || 'Internal verification error.' },
      { status: 500 }
    );
  }
}

// POST /api/invite/accept -> Accept invitation and activate account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, code: 'INVALID_TOKEN', message: 'Token is required.' },
        { status: 400 }
      );
    }

    // 1. Try RPC procedure
    const { data: rpcData, error: rpcError } = await supabase.rpc('accept_admin_invitation', {
      p_token: token.trim(),
    });

    if (!rpcError && rpcData) {
      return NextResponse.json(rpcData);
    }

    // 2. Direct table fallback
    const { data: inv } = await supabase
      .from('admin_invitations')
      .select('*')
      .eq('token', token.trim())
      .single();

    if (!inv) {
      return NextResponse.json(
        { success: false, code: 'NOT_FOUND', message: 'Invitation not found.' },
        { status: 404 }
      );
    }

    // Update status to accepted
    await supabase
      .from('admin_invitations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', inv.id);

    // Activate in user_roles
    await supabase
      .from('user_roles')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('role', inv.role);

    return NextResponse.json({
      success: true,
      email: inv.email,
      full_name: inv.full_name,
      role: inv.role,
      message: 'Invitation accepted successfully! Your administrator account is now active.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to accept invitation.' },
      { status: 500 }
    );
  }
}
