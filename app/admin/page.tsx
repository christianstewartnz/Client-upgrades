"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Users, FileText, Settings, Loader2 } from "lucide-react"

interface DashboardStats {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  totalUnits: number
  unitsWithSubmissions: number
  totalSubmissions: number
  submittedCount: number
  draftCount: number
  avgUpgradeValue: number
}

interface RecentSubmission {
  id: string
  unit_number: string
  project_name: string
  status: string
  total_value: number
}

interface ProjectStatus {
  id: string
  name: string
  total_units: number
  completed_units: number
  progress: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalUnits: 0,
    unitsWithSubmissions: 0,
    totalSubmissions: 0,
    submittedCount: 0,
    draftCount: 0,
    avgUpgradeValue: 0,
  })
  const [recentSubmissions, setRecentSubmissions] = useState<RecentSubmission[]>([])
  const [projectStatuses, setProjectStatuses] = useState<ProjectStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        console.log('Starting dashboard data fetch...')
        
        // Test Supabase connection first
        console.log('Testing Supabase connection...')
        console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not Set')
        console.log('Supabase Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not Set')
        
        // Test basic Supabase connection
        try {
          console.log('Testing Supabase connection...')
          const { data: testData, error: testError } = await supabase
            .from('projects')
            .select('count', { count: 'exact', head: true })
          
          if (testError) {
            console.error('Supabase connection test failed:', testError)
            if (testError.code === 'PGRST116') {
              console.log('❌ Table "projects" does not exist in the database')
            }
          } else {
            console.log('✅ Supabase connection successful')
          }
        } catch (connectionError) {
          console.error('Supabase connection exception:', connectionError)
        }
        
        // Initialize with empty data
        let projects: any[] = []
        let units: any[] = []
        let submissions: any[] = []

        // Fetch projects with better error handling
        try {
          console.log('Fetching projects...')
          
          const { data: projectsData, error: projectsError } = await supabase
            .from('projects')
            .select('id, name')
          
          if (projectsError) {
            console.error('Projects table error:', projectsError)
            console.error('Error details:', JSON.stringify(projectsError, null, 2))
            console.log('Projects table might not exist yet, continuing with empty data')
          } else {
            projects = projectsData || []
            console.log('Projects fetched successfully:', projects.length)
            if (projects.length > 0) {
              console.log('Sample project:', projects[0])
            } else {
              console.log('No projects found in database')
            }
          }
        } catch (err) {
          console.error('Projects fetch exception:', err)
        }

        // Fetch units with better error handling
        try {
          console.log('Fetching units...')
          const { data: unitsData, error: unitsError } = await supabase
            .from('units')
            .select('id, unit_number, project_id')
          
          if (unitsError) {
            console.error('Units table error:', unitsError)
            console.log('Units table might not exist yet, continuing with empty data')
          } else {
            units = unitsData || []
            console.log('Units fetched:', units.length)
          }
        } catch (err) {
          console.error('Units fetch exception:', err)
        }

        // Fetch submissions with better error handling
        try {
          console.log('Fetching submissions...')
          const { data: submissionsData, error: submissionsError } = await supabase
            .from('submissions')
            .select('id, unit_number, project_name, client_name, upgrade_value, status, submitted_date')
            .order('submitted_date', { ascending: false })
            .limit(10)
          
          if (submissionsError) {
            console.warn('Submissions table error:', submissionsError)
            console.log('Submissions table might not exist yet, continuing with empty data')
          } else {
            submissions = submissionsData || []
            console.log('Submissions fetched:', submissions.length)
          }
        } catch (err) {
          console.error('Submissions fetch exception:', err)
        }

        console.log('Calculating stats with data:', { 
          projectsCount: projects.length, 
          unitsCount: units.length, 
          submissionsCount: submissions.length 
        })

        // Calculate stats
        console.log('Calculating stats with projects:', projects?.length || 0)
        const totalProjects = projects?.length || 0
        
        // Since we don't have status column, we'll calculate based on submissions
        // A project is "completed" if all its units have submissions
        // A project is "active" if it has units but not all have submissions
        let activeProjects = 0
        let completedProjects = 0
        
        for (const project of projects || []) {
          const projectUnits = units?.filter(u => u.project_id === project.id) || []
          const projectSubmissions = submissions?.filter(s => s.project_name === project.name) || []
          
          if (projectUnits.length === 0) {
            // No units yet, consider it active
            activeProjects++
          } else if (projectSubmissions.length >= projectUnits.length) {
            // All units have submissions, consider completed
            completedProjects++
          } else {
            // Some units don't have submissions, consider active
            activeProjects++
          }
        }
        
        console.log(`Stats: Total: ${totalProjects}, Active: ${activeProjects}, Completed: ${completedProjects}`)
        
        const totalUnits = units?.length || 0
        const unitNumbersWithSubmissions = new Set(submissions?.map(s => s.unit_number) || [])
        const unitsWithSubmissions = unitNumbersWithSubmissions.size
        
        const totalSubmissions = submissions?.length || 0
        const submittedCount = submissions?.filter(s => s.status === 'submitted').length || 0
        const draftCount = submissions?.filter(s => s.status === 'draft').length || 0
        
        const totalUpgradeValue = submissions?.reduce((sum, s) => sum + (s.upgrade_value || 0), 0) || 0
        const avgUpgradeValue = totalSubmissions > 0 ? Math.round(totalUpgradeValue / totalSubmissions) : 0

        setStats({
          totalProjects,
          activeProjects,
          completedProjects,
          totalUnits,
          unitsWithSubmissions,
          totalSubmissions,
          submittedCount,
          draftCount,
          avgUpgradeValue,
        })

        // Format recent submissions
        const formattedSubmissions: RecentSubmission[] = submissions?.slice(0, 3).map(s => ({
          id: s.id,
          unit_number: s.unit_number || 'Unknown',
          project_name: s.project_name || 'Unknown Project',
          status: s.status,
          total_value: s.upgrade_value || 0,
        })) || []

        setRecentSubmissions(formattedSubmissions)

        // Calculate project statuses
        const projectStatusData: ProjectStatus[] = []
        
        for (const project of projects || []) {
          const projectUnits = units?.filter(u => u.project_id === project.id) || []
          const projectSubmissions = submissions?.filter(s => s.project_name === project.name) || []
          
          const totalUnitsInProject = projectUnits.length
          const completedUnitsInProject = projectSubmissions.filter(s => s.status === 'submitted').length
          const progress = totalUnitsInProject > 0 ? Math.round((completedUnitsInProject / totalUnitsInProject) * 100) : 0

          if (totalUnitsInProject > 0) {
            projectStatusData.push({
              id: project.id,
              name: project.name,
              total_units: totalUnitsInProject,
              completed_units: completedUnitsInProject,
              progress,
            })
          }
        }

        setProjectStatuses(projectStatusData.slice(0, 3))

        console.log('Dashboard data fetch completed successfully')
        console.log('Final data being set:', {
          stats: {
            totalProjects,
            activeProjects,
            completedProjects,
            totalUnits,
            unitsWithSubmissions,
            totalSubmissions,
            submittedCount,
            draftCount,
            avgUpgradeValue,
          },
          projectStatusData: projectStatusData.length,
          recentSubmissions: formattedSubmissions.length
        })

      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        console.error('Full error details:', JSON.stringify(error, null, 2))
        
        // Set default empty stats in case of error
        setStats({
          totalProjects: 0,
          activeProjects: 0,
          completedProjects: 0,
          totalUnits: 0,
          unitsWithSubmissions: 0,
          totalSubmissions: 0,
          submittedCount: 0,
          draftCount: 0,
          avgUpgradeValue: 0,
        })
        setRecentSubmissions([])
        setProjectStatuses([])
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  // Debug effect to track when stats change
  useEffect(() => {
    console.log('Stats state updated:', stats)
  }, [stats])

  // Check if Supabase is configured
  const supabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AdminLayout>
    )
  }

  // Check if we have empty stats (indicating database setup issues)
  const hasEmptyStats = stats.totalProjects === 0 && stats.totalUnits === 0 && !loading

  if (!supabaseConfigured) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Overview of your property development projects</p>
          </div>

          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-orange-800">Database Configuration Required</CardTitle>
              <CardDescription className="text-orange-700">
                Supabase environment variables are not configured
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-orange-800">
                  To use the dashboard, you need to set up your Supabase database connection:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-orange-800">
                  <li>Create a <code className="bg-orange-100 px-2 py-1 rounded">.env.local</code> file in your project root</li>
                  <li>Add your Supabase URL and anonymous key:</li>
                </ol>
                <div className="bg-orange-100 p-4 rounded-lg border border-orange-200">
                  <pre className="text-sm text-orange-900">
{`NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here`}
                  </pre>
                </div>
                <p className="text-orange-800 text-sm">
                  You can find these values in your Supabase project settings under "API".
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Show mock dashboard for demo purposes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">Configure database to view</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Units</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">Configure database to view</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Submissions</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">Configure database to view</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Upgrade Value</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">Configure database to view</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Overview of your property development projects</p>
        </div>

        {hasEmptyStats && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-800">Database Setup Required</CardTitle>
              <CardDescription className="text-blue-700">
                Your Supabase database is connected but tables need to be created
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-blue-800">
                  The dashboard is connected to Supabase but the required database tables don't exist yet. 
                  Check the browser console for more details about which tables are missing.
                </p>
                <div className="bg-blue-100 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-900 mb-2">
                    <strong>Required tables:</strong>
                  </p>
                  <ul className="text-sm text-blue-900 list-disc list-inside space-y-1">
                    <li><code>projects</code> - Store project information</li>
                    <li><code>units</code> - Store unit information</li>
                    <li><code>unit_types</code> - Store unit type definitions</li>
                    <li><code>color_schemes</code> - Store color scheme options</li>
                    <li><code>upgrade_options</code> - Store upgrade options</li>
                    <li><code>submissions</code> - Store client submissions (optional)</li>
                  </ul>
                </div>
                <p className="text-blue-800 text-sm">
                  You can create these tables manually in your Supabase dashboard, or they will be created automatically when you start using the admin features to create projects.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProjects}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeProjects} active, {stats.completedProjects} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Units</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUnits}</div>
              <p className="text-xs text-muted-foreground">{stats.unitsWithSubmissions} with selections</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Submissions</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
              <p className="text-xs text-muted-foreground">
                {stats.submittedCount} submitted, {stats.draftCount} drafts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Upgrade Value</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.avgUpgradeValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalSubmissions > 0 ? 'Based on submissions' : 'No data yet'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Submissions</CardTitle>
              <CardDescription>Latest client selections and upgrades</CardDescription>
            </CardHeader>
            <CardContent>
              {recentSubmissions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No submissions yet</p>
                  <p className="text-sm">Submissions will appear here once clients start making selections</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentSubmissions.map((submission) => (
                    <div key={submission.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{submission.unit_number}</p>
                        <p className="text-sm text-gray-600">{submission.project_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${submission.total_value.toLocaleString()}</p>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            submission.status === "submitted"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {submission.status === "submitted" ? "Submitted" : "Draft"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Project Status</CardTitle>
              <CardDescription>Current status of active projects</CardDescription>
            </CardHeader>
            <CardContent>
              {projectStatuses.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No projects with units yet</p>
                  <p className="text-sm">Create projects and add units to see progress here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {projectStatuses.map((project) => (
                    <div key={project.id} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">{project.name}</span>
                        <span className="text-sm text-gray-600">
                          {project.completed_units}/{project.total_units} units
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  )
}
