export interface Submission {
  id: string;
  unit_number: string;
  project_name: string;
  client_name: string;
  color_scheme: string;
  upgrade_value: number;
  status: "draft" | "submitted";
  submitted_date: string;
} 