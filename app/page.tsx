"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, Users, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("client")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: ''
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      if (activeTab === "client") {
        // Client authentication
        const response = await fetch('/api/client-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginForm)
        })

        let data
        const contentType = response.headers.get('content-type')
        
        if (contentType && contentType.includes('application/json')) {
          data = await response.json()
        } else {
          // Handle cases where server returns HTML error pages
          const text = await response.text()
          throw new Error(`Server error: ${response.status} - ${text.slice(0, 100)}...`)
        }

        if (!response.ok) {
          throw new Error(data.error || 'Login failed')
        }

        // Save client session
        localStorage.setItem('client-session', JSON.stringify({
          unitId: data.unit.id,
          username: data.unit.username
        }))

        router.push('/client')
      } else {
        // Admin authentication
        const response = await fetch('/api/admin-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginForm)
        })

        let data
        const contentType = response.headers.get('content-type')
        
        if (contentType && contentType.includes('application/json')) {
          data = await response.json()
        } else {
          // Handle cases where server returns HTML error pages
          const text = await response.text()
          throw new Error(`Server error: ${response.status} - ${text.slice(0, 100)}...`)
        }

        if (!response.ok) {
          throw new Error(data.error || 'Admin login failed')
        }

        // Save admin session
        localStorage.setItem('admin-session', JSON.stringify({
          username: data.admin.username,
          role: data.admin.role
        }))
        
        router.push('/admin')
      }
    } catch (error) {
      console.error('Login error:', error)
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          setError('Cannot connect to server. Please check your internet connection.')
        } else if (error.message.includes('Database connection not configured')) {
          setError('Database not configured. Please check setup documentation.')
        } else {
          setError(error.message)
        }
      } else {
        setError('Login failed. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Property Development Portal
          </h1>
          <p className="text-gray-600">
            Access your personalized dashboard
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">Sign In</CardTitle>
            <CardDescription>Choose your access type and enter your credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="client" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Client
                </TabsTrigger>
                <TabsTrigger value="admin" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Admin
                </TabsTrigger>
              </TabsList>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">
                    {activeTab === "client" ? "Username" : "Admin Username"}
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder={activeTab === "client" ? "Enter your username" : "Enter admin username"}
                    value={loginForm.username}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                      disabled={isLoading}
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

                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                    {error}
                  </div>
                )}

                <TabsContent value="client" className="mt-0 space-y-0">
                  <p className="text-xs text-gray-500 mb-4">
                    Use the username and password provided by your property developer
                  </p>
                </TabsContent>

                <TabsContent value="admin" className="mt-0 space-y-0">
                  <p className="text-xs text-gray-500 mb-4">
                    Administrative access for project management and configuration
                  </p>
                </TabsContent>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || !loginForm.username || !loginForm.password}
                >
                  {isLoading ? "Signing in..." : `Access ${activeTab === "client" ? "Client" : "Admin"} Portal`}
                </Button>
              </form>
            </Tabs>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            {activeTab === "client" 
              ? "Need help accessing your unit? Contact your development company for assistance."
              : "For admin support, contact your system administrator."
            }
          </p>
        </div>
      </div>
    </div>
  )
}
