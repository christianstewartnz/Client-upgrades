export interface FloorPlanPoint {
  id: string;
  x: number;
  y: number;
  label: string;
  upgrade_id: string;
  upgrade_name: string;
  symbol: string;
  color: string;
}

export interface ClientUpgrade {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  quantity: number;
  floor_plan_points?: FloorPlanPoint[];
}

export interface ClientData {
  project_name: string;
  development_company: string;
  unit_number: string;
  unit_type: string;
  color_scheme: string;
  upgrades: ClientUpgrade[];
  is_submitted: boolean;
}

export interface ReviewSubmitStepProps {
  clientData: ClientData;
  onSubmit: () => void;
} 