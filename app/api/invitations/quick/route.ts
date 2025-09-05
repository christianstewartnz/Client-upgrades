import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST /api/invitations/quick
// Creates an invitation for the most recently created unit with a test client
export async function POST(_request: NextRequest) {
  try {
    // 1) Find most recent unit
    const { data: unit, error: unitErr } = await supabase
      .from('units')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (unitErr || !unit?.id) {
      console.error('No unit found or error:', unitErr)
      return NextResponse.json({ error: 'No unit found to invite' }, { status: 400 })
    }

    // 2) Ensure a test client exists (by email)
    const email = 'testbuyer@example.com'
    const name = 'Test Buyer'

    const { data: existing, error: findErr } = await supabase
      .from('clients')
      .select('id')
      .ilike('email', email)
      .single()

    if (findErr && findErr.code !== 'PGRST116') {
      console.warn('Find client warning:', findErr)
    }

    let clientId = existing?.id
    if (!clientId) {
      const { data: inserted, error: insErr } = await supabase
        .from('clients')
        .insert({ name, email })
        .select('id')
        .single()
      if (insErr) {
        console.error('Insert client error:', insErr)
        return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
      }
      clientId = inserted!.id
    }

    // 3) Create invitation
    const token = crypto.randomUUID().replace(/-/g, '')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 14)

    const { data: invite, error: invErr } = await supabase
      .from('invitations')
      .insert({ client_id: clientId, unit_id: unit.id, token, expires_at: expiresAt.toISOString() })
      .select('id, token')
      .single()
    if (invErr) {
      console.error('Invite error:', invErr)
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
    }

    // 4) Update unit username to token (compatible with client portal lookup)
    const { error: updErr } = await supabase
      .from('units')
      .update({ username: token })
      .eq('id', unit.id)
    if (updErr) {
      console.error('Update unit token error:', updErr)
      return NextResponse.json({ error: 'Invitation created but failed to update unit token' }, { status: 500 })
    }

    const link = `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/client/${token}`
    return NextResponse.json({ success: true, invitationId: invite.id, token, link })
  } catch (error) {
    console.error('Quick invite error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
} 