"use client"

import { useState } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Upload, Save } from "lucide-react"

export default function BrandingPage() {
  const [branding, setBranding] = useState({
    companyName: "PropertyDev Solutions",
    logoUrl: "/placeholder.svg?height=60&width=180",
    primaryColor: "#3B82F6",
    secondaryColor: "#1E40AF",
    footerText: "© 2024 PropertyDev Solutions. All rights reserved.",
    contactEmail: "info@propertydevsolutions.com",
    contactPhone: "+64 9 123 4567",
  })

  const handleSave = () => {
    // Save branding settings
    console.log("Saving branding:", branding)
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Branding</h1>
          <p className="text-gray-600">Manage your global website branding and appearance</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Branding Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Brand Identity</CardTitle>
              <CardDescription>Configure your company branding that appears across all client portals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={branding.companyName}
                  onChange={(e) => setBranding((prev) => ({ ...prev, companyName: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="logo">Company Logo</Label>
                <div className="flex items-center gap-4 mt-2">
                  <img
                    src={branding.logoUrl || "/placeholder.svg"}
                    alt="Company Logo"
                    className="h-12 w-auto border rounded"
                  />
                  <Button variant="outline" className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Upload New Logo
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-1">Recommended: 180x60px, PNG or SVG format</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={branding.primaryColor}
                      onChange={(e) => setBranding((prev) => ({ ...prev, primaryColor: e.target.value }))}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={branding.primaryColor}
                      onChange={(e) => setBranding((prev) => ({ ...prev, primaryColor: e.target.value }))}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={branding.secondaryColor}
                      onChange={(e) => setBranding((prev) => ({ ...prev, secondaryColor: e.target.value }))}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={branding.secondaryColor}
                      onChange={(e) => setBranding((prev) => ({ ...prev, secondaryColor: e.target.value }))}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Contact details displayed in client portals and communications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={branding.contactEmail}
                  onChange={(e) => setBranding((prev) => ({ ...prev, contactEmail: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  value={branding.contactPhone}
                  onChange={(e) => setBranding((prev) => ({ ...prev, contactPhone: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="footerText">Footer Text</Label>
                <Textarea
                  id="footerText"
                  value={branding.footerText}
                  onChange={(e) => setBranding((prev) => ({ ...prev, footerText: e.target.value }))}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>See how your branding will appear in client portals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-6 bg-white">
              <div className="flex items-center gap-3 mb-4">
                <img src={branding.logoUrl || "/placeholder.svg"} alt="Company Logo" className="h-10 w-auto" />
                <span className="text-lg font-semibold" style={{ color: branding.primaryColor }}>
                  {branding.companyName}
                </span>
              </div>
              <div className="border-l-4 pl-4" style={{ borderColor: branding.primaryColor }}>
                <h2 className="text-xl font-bold text-gray-900">Sample Project Name</h2>
                <p className="text-gray-600">Development Company Ltd</p>
              </div>
              <div className="mt-6 pt-4 border-t text-sm text-gray-500">{branding.footerText}</div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save Branding Settings
          </Button>
        </div>
      </div>
    </AdminLayout>
  )
}
