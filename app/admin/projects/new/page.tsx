"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Save, Building2, Plus, Edit } from "lucide-react"
import Link from "next/link"
import { UnitTypesManager } from "@/components/admin/unit-types-manager"
import { UnitsManager } from "@/components/admin/units-manager"
import { UpgradeOptionsManager } from "@/components/admin/upgrade-options-manager"
import { ColorSchemesManager } from "@/components/admin/color-schemes-manager"
import { useRouter } from "next/navigation"
import type { Unit, UnitType } from '@/types/unit'
import type { ColorScheme } from '@/types/color-scheme'

interface ProjectData {
  id?: string
  name: string
  development_company: string
  address: string
  description: string
  unitTypes: UnitType[]
  units: Unit[]
  colorSchemes: ColorScheme[]
  upgradeOptions: UpgradeOption[]
}

interface UpgradeOption {
  id: string
  name: string
  description: string
  category: string
  price: number
  maxQuantity: number
  applicableUnitTypes: string[]
}

export default function NewProjectPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [projectData, setProjectData] = useState<ProjectData>({
    name: "",
    development_company: "",
    address: "",
    description: "",
    unitTypes: [],
    units: [],
    colorSchemes: [],
    upgradeOptions: [],
  })
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const router = useRouter()
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (projectData.logoFile) {
      const objectUrl = URL.createObjectURL(projectData.logoFile)
      setLogoPreviewUrl(objectUrl)
      return () => URL.revokeObjectURL(objectUrl)
    } else {
      setLogoPreviewUrl(null)
    }
  }, [projectData.logoFile])



  const handleLogoUpload = (file: File) => {
    setProjectData((prev) => ({ ...prev, logoFile: file }))
  }

  const updateProjectBasics = (field: keyof ProjectData, value: string) => {
    setProjectData((prev) => ({ ...prev, [field]: value }))
  }

  const updateUnitTypes = (unitTypes: UnitType[]) => {
    // Ensure all unit types have id as a string
    const safeUnitTypes = unitTypes.map(ut => ({
      ...ut,
      id: ut.id ? String(ut.id) : ''
    }))
    setProjectData((prev) => ({ ...prev, unitTypes: safeUnitTypes }))
  }

  const updateUnits = (units: Unit[]) => {
    // Ensure all required fields are present
    const safeUnits = units.map(u => ({
      id: u.id || '',
      unitNumber: u.unitNumber || '',
      unitTypeId: u.unitTypeId || '',
      floorPlanFile: u.floorPlanFile || null,
      status: u.status || 'active',
      username: u.username || '',
      password: u.password || '',
    }))
    setProjectData((prev) => ({ ...prev, units: safeUnits }))
  }

  const updateUpgradeOptions = (upgradeOptions: UpgradeOption[]) => {
    setProjectData((prev) => ({ ...prev, upgradeOptions }))
  }

  const updateColorSchemes = (colorSchemes: ColorScheme[]) => {
    setProjectData((prev) => ({ ...prev, colorSchemes }))
  }

  const handleCreateProject = async () => {
    setCreating(true)
    setError(null)
    try {
      const { name, development_company, address, description } = projectData
      const { data, error } = await supabase
        .from("projects")
        .insert({ name, development_company, address, description })
        .select()
      if (error) throw error
      const newProject = data[0]
      setProjectData((prev) => ({ ...prev, id: newProject.id ? String(newProject.id) : '' }))
      setCreated(true)
      setActiveTab("unit-types")
    } catch (err: any) {
      setError(err.message || "Failed to create project")
    } finally {
      setCreating(false)
    }
  }

  const handleSaveProject = async () => {
    setCreating(true)
    setError(null)
    try {
      const { name, development_company, address, description, id } = projectData
      const { error } = await supabase
        .from("projects")
        .update({ name, development_company, address, description })
        .eq('id', id)
      if (error) throw error
      setEditing(false)
    } catch (err: any) {
      setError(err.message || "Failed to save project")
    } finally {
      setCreating(false)
    }
  }

  const getTabStatus = (tab: string) => {
    switch (tab) {
      case "overview":
        return projectData.name && projectData.development_company ? "complete" : "incomplete"
      case "unit-types":
        return projectData.unitTypes.length > 0 ? "complete" : "incomplete"
      case "units":
        return projectData.units.length > 0 ? "complete" : "incomplete"
      case "upgrades":
        return projectData.upgradeOptions.length > 0 ? "complete" : "incomplete"
      case "color-schemes":
        return projectData.colorSchemes.length > 0 ? "complete" : "incomplete"
      default:
        return "incomplete"
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/projects">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Projects
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create New Project</h1>
              <p className="text-gray-600">Set up a new development project with units and upgrade options</p>
            </div>
          </div>
          {!created ? (
            <Button onClick={handleCreateProject} className="flex items-center gap-2" disabled={creating}>
              <Plus className="w-4 h-4" />
              Create Project
            </Button>
          ) : activeTab === "overview" && (
            editing ? (
              <Button onClick={handleSaveProject} className="flex items-center gap-2" disabled={creating}>
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            ) : (
              <Button onClick={() => setEditing(true)} className="flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Edit Project Details
              </Button>
            )
          )}
        </div>



        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              Project Details
              {getTabStatus("overview") === "complete" && <div className="w-2 h-2 bg-green-500 rounded-full" />}
            </TabsTrigger>
            <TabsTrigger value="unit-types" className="flex items-center gap-2" disabled={!created || editing}>
              Unit Types
              {getTabStatus("unit-types") === "complete" && <div className="w-2 h-2 bg-green-500 rounded-full" />}
            </TabsTrigger>
            <TabsTrigger value="units" className="flex items-center gap-2" disabled={!created || editing}>
              Units
              {getTabStatus("units") === "complete" && <div className="w-2 h-2 bg-green-500 rounded-full" />}
            </TabsTrigger>
            <TabsTrigger value="upgrades" className="flex items-center gap-2" disabled={!created || editing}>
              Upgrades
              {getTabStatus("upgrades") === "complete" && <div className="w-2 h-2 bg-green-500 rounded-full" />}
            </TabsTrigger>
            <TabsTrigger value="color-schemes" className="flex items-center gap-2" disabled={!created || editing}>
              Color Schemes
              {getTabStatus("color-schemes") === "complete" && <div className="w-2 h-2 bg-green-500 rounded-full" />}
            </TabsTrigger>
          </TabsList>

          {/* Project Overview Tab */}
          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Project Overview</CardTitle>
                <CardDescription>Enter the basic details for your new project.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="name">Project Name</Label>
                  <Input id="name" value={projectData.name} onChange={(e) => updateProjectBasics("name", e.target.value)} disabled={created && !editing} />
                </div>
                <div>
                  <Label htmlFor="development_company">Development Company</Label>
                  <Input id="development_company" value={projectData.development_company} onChange={(e) => updateProjectBasics("development_company", e.target.value)} disabled={created && !editing} />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" value={projectData.address} onChange={(e) => updateProjectBasics("address", e.target.value)} disabled={created && !editing} />
                </div>
                <div>
                  <Label htmlFor="logo">Project Logo</Label>
                  <div className="flex items-center gap-4 mt-2">
                    {mounted ? (
                      <img
                        src={logoPreviewUrl || "/placeholder.svg"}
                        alt="Project Logo"
                        className="h-12 w-auto border rounded"
                      />
                    ) : (
                      <img
                        src="/placeholder.svg"
                        alt="Project Logo"
                        className="h-12 w-auto border rounded"
                      />
                    )}
                    {mounted && (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleLogoUpload(file)
                        }}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        disabled={created && !editing}
                      />
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Project Description</Label>
                  <Textarea
                    id="description"
                    value={projectData.description}
                    onChange={(e) => updateProjectBasics("description", e.target.value)}
                    placeholder="Brief description of the development project..."
                    rows={4}
                    disabled={created && !editing}
                  />
                </div>
                {error && !created && <div className="text-red-500 mt-2">{error}</div>}
                {created && !editing && (
                  <div className="pt-4">
                    <Button onClick={() => setEditing(true)}>
                      Edit Project Details
                    </Button>
                  </div>
                )}
                {created && editing && (
                  <div className="pt-4 flex gap-2">
                    <Button onClick={handleSaveProject} disabled={creating}>
                      {creating ? "Saving..." : "Save Project"}
                    </Button>
                    <Button variant="outline" onClick={() => setEditing(false)} disabled={creating}>
                      Cancel
                    </Button>
                    {error && <div className="text-red-500 mt-2">{error}</div>}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Unit Types Tab */}
          <TabsContent value="unit-types">
            <UnitTypesManager
              unitTypes={projectData.unitTypes}
              onUnitTypesChange={updateUnitTypes}
              projectId={projectData.id}
            />
          </TabsContent>

          {/* Units Tab */}
          <TabsContent value="units">
            <UnitsManager
              units={projectData.units}
              unitTypes={projectData.unitTypes}
              onUnitsChange={updateUnits}
              projectName={projectData.name}
              projectId={projectData.id || ''}
            />
          </TabsContent>

          {/* Upgrade Options Tab */}
          <TabsContent value="upgrades">
            <UpgradeOptionsManager
              upgradeOptions={projectData.upgradeOptions}
              unitTypes={projectData.unitTypes}
              onUpgradeOptionsChange={updateUpgradeOptions}
            />
          </TabsContent>

          {/* Color Schemes Tab */}
          <TabsContent value="color-schemes">
            <ColorSchemesManager
              colorSchemes={projectData.colorSchemes}
              unitTypes={projectData.unitTypes}
              onColorSchemesChange={updateColorSchemes}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}
