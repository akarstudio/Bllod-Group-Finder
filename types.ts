
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-';

export type AlertSeverity = 'Standard' | 'Urgent' | 'Critical';

export enum AdminRole {
  SUPER_ADMIN = 'Super Admin',
  EDITOR = 'Editor',
  VIEWER = 'Viewer'
}

export interface AdminUser {
  id: string;
  username: string;
  password?: string;
  role: AdminRole;
  createdAt: string;
  lastLogin?: string;
}

export interface EmergencyAlert {
  id: string;
  isActive: boolean;
  severity: AlertSeverity;
  bloodGroup: BloodGroup | 'All';
  hospitalName: string;
  message: string;
  link?: string;
  updatedAt: string;
}

export interface AlertTemplate {
  id: string;
  name: string;
  severity: AlertSeverity;
  message: string;
}

export interface Donor {
  id: string;
  loginId: string;
  password: string;
  name: string;
  bloodGroup: BloodGroup;
  age: number;
  gender?: string;
  address: string;
  phone: string;
  occupation: string;
  designation: string;
  department: string;
  lastDonationDate?: string;
  availability: 'Available' | 'Not Available';
  verificationStatus: 'Verified' | 'Unverified';
  createdAt: string;
  isBlocked: boolean;
  reports: number;
  internalNotes?: string;
  userType: 'Donor' | 'User';
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  adminUsername: string;
}

export interface DonorFormData extends Omit<Donor, 'id' | 'createdAt' | 'isBlocked' | 'reports' | 'verificationStatus' | 'availability' | 'loginId' | 'password' | 'userType'> {
  id?: string;
  verificationStatus?: 'Verified' | 'Unverified';
  isBlocked?: boolean;
  reports?: number;
  createdAt?: string;
  availability?: 'Available' | 'Not Available';
  internalNotes?: string;
  userType?: 'Donor' | 'User';
}

export enum AppView {
  HOME = 'home',
  REGISTER = 'register',
  SEARCH = 'search',
  ADMIN = 'admin',
  ADMIN_LOGIN = 'admin_login',
  DONOR_DASHBOARD = 'donor_dashboard',
  CHAT = 'chat'
}
