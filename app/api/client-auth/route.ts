import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Check environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
}

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

export async function POST(req: NextRequest) {
  try {
    // Check if Supabase is properly configured
    if (!supabase) {
      console.error('Supabase client not initialized - missing environment variables')
      return NextResponse.json({ 
        error: 'Database connection not configured. Please check environment variables.' 
      }, { status: 500 })
    }

    const body = await req.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    // Find unit with matching username and password
    const { data: unitData, error: unitError } = await supabase
      .from('units')
      .select(`
        id,
        unit_number,
        project_id,
        unit_type_id,
        username,
        password,
        floor_plan_url
      `)
      .eq('username', username)
      .eq('password', password)
      .single()

    if (unitError || !unitData) {
      console.log('Authentication failed for username:', username)
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
    }

    // Return unit data (without password for security)
    const { password: _, ...safeUnitData } = unitData
    
    return NextResponse.json({ 
      success: true,
      unit: safeUnitData
    })

  } catch (error) {
    console.error('Error during client authentication:', error)
    
    // Ensure we always return JSON, even for unexpected errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({ 
      error: 'Authentication failed: ' + errorMessage
    }, { status: 500 })
  }
} 