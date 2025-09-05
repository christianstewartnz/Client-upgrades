import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/sales-lists/[id]/units
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const salesListId = resolvedParams.id

    const { data, error } = await supabase
      .from('sales_list_units')
      .select(`
        *,
        unit:units(
          id,
          unit_number,
          unit_type_id,
          status,
          unit_type:unit_types(name, bedrooms, bathrooms, size_m2)
        )
      `)
      .eq('sales_list_id', salesListId)

    if (error) {
      console.error('Error fetching sales list units:', error)
      return NextResponse.json({ error: 'Failed to fetch units' }, { status: 500 })
    }

    // Get client assignments for these units
    const unitIds = data?.map(item => item.unit_id) || []
    let clientData: any[] = []
    
    if (unitIds.length > 0) {
      const { data: clients, error: clientError } = await supabase
        .from('unit_clients')
        .select(`
          unit_id,
          client:clients(id, name, email, phone)
        `)
        .in('unit_id', unitIds)
        .eq('role', 'purchaser')

      if (!clientError) {
        clientData = clients || []
      }
    }

    // Merge client data with sales list units
    const unitsWithClients = data?.map(item => ({
      ...item,
      client: clientData.find(c => c.unit_id === item.unit_id)?.client
    })) || []

    return NextResponse.json({ success: true, data: unitsWithClients })
  } catch (error) {
    console.error('Sales list units API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/sales-lists/[id]/units
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const salesListId = resolvedParams.id
    const body = await request.json()
    const { unitIds, listPrice } = body

    if (!unitIds || !Array.isArray(unitIds) || unitIds.length === 0) {
      return NextResponse.json({ error: 'unitIds array is required' }, { status: 400 })
    }

    const insertData = unitIds.map(unitId => ({
      sales_list_id: salesListId,
      unit_id: unitId,
      list_price: listPrice || null,
      status: 'available'
    }))

    const { data, error } = await supabase
      .from('sales_list_units')
      .insert(insertData)
      .select()

    if (error) {
      console.error('Error adding units to sales list:', error)
      return NextResponse.json({ error: 'Failed to add units to sales list' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Add units to sales list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 