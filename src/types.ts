export type UserRole = 'administrator' | 'gestor' | 'visor';

export interface User {
  id: number;
  username: string;
  name: string;
  role: UserRole;
  created_at?: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: User;
}

export interface Ticket {
  id?: number;
  ticket_number: string;
  subject: string;
  status: string;
  department: string;
  type: string;
  owner: string;
  assigned_agent: string;
  creator: string;
  is_purchase_over_2000: string;
  created_at: string;
  created_year: number;
  created_month: number;
  deadline_date: string | null;
  finished_date: string | null;
  pending_verification_date: string | null;
  closed_at: string | null;
  upload_batch_month?: number;
  upload_batch_year?: number;
  created_at_timestamp?: number;
  deadline_timestamp?: number | null;
  finished_timestamp?: number | null;
  is_overdue?: boolean;
  is_uncompleted?: boolean;
}

export interface StatsResponse {
  db_total_tickets: number;
  total_tickets: number;
  open_tickets: number;
  closed_tickets: number;
  in_payment_tickets: number;
  overdue_tickets: number; // fecha_finalizada > fecha_limite
  uncompleted_tickets: number; // sin fecha_finalizada
  over_2000_tickets: number;
  under_2000_tickets: number;
  by_department: Array<{ department: string; count: number; open: number; closed: number }>;
  by_status: Array<{ status: string; count: number }>;
  by_type: Array<{ type: string; count: number }>;
  by_agent: Array<{ agent: string; count: number; open: number; closed: number }>;
  on_time_compliance: {
    on_time: number;
    late: number;
    pending_no_date: number;
  };
  months_available: Array<{ month: number; year: number; count: number }>;
}

export interface UploadResult {
  success: boolean;
  message: string;
  target_month: number;
  target_year: number;
  total_excel_rows: number;
  imported_count: number;
  discriminated_count: number;
  errors?: string[];
  sample_rows?: Ticket[];
}

export interface SpecialTicketsResponse {
  overdue_tickets: Ticket[]; // fecha_limite < fecha_finalizada
  uncompleted_tickets: Ticket[]; // sin fecha_finalizada
  all_special_count: number;
}
