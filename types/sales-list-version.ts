export interface SalesListVersion {
  id: string
  sales_list_id: string
  version_number: number
  version_name?: string
  description?: string
  created_by: string
  created_at: string
  is_current: boolean
  total_units: number
  units_with_prices: number
  average_list_price?: number
  total_list_value?: number
}

export interface SalesListVersionUnit {
  id: string
  version_id: string
  unit_id: string
  list_price?: number
  sold_price?: number
  status: 'available' | 'reserved' | 'sold' | 'withdrawn'
  notes?: string
  unit_number: string
  unit_type_name: string
  unit_type_details: {
    bedrooms?: number
    bathrooms?: number
    size_m2?: number
    description?: string
  }
  created_at: string
}

export interface VersionComparison {
  unit_id: string
  unit_number: string
  version1_list_price?: number
  version2_list_price?: number
  price_difference: number
  version1_status?: string
  version2_status?: string
  status_changed: boolean
}

export interface CreateVersionRequest {
  sales_list_id: string
  version_name?: string
  description?: string
  created_by: string
}

export interface RestoreVersionRequest {
  version_id: string
  created_by: string
}
