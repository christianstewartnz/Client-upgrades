"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, Users, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const [clientToken, setClientToken] = useState("")
  const [adminCredentials, setAdminCredentials] = useState({
    username: "",
    password: ""
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleClientLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (clientToken.trim()) {
      setIsLoading(true)
      // Simulate loading and redirect
      setTimeout(() => {
        window.location.href = `/client/${clientToken.trim()}`
      }, 500)
    }
  }

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (adminCredentials.username && adminCredentials.password) {
      setIsLoading(true)
      // For now, just redirect to admin (implement actual auth later)
      setTimeout(() => {
        window.location.href = "/admin"
      }, 500)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Property Portal</h1>
          <p className="text-gray-600">Access your personalized dashboard</p>
        </div>

        {/* Login Tabs */}
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">Sign In</CardTitle>
            <CardDescription>Choose your access type below</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="client" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="client" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Client
                </TabsTrigger>
                <TabsTrigger value="admin" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Admin
                </TabsTrigger>
              </TabsList>

              {/* Client Login */}
              <TabsContent value="client">
                <form onSubmit={handleClientLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="client-token">Access Token</Label>
                    <Input
                      id="client-token"
                      type="text"
                      placeholder="Enter your access token"
                      value={clientToken}
                      onChange={(e) => setClientToken(e.target.value)}
                      required
                    />
                    <p className="text-xs text-gray-500">
                      Your access token was provided by your property developer
                    </p>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading || !clientToken.trim()}
                  >
                    {isLoading ? "Signing in..." : "Access Client Portal"}
                  </Button>
                </form>
              </TabsContent>

              {/* Admin Login */}
              <TabsContent value="admin">
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-username">Username</Label>
                    <Input
                      id="admin-username"
                      type="text"
                      placeholder="Enter your username"
                      value={adminCredentials.username}
                      onChange={(e) => setAdminCredentials(prev => ({
                        ...prev,
                        username: e.target.value
                      }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="admin-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={adminCredentials.password}
                        onChange={(e) => setAdminCredentials(prev => ({
                          ...prev,
                          password: e.target.value
                        }))}
                        required
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    variant="outline" 
                    className="w-full"
                    disabled={isLoading || !adminCredentials.username || !adminCredentials.password}
                  >
                    {isLoading ? "Signing in..." : "Access Admin Dashboard"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Demo Notice */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Demo Mode: Use any credentials for admin or token "demo-token" for client
          </p>
        </div>
      </div>
    </div>
  )
}
