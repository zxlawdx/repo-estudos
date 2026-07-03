export interface UserProfile {
  id?: string;
  user_id?: string;
  display_name?: string;
  displayName?: string;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  avatar_url?: string;
  profilePhotoUrl?: string;
  [key: string]: unknown;
}

export interface AuthLoginResponse {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  user?: UserProfile;
  profile?: UserProfile;
  [key: string]: unknown;
}

export interface StudyMaterial {
  id?: string;
  material_id?: string;
  file_id?: string;
  title?: string;
  final_name?: string;
  suggested_name?: string;
  original_name?: string;
  file_name?: string;
  file_type?: string;
  type?: string;
  status?: string;
  author?: string;
  year?: string | number;
  category_name?: string;
  category?: string | { name?: string };
  subject_name?: string;
  cycle_name?: string;
  tags?: string[] | string;
  visibility?: string;
  google_drive_preview_url?: string;
  google_drive_url?: string;
  preview_url?: string;
  url?: string;
  description?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface LearningPath {
  id?: string;
  path_id?: string;
  title?: string;
  name?: string;
  description?: string;
  level?: string;
  area?: string;
  tags?: string[] | string;
  estimated_time?: string | number;
  material_count?: number;
  progress?: number;
  [key: string]: unknown;
}

export interface GraphNode {
  id: string;
  label?: string;
  title?: string;
  type?: string;
  x?: number;
  y?: number;
  [key: string]: unknown;
}

export interface GraphEdge {
  id?: string;
  source?: string;
  target?: string;
  from?: string;
  to?: string;
  type?: string;
  relation_type?: string;
  [key: string]: unknown;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  [key: string]: unknown;
}
