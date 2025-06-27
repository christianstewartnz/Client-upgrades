import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role key
)

function generatePassword(length = 10) {
  return Math.random().toString(36).slice(-length)
}

function sanitize(str: string) {
  return String(str).replace(/[^a-zA-Z0-9]/g, '')
}

function isValidEmail(email: string) {
  // Simple regex for email validation
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { unitNumber, projectId, ...unitData } = body
  if (!unitNumber || !projectId) {
    return NextResponse.json({ error: 'Missing unitNumber or projectId' }, { status: 400 })
  }
  const safeUnitNumber = sanitize(unitNumber)
  const safeProjectId = sanitize(projectId)
  // Use first 3 chars of projectId as project initials
  const projectInitials = safeProjectId.slice(0, 3).toLowerCase()

  // Fetch project name from Supabase
  let projectName = 'project'
  const { data: projectData, error: projectError } = await supabase
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .single()
  if (!projectError && projectData && projectData.name) {
    projectName = sanitize(projectData.name).toLowerCase()
  }
  const email = `${projectName}unit${safeUnitNumber}@example.com`
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Generated email is invalid: ' + email }, { status: 400 })
  }
  const password = generatePassword()

  console.log('Attempting to create user with email:', email);

  // Check if user already exists
  const { data: existingUser, error: existingUserError } = await supabase.auth.admin.listUsers()
  if (existingUserError) {
    console.error('Error checking existing users:', existingUserError);
  } else {
    const userExists = existingUser.users.find(u => u.email === email);
    if (userExists) {
      console.log('User already exists with email:', email);
      return NextResponse.json({ 
        error: `A user already exists with email: ${email}. Please use a different unit number.` 
      }, { status: 400 })
    }
  }

  // 1. Check if unit already exists
  const { data: existingUnits, error: existingError } = await supabase
    .from('units')
    .select('id')
    .eq('unit_number', unitNumber)
    .eq('project_id', projectId)
  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 })
  }
  if (existingUnits && existingUnits.length > 0) {
    return NextResponse.json({ error: 'A unit with this number already exists in this project.' }, { status: 400 })
  }

  // 1. Create user in Supabase Auth
  const { data: user, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (userError) {
    console.error('Database error creating new user:', userError);
    return NextResponse.json({ 
      error: `Database error creating new user: ${userError.message}`,
      details: userError
    }, { status: 500 })
  }

  // Map camelCase to snake_case for unit_type_id
  if (unitData.unitTypeId) {
    unitData.unit_type_id = unitData.unitTypeId;
    delete unitData.unitTypeId;
  }

  // 2. Insert unit with credentials
  const { data: unit, error: unitError } = await supabase
    .from('units')
    .insert({
      ...unitData,
      unit_number: unitNumber,
      project_id: projectId,
      username: unitNumber,
      password,
    })
    .select()
  if (unitError) {
    console.error('Database error creating unit:', unitError);
    return NextResponse.json({ 
      error: `Database error creating unit: ${unitError.message}`,
      details: unitError
    }, { status: 500 })
  }

  return NextResponse.json({ unit: unit[0], username: email, password })
} 