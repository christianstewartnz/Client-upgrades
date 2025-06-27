"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { supabase } from '@/lib/supabase'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function ProjectOverviewPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('name, development_company, address, description')
          .eq('id', projectId)
          .single()
        if (error) throw error
        setProject(data)
        setLoading(false)
      } catch (err: any) {
        setError(err.message || 'Failed to load project')
        setLoading(false)
      }
    }
    fetchData()
  }, [projectId])

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
        <Card>
          <CardHeader>
            <CardTitle>{project.name}</CardTitle>
            <CardDescription>{project.development_company}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-2"><strong>Address:</strong> {project.address}</div>
            <div><strong>Description:</strong> {project.description}</div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
} 