"use client"

import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Search, RefreshCw, X, Calendar, User, MapPin, Palette, Wrench, DollarSign, FileText, Zap, Layout } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/lib/supabase"
import type { Submission } from '@/types/submission'

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch submissions from API
  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/submissions')
        
        if (!response.ok) {
          throw new Error('Failed to fetch submissions')
        }
        
        const data = await response.json()
        setSubmissions(data.submissions || [])
      } catch (error) {
        console.error('Error fetching submissions:', error)
        setError('Failed to load submissions')
      } finally {
        setLoading(false)
      }
    }

    fetchSubmissions()
  }, [])

  const refreshSubmissions = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/submissions')
      
      if (!response.ok) {
        throw new Error('Failed to fetch submissions')
      }
      
      const data = await response.json()
      setSubmissions(data.submissions || [])
    } catch (error) {
      console.error('Error fetching submissions:', error)
      setError('Failed to load submissions')
    } finally {
      setLoading(false)
    }
  }

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [projectFilter, setProjectFilter] = useState("all")
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportingSubmission, setExportingSubmission] = useState<Submission | null>(null)
  const [selectedExportTypes, setSelectedExportTypes] = useState<string[]>(['finishes', 'upgrades'])
  const [isExporting, setIsExporting] = useState(false)
  const [projectDetails, setProjectDetails] = useState<any>(null)

  const filteredSubmissions = submissions.filter((submission) => {
    const matchesSearch =
      submission.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.projectName.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || submission.status === statusFilter
    const matchesProject = projectFilter === "all" || submission.projectName === projectFilter

    return matchesSearch && matchesStatus && matchesProject
  })

  const getStatusColor = (status: string) => {
    return status === "submitted" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
  }

  const projects = [...new Set(submissions.map((s) => s.projectName))]

  const handleExportTypeChange = (exportType: string, checked: boolean) => {
    if (checked) {
      setSelectedExportTypes(prev => [...prev, exportType])
    } else {
      setSelectedExportTypes(prev => prev.filter(type => type !== exportType))
    }
  }

  const handleExport = async () => {
    if (!exportingSubmission || selectedExportTypes.length === 0) return

    setIsExporting(true)
    try {
      const response = await fetch(`/api/submissions/${exportingSubmission.id}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exportTypes: selectedExportTypes
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        
        // Determine filename based on content type
        const contentType = response.headers.get('content-type')
        if (contentType?.includes('zip')) {
          a.download = `submission-${exportingSubmission.unitNumber}-documents.zip`
        } else if (selectedExportTypes.includes('finishes') && selectedExportTypes.length === 1) {
          a.download = `finishes-${exportingSubmission.unitNumber}.pdf`
        } else if (selectedExportTypes.includes('upgrades') && selectedExportTypes.length === 1) {
          a.download = `upgrades-${exportingSubmission.unitNumber}.pdf`
        } else if (selectedExportTypes.includes('floorplan') && selectedExportTypes.length === 1) {
          a.download = `electrical-plan-${exportingSubmission.unitNumber}.pdf`
        } else {
          a.download = `submission-${exportingSubmission.unitNumber}.pdf`
        }
        
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        setExportDialogOpen(false)
      } else {
        console.error('Export failed')
      }
    } catch (error) {
      console.error('Export error:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const openExportDialog = async (submission: Submission) => {
    setExportingSubmission(submission)
    
    // Fetch project details for address information
    try {
      const { data: project } = await supabase
        .from('projects')
        .select('*')
        .ilike('name', submission.projectName)
        .single()
      
      setProjectDetails(project)
    } catch (error) {
      console.log('Could not fetch project details:', error)
      setProjectDetails(null)
    }
    
    // Determine available export options
    const availableTypes = ['finishes', 'upgrades']
    const hasElectricalUpgrades = submission.selectedUpgrades?.some(upgrade => 
      upgrade.category === 'Electrical' || upgrade.category === 'Lighting'
    )
    if (hasElectricalUpgrades) {
      availableTypes.push('floorplan')
    }
    
    setSelectedExportTypes(availableTypes)
    setExportDialogOpen(true)
  }

  const ExportModal = () => (
    <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Documents
          </DialogTitle>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="font-medium">Unit {exportingSubmission?.unitNumber}</div>
            <div className="text-sm text-gray-600">{exportingSubmission?.projectName}</div>
            {projectDetails?.address && (
              <div className="text-xs text-gray-500">{projectDetails.address}</div>
            )}
            <div className="text-xs text-gray-500 pt-1">Select which documents you want to export</div>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Checkbox 
                id="finishes"
                checked={selectedExportTypes.includes('finishes')}
                onCheckedChange={(checked) => handleExportTypeChange('finishes', checked as boolean)}
              />
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-purple-600" />
                <label htmlFor="finishes" className="text-sm font-medium cursor-pointer">
                  Finishes Selection
                </label>
              </div>
            </div>
            <p className="text-xs text-gray-600 ml-6">
              Complete list of selected color scheme and finishes materials
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Checkbox 
                id="upgrades"
                checked={selectedExportTypes.includes('upgrades')}
                onCheckedChange={(checked) => handleExportTypeChange('upgrades', checked as boolean)}
              />
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-blue-600" />
                <label htmlFor="upgrades" className="text-sm font-medium cursor-pointer">
                  Upgrade Selections
                </label>
              </div>
            </div>
            <p className="text-xs text-gray-600 ml-6">
              Itemized list of selected upgrades with pricing and totals (incl. GST)
            </p>
          </div>

          {exportingSubmission?.selectedUpgrades?.some(upgrade => 
            upgrade.category === 'Electrical' || upgrade.category === 'Lighting'
          ) && (
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="floorplan"
                  checked={selectedExportTypes.includes('floorplan')}
                  onCheckedChange={(checked) => handleExportTypeChange('floorplan', checked as boolean)}
                />
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-600" />
                  <label htmlFor="floorplan" className="text-sm font-medium cursor-pointer">
                    Electrical Plan Markups
                  </label>
                </div>
              </div>
              <p className="text-xs text-gray-600 ml-6">
                Floor plan locations for electrical upgrades and lighting installations
              </p>
            </div>
          )}

          <Separator />
          
          <div className="flex items-center justify-between gap-3">
            <Button 
              variant="outline" 
              onClick={() => setExportDialogOpen(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleExport}
              disabled={selectedExportTypes.length === 0 || isExporting}
              className="flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  {selectedExportTypes.length > 1 ? 'Download ZIP' : 'Download PDF'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

  const SubmissionDetailsModal = ({ submission }: { submission: Submission }) => (
    <DialogContent className="max-w-4xl max-h-[80vh]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Submission Details - {submission.unitNumber}
        </DialogTitle>
        <DialogDescription>
          Complete overview of client selections and submission details
        </DialogDescription>
      </DialogHeader>
      
      <ScrollArea className="max-h-[60vh] pr-4">
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Client Information
                </CardTitle>
              </CardHeader>
                             <CardContent className="space-y-3">
                 <div>
                   <label className="text-sm font-medium text-gray-500">Unit Number</label>
                   <p className="text-base font-mono">{submission.unitNumber}</p>
                 </div>
                 <div>
                   <label className="text-sm font-medium text-gray-500">Project</label>
                   <p className="text-base">{submission.projectName}</p>
                 </div>
                 <div>
                   <label className="text-sm font-medium text-gray-500">Status</label>
                   <Badge className={getStatusColor(submission.status)}>{submission.status}</Badge>
                 </div>
               </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Submission Date</label>
                  <p className="text-base">{submission.submittedDate}</p>
                </div>
                {submission.createdAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Created</label>
                    <p className="text-base">{new Date(submission.createdAt).toLocaleDateString()}</p>
                  </div>
                )}
                {submission.updatedAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Updated</label>
                    <p className="text-base">{new Date(submission.updatedAt).toLocaleDateString()}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500">Reference Token</label>
                  <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{submission.token}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Color Scheme Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Selected Finishes
              </CardTitle>
            </CardHeader>
                         <CardContent>
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500"></div>
                 <div>
                   <p className="font-medium">{submission.colorScheme || 'No color scheme selected'}</p>
                 </div>
               </div>
             </CardContent>
          </Card>

          {/* Upgrade Options */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                Selected Upgrades ({submission.selectedUpgrades?.length || 0})
              </CardTitle>
            </CardHeader>
                         <CardContent>
               {submission.selectedUpgrades && submission.selectedUpgrades.length > 0 ? (
                 <div className="space-y-4">
                   {submission.selectedUpgrades.map((upgrade, index) => (
                     <div key={index} className="border rounded-lg p-4">
                       <div className="flex justify-between items-start mb-2">
                         <div>
                           <h4 className="font-medium">{upgrade.name}</h4>
                           <p className="text-sm text-gray-600">{upgrade.category}</p>
                         </div>
                         <div className="text-right">
                           <p className="font-bold text-lg">${upgrade.price?.toLocaleString()}</p>
                           <p className="text-sm text-gray-600">Qty: {upgrade.quantity}</p>
                         </div>
                       </div>
                       {upgrade.floor_plan_points && upgrade.floor_plan_points.length > 0 && (
                         <div className="mt-2 pt-2 border-t">
                           <p className="text-sm text-gray-600">
                             Floor plan locations: {upgrade.floor_plan_points.length} points placed
                           </p>
                         </div>
                       )}
                     </div>
                   ))}
                   
                   {/* Upgrade Totals */}
                   <div className="border-t pt-4 mt-6">
                     <div className="space-y-2">
                       <div className="flex justify-between items-center">
                         <span className="text-gray-600">Subtotal</span>
                         <span className="font-medium">${submission.upgradeValue.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between items-center">
                         <span className="text-gray-600">GST (15%)</span>
                         <span className="font-medium">${Math.round(submission.upgradeValue * 0.15).toLocaleString()}</span>
                       </div>
                       <Separator />
                       <div className="flex justify-between items-center text-lg font-bold">
                         <span>Total (incl. GST)</span>
                         <span className="text-green-600">${Math.round(submission.upgradeValue * 1.15).toLocaleString()}</span>
                       </div>
                     </div>
                   </div>
                 </div>
               ) : (
                 <div className="text-center py-8 text-gray-500">
                   <Wrench className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                   <p>No upgrades selected</p>
                 </div>
               )}
             </CardContent>
          </Card>

          
        </div>
      </ScrollArea>
    </DialogContent>
  )

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Submissions</h1>
            <p className="text-gray-600">View and manage client selections</p>
          </div>
          <Button 
            onClick={refreshSubmissions} 
            variant="outline" 
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search units, clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>

              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project} value={project}>
                      {project}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        {submissions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{submissions.length}</p>
                  <p className="text-sm text-gray-600">Total Submissions</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {submissions.filter(s => s.status === 'submitted').length}
                  </p>
                  <p className="text-sm text-gray-600">Completed</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {submissions.filter(s => s.status === 'draft').length}
                  </p>
                  <p className="text-sm text-gray-600">Drafts</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    ${Math.round(submissions.reduce((sum, s) => sum + s.upgradeValue, 0) / submissions.length || 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">Avg. Value</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Submissions List */}
        <Card>
          <CardHeader>
            <CardTitle>Client Submissions ({filteredSubmissions.length})</CardTitle>
            <CardDescription>Overview of all client selections and their current status</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-gray-600">Loading submissions...</span>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-600 mb-4">{error}</p>
                <Button 
                  onClick={() => window.location.reload()} 
                  variant="outline"
                >
                  Retry
                </Button>
              </div>
            ) : (
            <div className="space-y-4">
              {filteredSubmissions.map((submission) => (
                <Card key={submission.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                      {/* Unit & Project Info */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {submission.unitNumber}
                          </Badge>
                          <Badge className={getStatusColor(submission.status)}>
                            {submission.status}
                          </Badge>
                        </div>
                        <p className="font-medium text-sm">{submission.projectName}</p>
                        <p className="text-xs text-gray-600">{submission.clientName}</p>
                      </div>

                      {/* Selections Info */}
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500 font-medium">SELECTIONS</p>
                        <p className="text-sm">
                          <span className="font-medium">Color:</span> {submission.colorScheme || 'Not selected'}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Upgrades:</span> {submission.selectedUpgrades?.length || 0} items
                        </p>
                      </div>

                      {/* Value & Date */}
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500 font-medium">VALUE & DATE</p>
                        <p className="text-lg font-bold text-green-600">
                          ${submission.upgradeValue.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-600">{submission.submittedDate}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row gap-2 lg:justify-end">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="text-xs">
                              View Details
                            </Button>
                          </DialogTrigger>
                          <SubmissionDetailsModal submission={submission} />
                        </Dialog>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs"
                          onClick={() => openExportDialog(submission)}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Export
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredSubmissions.length === 0 && (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center text-gray-500">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions found</h3>
                      <p className="text-sm">
                        {submissions.length === 0 
                          ? "No client submissions have been made yet. Submissions will appear here once clients complete their selections."
                          : "No submissions match your current filters. Try adjusting your search criteria."
                        }
                      </p>
                      {submissions.length === 0 && (
                        <div className="mt-4">
                          <Button 
                            onClick={() => window.open('/client/test-token-1', '_blank')} 
                            variant="outline" 
                            size="sm"
                          >
                            Test Client Portal
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            )}
          </CardContent>
                  </Card>
        </div>
        
        <ExportModal />
      </AdminLayout>
    )
}
