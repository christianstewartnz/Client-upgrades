"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Edit, Trash2, FileText, Copy, Building, UserPlus } from "lucide-react"
import type { Unit, UnitType } from '../../types/unit'
import { supabase } from "@/lib/supabase"

interface UnitsManagerProps {
  units: Unit[]
  unitTypes: UnitType[]
  colorSchemes: any[]
  onUnitsChange: (units: Unit[]) => void
  projectName: string
  projectId: string
}

export function UnitsManager({ units, unitTypes, colorSchemes, onUnitsChange, projectName, projectId }: UnitsManagerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
  const [newUnit, setNewUnit] = useState<{
    unit_number: string;
    unit_type_id: string;
    floor_plan_file: File | null;
    status: "active" | "inactive";
  }>({
    unit_number: "",
    unit_type_id: "",
    floor_plan_file: null,
    status: "active",
  })
  const [showCredentialsModal, setShowCredentialsModal] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string; password: string } | null>(null)
  const [selectedUnitCredentials, setSelectedUnitCredentials] = useState<{
    username: string;
    password: string;
    unitNumber: string;
  } | null>(null)
  const [previewUnit, setPreviewUnit] = useState<Unit | null>(null)
  const [upgradeOptions, setUpgradeOptions] = useState<any[]>([])
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null)
  const [uploadingFile, setUploadingFile] = useState<string | null>(null)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [invitingUnit, setInvitingUnit] = useState<Unit | null>(null)
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    phone: '',
    expiresInDays: 14
  })
  const [inviteLoading, setInviteLoading] = useState(false)
  const [generatedInvite, setGeneratedInvite] = useState<{ link: string; token: string } | null>(null)

  // Fetch upgrade options for the project
  useEffect(() => {
    const fetchUpgradeOptions = async () => {
      try {
        const { data, error } = await supabase
          .from('upgrade_options')
          .select('id, name, description, category, price, max_quantity, allowed_unit_types')
          .eq('project_id', projectId)
        
        if (error) {
          console.error('Error fetching upgrade options:', error)
          return
        }
        
        setUpgradeOptions(data || [])
      } catch (err) {
        console.error('Error fetching upgrade options:', err)
      }
    }

    if (projectId) {
      fetchUpgradeOptions()
    }
  }, [projectId])

  const generateToken = () => {
    return `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  const addUnit = async () => {
    console.log('Add Unit button clicked');
    console.log('newUnit:', newUnit);
    
    if (!newUnit.unit_number || !newUnit.unit_type_id || newUnit.unit_number.trim() === '' || newUnit.unit_type_id.trim() === '') {
      console.log('Missing required fields');
      alert('Missing required fields: unit number or unit type');
      return;
    }

    try {
      const requestBody = {
        unitNumber: newUnit.unit_number,
        projectId,
        unitTypeId: newUnit.unit_type_id,
        status: newUnit.status,
      } as const;

      const res = await fetch('/api/create-unit-with-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })
      const data = await res.json()
      console.log('API response:', data);
      if (data.error) {
        alert('Error creating unit: ' + data.error)
        return
      }
      
      // If a file was uploaded, save it to the database
      if (newUnit.floor_plan_file) {
        try {
          const formData = new FormData()
          formData.append('unitId', data.unit.id)
          formData.append('file', newUnit.floor_plan_file)

          const fileResponse = await fetch('/api/update-unit-floor-plan', {
            method: 'POST',
            body: formData
          })

          const fileData = await fileResponse.json()

          if (!fileResponse.ok) {
            console.error('Failed to save floor plan file:', fileData.error)
          } else {
            console.log(`Floor plan uploaded and saved: ${newUnit.floor_plan_file.name} at ${fileData.url}`)
            // Update the unit data with the file URL
            data.unit.floor_plan_url = fileData.url
          }
        } catch (error) {
          console.error('Error saving floor plan:', error)
        }
      }

      // Create the new unit object with the PDF file
      const newUnitData = {
        id: data.unit.id,
        unit_number: newUnit.unit_number,
        unit_type_id: newUnit.unit_type_id,
        floor_plan_file: newUnit.floor_plan_file, // Include the uploaded file
        floor_plan_url: data.unit.floor_plan_url, // Include the file URL if uploaded
        status: newUnit.status,
        username: data.username,
        password: data.password,
      }
      
      // Add the new unit to the list
      onUnitsChange([...units, newUnitData])
      setCreatedCredentials({ username: data.username, password: data.password })
      setShowCredentialsModal(true)
      setNewUnit({ unit_number: "", unit_type_id: "", floor_plan_file: null, status: "active" })
      setShowAddDialog(false)
    } catch (error) {
      console.error('Error creating unit:', error);
      alert('Error creating unit. Please try again.');
    }
  }

  const deleteUnit = (id: string) => {
    onUnitsChange(units.filter((u) => u.id !== id))
  }

  const getUnitTypeName = (unit_type_id: string) => {
    const unitType = unitTypes.find((ut) => ut.id === unit_type_id);
    const name = unitType?.name;
    return name || "Unknown";
  }

  const copyLoginLink = (unitId: string) => {
    const link = `${window.location.origin}/`
    navigator.clipboard.writeText(link)
    // You could add a toast notification here
  }

  const showUnitCredentials = (unit: Unit) => {
    setSelectedUnitCredentials({
      username: unit.username,
      password: unit.password,
      unitNumber: unit.unit_number
    })
  }

  const showUnitPreview = (unit: Unit) => {
    setPreviewUnit(unit)
  }

  const handleFileUpload = async (unitId: string, file: File) => {
    setUploadingFile(unitId)
    
    try {
      // Create FormData to send the actual file
      const formData = new FormData()
      formData.append('unitId', unitId)
      formData.append('file', file)

      const response = await fetch('/api/update-unit-floor-plan', {
        method: 'POST',
        body: formData // Don't set Content-Type header, let browser set it for FormData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload file')
      }

      // Update the unit in the local state with the returned data
      const updatedUnits = units.map(unit => 
        unit.id === unitId 
          ? { ...unit, floor_plan_file: file, floor_plan_url: data.url }
          : unit
      )
      onUnitsChange(updatedUnits)
      
      console.log(`File ${file.name} uploaded and saved for unit ${unitId} at ${data.url}`)
      
    } catch (error) {
      console.error('Error uploading file:', error)
      alert(`Error uploading file: ${error instanceof Error ? error.message : 'Please try again.'}`)
    } finally {
      setUploadingFile(null)
    }
  }

  const triggerFileUpload = (unitId: string) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        handleFileUpload(unitId, file)
      }
    }
    input.click()
  }

  const handleInviteClient = (unit: Unit) => {
    setInvitingUnit(unit)
    setInviteForm({ name: '', email: '', phone: '', expiresInDays: 14 })
    setGeneratedInvite(null)
    setShowInviteDialog(true)
  }

  const createInvitation = async () => {
    if (!invitingUnit || !inviteForm.name.trim() || !inviteForm.email.trim()) {
      alert('Please fill in required fields (name and email)')
      return
    }

    setInviteLoading(true)
    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitId: invitingUnit.id,
          client: {
            name: inviteForm.name.trim(),
            email: inviteForm.email.trim(),
            phone: inviteForm.phone.trim() || undefined
          },
          expiresInDays: inviteForm.expiresInDays
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create invitation')
      }

      setGeneratedInvite({ link: data.link, token: data.token })
      
      // Update the unit's username to reflect the new token
      const updatedUnits = units.map(u => 
        u.id === invitingUnit.id ? { ...u, username: data.token } : u
      )
      onUnitsChange(updatedUnits)

    } catch (error) {
      console.error('Error creating invitation:', error)
      alert(`Error creating invitation: ${error instanceof Error ? error.message : 'Please try again'}`)
    } finally {
      setInviteLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Units</CardTitle>
              <CardDescription>Manage individual units and their configurations</CardDescription>
            </div>

            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2" disabled={unitTypes.length === 0}>
                  <Plus className="w-4 h-4" />
                  Add Unit
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Unit</DialogTitle>
                  <DialogDescription>Create a new unit with floor plan for client selections</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="unitNumber">Unit Number</Label>
                    <Input
                      id="unitNumber"
                      value={newUnit.unit_number}
                      onChange={(e) => setNewUnit((prev) => ({ ...prev, unit_number: e.target.value }))}
                      placeholder="e.g., 101, A1, etc."
                    />
                  </div>

                  <div>
                    <Label htmlFor="unitType">Unit Type</Label>
                    <Select
                      value={newUnit.unit_type_id}
                      onValueChange={(value: string) => {
                        if (value) {
                          setNewUnit((prev) => ({ ...prev, unit_type_id: value }))
                        }
                      }}
                    >
                      <SelectTrigger id="unitType">
                        <SelectValue placeholder="Select a unit type" />
                      </SelectTrigger>
                      <SelectContent>
                        {unitTypes.map((unitType) => (
                          <SelectItem key={unitType.id} value={unitType.id}>
                            {unitType.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="floor_plan">Floor Plan (PDF)</Label>
                    <div className="mt-2">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) setNewUnit((prev) => ({ ...prev, floor_plan_file: file }))
                        }}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {newUnit.floor_plan_file && (
                        <p className="text-sm text-green-600 mt-1">✓ {newUnit.floor_plan_file.name} uploaded</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Upload a PDF floor plan for electrical upgrade location selection
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={newUnit.status}
                      onValueChange={(value: "active" | "inactive") =>
                        setNewUnit((prev) => ({ ...prev, status: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={addUnit} className="flex-1">
                      Add Unit
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowAddDialog(false)
                        setNewUnit({ unit_number: "", unit_type_id: "", floor_plan_file: null, status: "active" })
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          {unitTypes.length === 0 ? (
            <div className="text-center py-8">
              <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No unit types available</p>
              <p className="text-sm text-gray-500">You need to create unit types before adding units</p>
            </div>
          ) : units.length === 0 ? (
            <div className="text-center py-8">
              <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No units created yet</p>
              <p className="text-sm text-gray-500 mb-4">
                Units are individual properties that clients can customize with upgrades
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Unit
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {units.map((unit) => (
                <div key={unit.id} className="border rounded-lg">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{unit.unit_number}</h3>
                        <Badge variant={unit.status === "active" ? "default" : "secondary"}>{unit.status}</Badge>
                      </div>
                      <p className="text-gray-600 text-sm mb-2">Type: {getUnitTypeName(unit.unit_type_id)}</p>
                      <div className="flex items-center gap-2">
                        {unit.floor_plan_url ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              Floor Plan: {unit.floor_plan_url.split('/').pop() || 'Uploaded'}
                            </Badge>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => triggerFileUpload(unit.id)}
                              disabled={uploadingFile === unit.id}
                            >
                              {uploadingFile === unit.id ? "Uploading..." : "Replace PDF"}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">No Floor Plan</Badge>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => triggerFileUpload(unit.id)}
                              disabled={uploadingFile === unit.id}
                            >
                              {uploadingFile === unit.id ? "Uploading..." : "Upload PDF"}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleInviteClient(unit)}>
                        <UserPlus className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => copyLoginLink(unit.id)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => showUnitPreview(unit)}>
                        Preview
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => deleteUnit(unit.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="px-4 pb-4 border-t bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Label className="text-xs font-medium text-gray-600">Client Access</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-xs bg-white px-2 py-1 rounded border flex-1 truncate">
                            / (Client Tab)
                          </code>
                          <Button variant="outline" size="sm" onClick={() => copyLoginLink(unit.id)}>
                            Copy Link
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => showUnitCredentials(unit)}>
                            View Credentials
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Dialog open={showCredentialsModal} onOpenChange={setShowCredentialsModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Unit Credentials</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="text-sm text-gray-700">Copy these credentials and provide them to the client. They will always be available in the unit details.</div>
                <div>
                  <Label>Username (Email)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input readOnly value={createdCredentials?.username || ''} />
                    <Button type="button" onClick={() => navigator.clipboard.writeText(createdCredentials?.username || '')}>Copy</Button>
                  </div>
                </div>
                <div>
                  <Label>Password</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input readOnly value={createdCredentials?.password || ''} />
                    <Button type="button" onClick={() => navigator.clipboard.writeText(createdCredentials?.password || '')}>Copy</Button>
                  </div>
                </div>
                <div className="text-xs text-red-500 mt-2">Keep these credentials secure. They are visible only to admins.</div>
                <div className="text-xs text-gray-500 mt-1">Login credentials can always be viewed in the unit details section.</div>
                <div className="flex justify-end">
                  <Button onClick={() => setShowCredentialsModal(false)}>Close</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={!!selectedUnitCredentials} onOpenChange={() => setSelectedUnitCredentials(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>User Login Credentials - Unit {selectedUnitCredentials?.unitNumber}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="text-sm text-gray-700">These are the login credentials for this unit. Share them securely with the client.</div>
                <div>
                  <Label>Username (Email)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input readOnly value={selectedUnitCredentials?.username || ''} />
                    <Button type="button" onClick={() => navigator.clipboard.writeText(selectedUnitCredentials?.username || '')}>Copy</Button>
                  </div>
                </div>
                <div>
                  <Label>Password</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input readOnly value={selectedUnitCredentials?.password || ''} />
                    <Button type="button" onClick={() => navigator.clipboard.writeText(selectedUnitCredentials?.password || '')}>Copy</Button>
                  </div>
                </div>
                <div className="text-xs text-red-500 mt-2">Keep these credentials secure. They are visible only to admins.</div>
                <div className="flex justify-end">
                  <Button onClick={() => setSelectedUnitCredentials(null)}>Close</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Invite Client Dialog */}
          <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Client - Unit {invitingUnit?.unit_number}</DialogTitle>
                <DialogDescription>
                  Create an invitation for a client to access the customization portal for this unit
                </DialogDescription>
              </DialogHeader>
              
              {!generatedInvite ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="clientName">Client Name *</Label>
                    <Input
                      id="clientName"
                      value={inviteForm.name}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="John Smith"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="clientEmail">Email Address *</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="john@example.com"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="clientPhone">Phone Number (optional)</Label>
                    <Input
                      id="clientPhone"
                      value={inviteForm.phone}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+64 21 123 4567"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="expiresIn">Invitation expires in (days)</Label>
                    <Input
                      id="expiresIn"
                      type="number"
                      min="1"
                      max="365"
                      value={inviteForm.expiresInDays}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, expiresInDays: parseInt(e.target.value) || 14 }))}
                    />
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button 
                      onClick={createInvitation} 
                      disabled={inviteLoading || !inviteForm.name.trim() || !inviteForm.email.trim()}
                      className="flex-1"
                    >
                      {inviteLoading ? 'Creating...' : 'Create Invitation'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowInviteDialog(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-green-800">Invitation Created Successfully!</h3>
                    </div>
                    <p className="text-sm text-green-700">
                      Client {inviteForm.name} ({inviteForm.email}) has been invited to access Unit {invitingUnit?.unit_number}.
                    </p>
                  </div>
                  
                  <div>
                    <Label>Client Portal Link</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input readOnly value={generatedInvite.link} className="font-mono text-sm" />
                      <Button 
                        type="button" 
                        onClick={() => navigator.clipboard.writeText(generatedInvite.link)}
                        size="sm"
                      >
                        Copy Link
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Share this link with the client. It expires in {inviteForm.expiresInDays} days.
                    </p>
                  </div>
                  
                  <div>
                    <Label>Access Token</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input readOnly value={generatedInvite.token} className="font-mono text-sm" />
                      <Button 
                        type="button" 
                        onClick={() => navigator.clipboard.writeText(generatedInvite.token)}
                        size="sm"
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <Button onClick={() => setShowInviteDialog(false)}>
                      Done
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Unit Preview Modal */}
      {previewUnit && (
        <Dialog open={!!previewUnit} onOpenChange={() => setPreviewUnit(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Client Portal Preview - Unit {previewUnit.unit_number}</DialogTitle>
              <p className="text-sm text-gray-600">This is what the client will see when they access their customization portal</p>
            </DialogHeader>
            <div className="space-y-6">
              {/* Floor Plan Section */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Floor Plan</h3>
                {previewUnit.floor_plan_url ? (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded border">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium">Floor plan available</span>
                    <Badge variant="outline" className="ml-auto">PDF</Badge>
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500 bg-gray-50 rounded border-2 border-dashed">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No floor plan uploaded</p>
                  </div>
                )}
              </div>

              {/* Color Schemes Section */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Available Color Schemes</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {(() => {
                    // Find color schemes that are available for this unit type
                    const availableColorSchemes = colorSchemes.filter(scheme => 
                      scheme.allowedUnitTypes && scheme.allowedUnitTypes.includes(previewUnit.unit_type_id)
                    )

                    if (availableColorSchemes.length === 0) {
                      return (
                        <div className="col-span-full p-8 text-center text-gray-500 bg-gray-50 rounded border-2 border-dashed">
                          <p>No color schemes configured for this unit type</p>
                          <p className="text-xs mt-1">Configure color schemes and assign them to this unit type</p>
                        </div>
                      )
                    }

                    return availableColorSchemes.map((scheme) => (
                      <div key={scheme.id} className="p-3 border rounded-lg hover:border-blue-300 cursor-pointer transition-colors">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{scheme.name}</p>
                          {scheme.description && (
                            <p className="text-xs text-gray-600">{scheme.description}</p>
                          )}
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              </div>

              {/* Upgrade Options Section */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Available Upgrade Options</h3>
                <div className="space-y-4">
                  {(() => {
                    const unitType = unitTypes.find(ut => ut.id === previewUnit.unit_type_id)
                    
                    // Filter upgrade options that are allowed for this unit type
                    const availableUpgrades = upgradeOptions.filter(upgrade => 
                      upgrade.allowed_unit_types && upgrade.allowed_unit_types.includes(previewUnit.unit_type_id)
                    )

                    if (availableUpgrades.length === 0) {
                      return (
                        <div className="p-8 text-center text-gray-500 bg-gray-50 rounded border-2 border-dashed">
                          <p>No upgrade options configured for this unit type</p>
                          <p className="text-xs mt-1">Configure upgrades in the Upgrades section and assign them to this unit type</p>
                        </div>
                      )
                    }

                    // Group upgrades by category
                    const upgradesByCategory = availableUpgrades.reduce((acc, upgrade) => {
                      const category = upgrade.category || 'Uncategorized'
                      if (!acc[category]) {
                        acc[category] = []
                      }
                      acc[category].push(upgrade)
                      return acc
                    }, {} as Record<string, any[]>)

                    return Object.entries(upgradesByCategory).map(([category, upgrades]: [string, any[]]) => (
                      <div key={category} className="space-y-3">
                        <h4 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2">
                          {category}
                        </h4>
                        <div className="space-y-2">
                          {(upgrades as any[]).map((upgrade: any) => (
                            <div key={upgrade.id} className="flex items-center justify-between p-3 border rounded-lg hover:border-blue-300 cursor-pointer transition-colors">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium">{upgrade.name}</p>
                                  <Badge variant="secondary">${upgrade.price?.toLocaleString()}</Badge>
                                                              <Badge variant="outline">
                                    Max: {upgrade.max_quantity === null ? "Unlimited" : upgrade.max_quantity}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600">{upgrade.description}</p>
                              </div>
                              <Badge variant="outline">Available</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              </div>

              {/* Unit Details Section */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-semibold mb-3">Unit Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Unit Number</p>
                    <p className="font-medium">{previewUnit.unit_number}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Unit Type</p>
                    <p className="font-medium">{getUnitTypeName(previewUnit.unit_type_id)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Status</p>
                    <Badge variant={previewUnit.status === "active" ? "default" : "secondary"}>
                      {previewUnit.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-gray-600">Access Link</p>
                    <code className="text-xs bg-white px-2 py-1 rounded border">/ (Client Tab)</code>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
