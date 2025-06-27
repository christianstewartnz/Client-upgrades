"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { AdminLayout } from "@/components/admin/admin-layout"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { supabase } from '@/lib/supabase'
import { ColorSchemesManager } from '@/components/admin/color-schemes-manager'

export default function ProjectColorSchemesPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const [colorSchemes, setColorSchemes] = useState<any[]>([])
  const [unitTypes, setUnitTypes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    const fetchData = async () => {
      try {
        const { data: colorSchemesData, error: colorSchemesError } = await supabase
          .from('color_schemes')
          .select('*')
          .eq('project_id', projectId)
        if (colorSchemesError) throw colorSchemesError
        setColorSchemes((colorSchemesData || []).map((cs: any) => ({
          ...cs,
          allowedUnitTypes: cs.applicableunittypes || []
        })))

        const { data: unitTypesData, error: unitTypesError } = await supabase
          .from('unit_types')
          .select('id, name, description, bedrooms, bathrooms, size_m2, allowedColorSchemes, allowedUpgrades')
          .eq('project_id', projectId)
        if (unitTypesError) throw unitTypesError
        setUnitTypes(
          (unitTypesData || []).map((ut: any) => ({
            ...ut,
            sizeM2: ut.size_m2,
            allowedColorSchemes: ut.allowedColorSchemes || [],
            allowedUpgrades: ut.allowedUpgrades || [],
          }))
        )
        setLoading(false)
      } catch (err: any) {
        setError(err.message || 'Failed to load color schemes')
        setLoading(false)
      }
    }
    fetchData()
  }, [projectId])

  const handleColorSchemesChange = async (newColorSchemes: any[]) => {
    setSaving(true)
    setError(null)
    try {
      // Find deleted color schemes
      const deleted = colorSchemes.filter((cs) => !newColorSchemes.some((n) => n.id === cs.id))
      for (const del of deleted) {
        await supabase.from('color_schemes').delete().eq('id', del.id)
      }
      
      // Upsert (add or update) the rest
      for (const cs of newColorSchemes) {
        const upsertData = { 
          ...cs, 
          project_id: projectId,
          applicableunittypes: cs.allowedUnitTypes
        }
        if (!upsertData.id) delete upsertData.id
        // Remove the camelCase version since we're using the database column name
        delete upsertData.allowedUnitTypes
        
        const { error } = await supabase.from('color_schemes').upsert(upsertData)
        if (error) throw error
      }
      
      // Re-fetch from Supabase to get the real data
      const { data, error } = await supabase
        .from('color_schemes')
        .select('*')
        .eq('project_id', projectId)
      if (error) throw error
      
      setColorSchemes((data || []).map((cs: any) => ({
        ...cs,
        allowedUnitTypes: cs.applicableunittypes || []
      })))
    } catch (err: any) {
      setError(err.message || 'Failed to save color schemes')
    }
    setSaving(false)
  }

  if (loading) {
    return <AdminLayout><div className="flex items-center justify-center min-h-[300px]"><div className="w-8 h-8 border-4 border-blue-400 border-t-transparent border-solid rounded-full animate-spin" /></div></AdminLayout>
  }
  if (error) {
    return <AdminLayout><div className="flex items-center justify-center min-h-[300px]"><span className="text-lg text-red-500">{error}</span></div></AdminLayout>
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
        {saving && <div className="text-blue-500 mb-2">Saving changes...</div>}
        <ColorSchemesManager 
          colorSchemes={colorSchemes} 
          unitTypes={unitTypes} 
          onColorSchemesChange={handleColorSchemesChange} 
          projectId={projectId}
        />
      </div>
    </AdminLayout>
  )
} 