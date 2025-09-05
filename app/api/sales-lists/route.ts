import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/sales-lists?projectId=uuid
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('sales_lists')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching sales lists:', error)
      return NextResponse.json({ error: 'Failed to fetch sales lists' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Sales lists API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/sales-lists
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, name, description } = body

    if (!projectId || !name) {
      return NextResponse.json({ error: 'projectId and name are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('sales_lists')
      .insert({
        project_id: projectId,
        name: name.trim(),
        description: description?.trim() || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating sales list:', error)
      return NextResponse.json({ error: 'Failed to create sales list' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Sales list creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 