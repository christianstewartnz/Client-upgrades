import Image from "next/image"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

interface ClientHeaderProps {
  project_name: string
  development_company: string
}

export function ClientHeader({ project_name, development_company }: ClientHeaderProps) {
  return (
    <header className="bg-white border-b">
      <div className="max-w-4xl mx-auto px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project_name}</h1>
            <p className="text-gray-600">{development_company}</p>
          </div>
          <div className="mt-2 md:mt-0">
            <Button variant="outline" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Portal
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
