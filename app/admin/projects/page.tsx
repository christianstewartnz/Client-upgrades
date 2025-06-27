"use client"

import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Building2, Users, Settings, ChevronDown, ChevronRight } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Project } from '@/types/project'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [openProjects, setOpenProjects] = useState<string[]>([])
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [editForm, setEditForm] = useState({ name: "", development_company: "", address: "", description: "" })
  const [showEditModal, setShowEditModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("id, name, development_company, address, description, logo_url, created_at")
      .order("created_at", { ascending: false })
    if (error) {
      console.error("Error fetching projects:", error)
    } else {
      setProjects(data || [])
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return
    const { error } = await supabase.from("projects").delete().eq("id", id)
    if (error) {
      alert("Error deleting project: " + (error.message || JSON.stringify(error)))
    } else {
      setProjects((prev) => prev.filter((p) => p.id !== id))
    }
  }

  const openEdit = (project: Project) => {
    setEditProject(project)
    setEditForm({
      name: project.name,
      development_company: project.development_company,
      address: project.address,
      description: project.description,
    })
    setShowEditModal(true)
  }

  const handleEditChange = (field: string, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleEditSave = async () => {
    if (!editProject) return
    const { error } = await supabase
      .from("projects")
      .update({
        name: editForm.name,
        development_company: editForm.development_company,
        address: editForm.address,
        description: editForm.description,
      })
      .eq("id", editProject.id)
    if (error) {
      alert("Error updating project: " + (error.message || JSON.stringify(error)))
    } else {
      setShowEditModal(false)
      setEditProject(null)
      fetchProjects()
    }
  }

  const toggleProject = (projectId: string) => {
    setOpenProjects((prev) => (prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "completed":
        return "bg-blue-100 text-blue-800"
      case "planning":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
            <p className="text-gray-600">Manage your development projects</p>
          </div>
          <Link href="/admin/projects/new">
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Project
            </Button>
          </Link>
        </div>

        <div className="space-y-4">
          {projects.length === 0 ? (
            <p className="text-gray-500">No projects found.</p>
          ) : (
            projects.map((project) => (
              <Card key={project.id}>
                <Collapsible open={openProjects.includes(project.id)} onOpenChange={() => toggleProject(project.id)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {openProjects.includes(project.id) ? (
                            <ChevronDown className="w-5 h-5 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-500" />
                          )}
                          <div>
                            <CardTitle className="text-xl">{project.name}</CardTitle>
                            <CardDescription>
                              {project.development_company} • {project.address}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(project) }}>
                            Edit
                          </Button>
                          <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(project.id) }}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <Link href={`/admin/projects/${project.id}`} passHref legacyBehavior>
                          <Button asChild variant="outline" className="flex items-center gap-2 w-full">
                            <a><Building2 className="w-4 h-4" />Overview</a>
                          </Button>
                        </Link>
                        <Link href={`/admin/projects/${project.id}/unit-types`} passHref legacyBehavior>
                          <Button asChild variant="outline" className="flex items-center gap-2 w-full">
                            <a><Settings className="w-4 h-4" />Unit Types</a>
                          </Button>
                        </Link>
                        <Link href={`/admin/projects/${project.id}/units`} passHref legacyBehavior>
                          <Button asChild variant="outline" className="flex items-center gap-2 w-full">
                            <a><Users className="w-4 h-4" />Units</a>
                          </Button>
                        </Link>
                        <Link href={`/admin/projects/${project.id}/upgrades`} passHref legacyBehavior>
                          <Button asChild variant="outline" className="flex items-center gap-2 w-full">
                            <a><Plus className="w-4 h-4" />Upgrades</a>
                          </Button>
                        </Link>
                        <Link href={`/admin/projects/${project.id}/color-schemes`} passHref legacyBehavior>
                          <Button asChild variant="outline" className="flex items-center gap-2 w-full">
                            <a><Settings className="w-4 h-4" />Color Schemes</a>
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))
          )}
        </div>

        {/* Edit Project Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Name</label>
                <input
                  className="w-full border rounded p-2"
                  value={editForm.name}
                  onChange={e => handleEditChange("name", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Development Company</label>
                <input
                  className="w-full border rounded p-2"
                  value={editForm.development_company}
                  onChange={e => handleEditChange("development_company", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Address</label>
                <input
                  className="w-full border rounded p-2"
                  value={editForm.address}
                  onChange={e => handleEditChange("address", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Description</label>
                <textarea
                  className="w-full border rounded p-2"
                  value={editForm.description}
                  onChange={e => handleEditChange("description", e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
                <Button onClick={handleEditSave}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
