"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { AdminLayout } from "@/components/admin/admin-layout"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { supabase } from '@/lib/supabase'
import { UnitTypesManager } from '@/components/admin/unit-types-manager'
import type { UnitType } from '@/types/unit'

export default function ProjectUnitTypesPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Fetch unit types from Supabase
  useEffect(() => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from('unit_types')
          .select('id, name, description, bedrooms, bathrooms, size_m2, allowedColorSchemes, allowedUpgrades')
          .eq('project_id', projectId)
        if (error) throw error
        setUnitTypes(
          (data || []).map((ut: any) => ({
            ...ut,
            sizeM2: ut.size_m2,
            allowedColorSchemes: ut.allowedColorSchemes || [],
            allowedUpgrades: ut.allowedUpgrades || [],
          }))
        )
        setLoading(false)
      } catch (err: any) {
        setError(err.message || 'Failed to load unit types')
        setLoading(false)
      }
    }
    fetchData()
  }, [projectId])

  // Handle add/edit/delete
  const handleUnitTypesChange = async (newUnitTypes: UnitType[]) => {
    setSaving(true)
    setError(null)
    try {
      // Find deleted unit types
      const deleted = unitTypes.filter((ut) => !newUnitTypes.some((n) => n.id === ut.id))
      for (const del of deleted) {
        const { error: delError } = await supabase.from('unit_types').delete().eq('id', del.id)
        if (delError) {
          console.error('Supabase delete error:', delError)
          setError(delError.message)
          setSaving(false)
          return
        }
      }
      // Upsert (add or update) the rest
      for (const ut of newUnitTypes) {
        const { sizeM2, id, ...rest } = ut
        const upsertData = {
          ...rest,
          project_id: projectId,
          size_m2: sizeM2,
        }
        
        // For new unit types (without id), use insert
        if (!id) {
          const { error: insertError } = await supabase.from('unit_types').insert(upsertData)
          if (insertError) {
            console.error('Supabase insert error:', insertError)
            setError(insertError.message)
            setSaving(false)
            return
          }
        } else {
          // For existing unit types, use upsert
          const { error: upsertError } = await supabase.from('unit_types').upsert({ ...upsertData, id })
          if (upsertError) {
            console.error('Supabase upsert error:', upsertError)
            setError(upsertError.message)
            setSaving(false)
            return
          }
        }
      }
      // Re-fetch from Supabase to get the real data
      const { data, error: fetchError } = await supabase
        .from('unit_types')
        .select('id, name, description, bedrooms, bathrooms, size_m2, allowedColorSchemes, allowedUpgrades')
        .eq('project_id', projectId)
      if (fetchError) throw fetchError
      setUnitTypes(
        (data || []).map((ut: any) => ({
          ...ut,
          sizeM2: ut.size_m2,
          allowedColorSchemes: ut.allowedColorSchemes || [],
          allowedUpgrades: ut.allowedUpgrades || [],
        }))
      )
      setSaving(false)
    } catch (err: any) {
      console.error('handleUnitTypesChange error:', err)
      setError(err.message || 'Unknown error')
      setSaving(false)
    }
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
        {error && (
          <div className="text-red-500 mb-4">Error: {error}</div>
        )}
        <UnitTypesManager 
          unitTypes={unitTypes} 
          onUnitTypesChange={handleUnitTypesChange} 
          projectId={projectId}
        />
      </div>
    </AdminLayout>
  )
} 