
export enum AppRole {
  FACULTY = 'FACULTY',
  STUDENT = 'STUDENT',
  DISCIPLINE_INCHARGE = 'DISCIPLINE_INCHARGE',
  ADMIN_TEACHER = 'ADMIN_TEACHER',
  ADMIN_HOD = 'ADMIN_HOD',
  ADMIN_PRINCIPAL = 'ADMIN_PRINCIPAL'
}

export interface User {
  id: string;
  name: string;
  role: AppRole;
  avatar?: string;
  hasGeneratedQR?: boolean;
  assignedValue?: string;
}

export interface Student {
  // Primary Identifiers
  roll_no: string;
  registration_no: string;
  name: string;

  // Personal Details
  dob: string;
  sex: string;
  address: string;
  photo_url: string;

  // Academic Info
  department: string;
  stream: string;
  section: string;
  shift: string;
  years?: string; // Academic Year/Batch

  // Identity
  aadhar_no: string;
  has_pan: boolean;
  pan_no?: string;

  // Contact Info
  email: string;
  student_phone: string;
  alt_phone?: string;

  // Family Info
  father_name: string;
  father_phone: string;
  father_occupation: string;
  mother_name: string;
  mother_phone: string;
  mother_occupation: string;
  parent_phone: string; // Legacy field for generic parent contact

  // System Tracking
  punctuality_score: number;
  late_count_this_month: number;
  has_generated_qr?: boolean;
}

export interface LateRecord {
  id: string;
  student_roll: string;
  timestamp: string;
  gate: string;
  status: 'confirmed' | 'pending' | 'excused';
  reason?: string;
}

export interface AnalysisResult {
  riskLevel: 'Low' | 'Medium' | 'High';
  prediction: string;
  recommendation: string;
}
