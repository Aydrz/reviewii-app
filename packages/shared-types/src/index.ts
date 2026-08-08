export type ProjectStatus = 'pending' | 'revisi' | 'approved';
export type AuthorType = 'editor' | 'guest';
export type CommentType = 'text' | 'voice' | 'drawing';
export type FileType = 'video' | 'photo';
export type ProcessingStatus = 'processing' | 'ready' | 'failed';

export interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface Project {
  id: string;
  owner_id: string;
  client_name: string;
  client_contact: string;
  editor_phone?: string;
  title: string;
  description?: string;
  status: ProjectStatus;
  deadline?: string;
  drive_folder_id?: string;
  watermark_enabled: boolean;
  payment_required: boolean;
  payment_status: boolean;
  created_at: string;
  updated_at: string;
  versions?: Version[];
  guest_tokens?: GuestToken[];
  chat_messages?: ChatMessage[];
}

export interface Version {
  id: string;
  project_id: string;
  version_number: number;
  file_type: FileType;
  drive_file_id?: string;
  drive_proxy_file_id?: string;
  file_url: string;
  proxy_url?: string;
  thumbnail_url?: string;
  watermark_url?: string;
  duration_seconds: number;
  processing_status: ProcessingStatus;
  uploaded_at: string;
  comments?: Comment[];
  approvals?: Approval[];
}

export interface CommentReply {
  id: string;
  comment_id: string;
  author_type: AuthorType;
  author_name: string;
  content: string;
  created_at: string;
}

export interface Comment {
  id: string;
  version_id: string;
  author_type: AuthorType;
  author_name: string;
  guest_token_id?: string;
  timestamp_seconds: number;
  timestamp_end_seconds?: number;
  category?: string;
  attachment_url?: string;
  pin_x?: number;
  pin_y?: number;
  comment_type: CommentType;
  content?: string;
  voice_url?: string;
  drawing_data?: string;
  reactions?: Record<string, number>;
  replies?: CommentReply[];
  created_at: string;
}

export interface Approval {
  id: string;
  version_id: string;
  approved_by: string;
  guest_token_id?: string;
  approved_at: string;
}

export interface GuestToken {
  id: string;
  project_id: string;
  token: string;
  pin_code?: string;
  expires_at?: string;
  last_accessed_at?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  ref_project_id?: string;
  ref_version_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  project_id: string;
  author_type: AuthorType;
  author_name: string;
  content: string;
  attachment_url?: string;
  created_at: string;
}

export interface CreateProjectDto {
  client_name: string;
  client_contact: string;
  editor_phone?: string;
  title: string;
  description?: string;
  deadline?: string;
  watermark_enabled?: boolean;
  payment_required?: boolean;
  enable_pin?: boolean;
  pin_code?: string;
}

export interface CreateGuestLinkDto {
  enable_pin?: boolean;
  pin_code?: string;
  expires_in_days?: number;
}
