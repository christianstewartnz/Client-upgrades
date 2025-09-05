import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST - Create a new submission
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Calculate total upgrade value
    const upgradeValue = data.selected_upgrades?.reduce((total: number, upgrade: any) => {
      return total + (upgrade.price * upgrade.quantity)
    }, 0) || 0

    // Prepare submission data
    const submissionData = {
      unit_id: data.unit_id || null,
      unit_number: data.unit_number || 'Unknown Unit',
      project_name: data.project_name || 'Unknown Project',
      client_name: data.client_name || 'Anonymous Client',
      color_scheme: data.color_scheme || '',
      upgrade_value: upgradeValue,
      status: data.is_submitted ? 'submitted' : 'draft',
      submitted_date: new Date().toISOString().split('T')[0],
      selected_upgrades: JSON.stringify(data.selected_upgrades || []),
      floor_plan_data: JSON.stringify(data.floor_plan_data || {}),
      token: data.token || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Check if submission already exists for this token/unit
    const { data: existing, error: existingError } = await supabase
      .from('submissions')
      .select('id')
      .eq('token', data.token)
      .single()

    let result
    if (existing && !existingError) {
      // Update existing submission
      const { data: updatedData, error } = await supabase
        .from('submissions')
        .update({
          ...submissionData,
          updated_at: new Date().toISOString()
        })
        .eq('token', data.token)
        .select()
        .single()
      
      result = { data: updatedData, error }
    } else {
      // Create new submission
      const { data: newData, error } = await supabase
        .from('submissions')
        .insert(submissionData)
        .select()
        .single()
      
      result = { data: newData, error }
    }

    if (result.error) {
      console.error('Database error:', result.error)
      return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      submission: result.data,
      message: existing ? 'Submission updated successfully' : 'Submission created successfully'
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - Retrieve all submissions
export async function GET() {
  try {
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      // If table doesn't exist, return empty array instead of error
      if (error.code === 'PGRST106' || error.message.includes('relation') || error.message.includes('does not exist')) {
        return NextResponse.json({ 
          submissions: [], 
          message: 'Submissions table not found. Please set up the database first.' 
        })
      }
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 })
    }

    // Transform data to match frontend expectations
    const transformedSubmissions = submissions?.map(submission => ({
      id: submission.id,
      unitNumber: submission.unit_number,
      projectName: submission.project_name,
      clientName: submission.client_name,
      colorScheme: submission.color_scheme,
      upgradeValue: submission.upgrade_value,
      status: submission.status,
      submittedDate: submission.submitted_date,
      createdAt: submission.created_at,
      updatedAt: submission.updated_at,
      selectedUpgrades: submission.selected_upgrades ? JSON.parse(submission.selected_upgrades) : [],
      floorPlanData: submission.floor_plan_data ? JSON.parse(submission.floor_plan_data) : {},
      token: submission.token
    })) || []

    return NextResponse.json({ submissions: transformedSubmissions })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 