export interface ColorScheme {
  id?: string;
  name: string;
  description: string;
  color_board_file?: string | null;
  materials: {
    paint: string;
    paint_link: string | null;
    carpet: string;
    carpet_link: string | null;
    kitchen_floor: string;
    kitchen_floor_link: string | null;
    kitchen_splashback: string;
    kitchen_splashback_link: string | null;
    bathroom_tiles: string;
    bathroom_tiles_link: string | null;
  };
  allowedUnitTypes: string[];
  project_id: string;
} 