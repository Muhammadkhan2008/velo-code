export interface Project {
  id: number;
  user_id: number;
  name: string;
  description: string;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface File {
  id: number;
  project_id: number;
  path: string;
  content: string;
  created_at: string;
  updated_at: string;
}
