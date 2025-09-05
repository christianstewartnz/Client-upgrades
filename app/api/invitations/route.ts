import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST /api/invitations
// body: { unitId: string, client: { name: string, email: string, phone?: string }, expiresInDays?: number }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { unitId, client, expiresInDays = 14 } = body || {}

    if (!unitId || !client?.email || !client?.name) {
      return NextResponse.json({ error: 'unitId, client.name and client.email are required' }, { status: 400 })
    }

    // 1) Upsert client by email
    const { data: existingClient, error: findClientError } = await supabase
      .from('clients')
      .select('*')
      .ilike('email', client.email)
      .single()

    if (findClientError && findClientError.code !== 'PGRST116') {
      // PGRST116 = No rows found; treat as not found
      console.error('Find client error:', findClientError)
    }

    let clientId = existingClient?.id
    if (!clientId) {
      const { data: insertedClient, error: insertClientError } = await supabase
        .from('clients')
        .insert({ name: client.name, email: client.email, phone: client.phone ?? null })
        .select('id')
        .single()

      if (insertClientError) {
        console.error('Insert client error:', insertClientError)
        return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
      }
      clientId = insertedClient!.id
    }

    // 2) Generate token and expiry
    const token = crypto.randomUUID().replace(/-/g, '')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + Number(expiresInDays))

    // 3) Create invitation row
    const { data: invite, error: inviteError } = await supabase
      .from('invitations')
      .insert({ client_id: clientId, unit_id: unitId, token, expires_at: expiresAt.toISOString() })
      .select('id, token')
      .single()

    if (inviteError) {
      console.error('Insert invitation error:', inviteError)
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
    }

    // 4) Update the unit username with this token to align with current client portal lookups
    const { error: updateUnitError } = await supabase
      .from('units')
      .update({ username: token })
      .eq('id', unitId)

    if (updateUnitError) {
      console.error('Update unit token error:', updateUnitError)
      return NextResponse.json({ error: 'Invitation created but failed to update unit token' }, { status: 500 })
    }

    // 5) TODO: Send email via your provider with the token link
    // For now, return the link so admin can copy/paste
    const link = `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/client/${token}`

    return NextResponse.json({ success: true, invitationId: invite.id, token, link })
  } catch (error) {
    console.error('Invitation creation error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
} 