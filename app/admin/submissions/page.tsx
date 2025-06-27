"use client"

import { useState } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Search } from "lucide-react"
import type { Submission } from '../../types/submission'

export default function SubmissionsPage() {
  const [submissions] = useState<Submission[]>([
    {
      id: "1",
      unitNumber: "A-101",
      projectName: "Riverside Gardens",
      clientName: "John Smith",
      colorScheme: "Light",
      upgradeValue: 12450,
      status: "submitted",
      submittedDate: "2024-01-15",
    },
    {
      id: "2",
      unitNumber: "B-203",
      projectName: "Harbor View",
      clientName: "Sarah Johnson",
      colorScheme: "Neutral",
      upgradeValue: 8200,
      status: "draft",
      submittedDate: "2024-01-14",
    },
    {
      id: "3",
      unitNumber: "A-105",
      projectName: "Riverside Gardens",
      clientName: "Mike Wilson",
      colorScheme: "Dark",
      upgradeValue: 15600,
      status: "submitted",
      submittedDate: "2024-01-13",
    },
    {
      id: "4",
      unitNumber: "C-301",
      projectName: "City Heights",
      clientName: "Emma Davis",
      colorScheme: "Light",
      upgradeValue: 6800,
      status: "draft",
      submittedDate: "2024-01-12",
    },
  ])

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [projectFilter, setProjectFilter] = useState("all")

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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Submissions</h1>
            <p className="text-gray-600">View and manage client selections</p>
          </div>
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

        {/* Submissions List */}
        <Card>
          <CardHeader>
            <CardTitle>Client Submissions ({filteredSubmissions.length})</CardTitle>
            <CardDescription>Overview of all client selections and their current status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                      <p className="font-medium">{submission.unitNumber}</p>
                      <p className="text-sm text-gray-600">{submission.projectName}</p>
                    </div>

                    <div>
                      <p className="font-medium">{submission.clientName}</p>
                      <p className="text-sm text-gray-600">Color: {submission.colorScheme}</p>
                    </div>

                    <div>
                      <p className="font-medium">${submission.upgradeValue.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">Upgrade value</p>
                    </div>

                    <div>
                      <Badge className={getStatusColor(submission.status)}>{submission.status}</Badge>
                      <p className="text-sm text-gray-600 mt-1">{submission.submittedDate}</p>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredSubmissions.length === 0 && (
                <div className="text-center py-8 text-gray-500">No submissions found matching your filters.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
