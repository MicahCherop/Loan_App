export type LeadStatus = 'new' | 'converted' | 'rejected';
export type LoanStatus = 'pending' | 'approved' | 'rejected' | 'disbursed' | 'active' | 'overdue' | 'closed';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface Lead {
  id: string;
  created_at: string;
  name: string;
  phone: string;
  email?: string;
  status: LeadStatus;
  officer_id: string;
}

export interface Customer {
  id: string;
  created_at: string;
  name: string;
  phone: string;
  email?: string;
  id_number?: string;
  id_front_url?: string;
  id_back_url?: string;
  photo_url: string;
  address: string;
  lead_id?: string;
  officer_id: string;
  loan_count?: number; // Calculated or stored
}

export interface Loan {
  id: string;
  created_at: string;
  customer_id: string;
  amount: number;
  tenure_months: number;
  interest_rate: number;
  status: LoanStatus;
  disbursement_date?: string;
  due_date?: string;
  repayment_amount: number;
  officer_id: string;
  customer?: Customer; // Joined
}

export interface LoanRequest {
  id: string;
  created_at: string;
  customer_id: string;
  amount: number;
  tenure_months: number;
  status: RequestStatus;
  officer_id?: string;
  customer?: Customer; // Joined
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
}
