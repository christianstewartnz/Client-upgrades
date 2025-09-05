"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Plus, Upload, Copy, Edit, Trash2, FileText } from "lucide-react"
import { UnitsManager } from '@/components/admin/units-manager'
import { supabase } from '@/lib/supabase'
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { Unit, UnitType } from '@/types/unit'

export default function UnitsPage() {
  const params = useParams()
  const projectId = params.projectId
  if (typeof projectId !== 'string') {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[300px]">
          <span className="text-lg text-red-500">Invalid project ID</span>
        </div>
      </AdminLayout>
    )
  }

  const [units, setUnits] = useState<Unit[]>([])
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([])
  const [colorSchemes, setColorSchemes] = useState<any[]>([])
  const [projectName, setProjectName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    const fetchData = async () => {
      try {
        // Fetch project name
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('name')
          .eq('id', projectId)
          .single()
        if (projectError) throw projectError
        setProjectName(projectData?.name || '')

        // Fetch unit types for this project
        const { data: unitTypesData, error: unitTypesError } = await supabase
          .from('unit_types')
          .select('id, name, description, bedrooms, bathrooms, size_m2')
          .eq('project_id', projectId)
        if (unitTypesError) throw unitTypesError
        setUnitTypes(
          (unitTypesData || []).map((ut: any) => ({
            id: ut.id,
            name: ut.name,
            description: ut.description || '',
            bedrooms: ut.bedrooms || 0,
            bathrooms: ut.bathrooms || 0,
            size_m2: ut.size_m2 || 0,
            allowedColorSchemes: [],
            allowedUpgrades: [],
            project_id: projectId
          }))
        )

        // Fetch units for this project
        const { data: unitsData, error: unitsError } = await supabase
          .from('units')
          .select('id, unit_number, project_id, unit_type_id, status, username, password, floor_plan_url')
          .eq('project_id', projectId)
        if (unitsError) throw unitsError

        // Fetch sales list assignments for units
        const unitIds = (unitsData || []).map((u: any) => u.id)
        let salesListAssignments: any[] = []
        if (unitIds.length > 0) {
          const { data: salesListData, error: salesListError } = await supabase
            .from('sales_list_units')
            .select('unit_id, sales_list_id')
            .in('unit_id', unitIds)
          if (!salesListError) {
            salesListAssignments = salesListData || []
          }
        }

        setUnits(
          (unitsData || []).map((u: any) => ({
            id: u.id,
            unit_number: u.unit_number,
            project_id: u.project_id,
            unit_type_id: u.unit_type_id,
            floor_plan_file: null, // Don't fake a File object
            floor_plan_url: u.floor_plan_url || '', // Store the actual URL
            status: u.status === 'active' ? 'active' : 'inactive',
            username: u.username || '',
            password: u.password || '',
            sales_list_assignments: salesListAssignments
              .filter(sla => sla.unit_id === u.id)
              .map(sla => sla.sales_list_id)
          }))
        )

        // Fetch color schemes for this project
        const { data: colorSchemesData, error: colorSchemesError } = await supabase
          .from('color_schemes')
          .select('*')
          .eq('project_id', projectId)
        if (colorSchemesError) throw colorSchemesError
        setColorSchemes((colorSchemesData || []).map((cs: any) => ({
          ...cs,
          allowedUnitTypes: cs.applicableunittypes || []
        })))

        setLoading(false)
      } catch (err: any) {
        setError(err.message || 'Failed to load project data')
        setLoading(false)
      }
    }
    fetchData()
  }, [projectId])

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent border-solid rounded-full animate-spin" />
            <span className="text-lg text-gray-500">Loading project data...</span>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[300px]">
          <span className="text-lg text-red-500">{error}</span>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Link href="/admin/projects">
          <Button variant="outline" className="mb-4 flex items-center gap-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">{projectName || projectId}</h1>
        <p className="text-gray-600 mb-4">Manage individual units and their client access</p>
        <UnitsManager
          units={units}
          unitTypes={unitTypes}
          colorSchemes={colorSchemes}
          onUnitsChange={setUnits}
          projectName={projectName}
          projectId={projectId}
        />
      </div>
    </AdminLayout>
  )
}
