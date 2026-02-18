
import { Donor, DonorFormData, AuditLog, EmergencyAlert, AdminUser, AdminRole } from '../types';
import { INITIAL_DONORS, ADMIN_CREDENTIALS } from '../constants';

const DB_KEY = 'blood_donor_connect_donors';
const LOG_KEY = 'blood_donor_connect_audit_logs';
const ALERT_KEY = 'blood_donor_connect_emergency_alerts_collection';
const ADMINS_KEY = 'blood_donor_connect_admin_users_list';
const SESSION_KEY = 'blood_donor_connect_current_session';

const DEFAULT_ALERTS: EmergencyAlert[] = [
  {
    id: 'sys-alert-001',
    isActive: true,
    severity: 'Critical',
    bloodGroup: 'O-',
    hospitalName: 'City General Hospital',
    message: 'Trauma recovery protocol initiated. O- donors required for surgery backup.',
    updatedAt: new Date().toISOString()
  }
];

export const db = {
  // Session Management
  setSession: (user: AdminUser | Donor, type: 'admin' | 'donor') => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user, type }));
  },
  getSession: (): { user: AdminUser | Donor; type: 'admin' | 'donor' } | null => {
    const data = sessionStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  },
  clearSession: () => {
    sessionStorage.removeItem(SESSION_KEY);
  },

  getAdminUsers: (): AdminUser[] => {
    const data = localStorage.getItem(ADMINS_KEY);
    if (!data) {
      const initialAdmins: AdminUser[] = [{
        id: 'admin-001',
        username: ADMIN_CREDENTIALS.username,
        password: ADMIN_CREDENTIALS.password,
        role: AdminRole.SUPER_ADMIN,
        createdAt: new Date().toISOString()
      }];
      localStorage.setItem(ADMINS_KEY, JSON.stringify(initialAdmins));
      return initialAdmins;
    }
    return JSON.parse(data);
  },

  saveAdminUsers: (admins: AdminUser[]) => {
    localStorage.setItem(ADMINS_KEY, JSON.stringify(admins));
  },

  addAdminUser: (admin: Omit<AdminUser, 'id' | 'createdAt'>) => {
    const admins = db.getAdminUsers();
    const newUser: AdminUser = {
      ...admin,
      id: Math.random().toString(36).substring(2, 11),
      createdAt: new Date().toISOString()
    };
    db.saveAdminUsers([...admins, newUser]);
  },

  updateAdminUser: (id: string, updates: Partial<AdminUser>) => {
    const admins = db.getAdminUsers();
    const index = admins.findIndex(a => a.id === id);
    if (index !== -1) {
      admins[index] = { ...admins[index], ...updates };
      db.saveAdminUsers(admins);
    }
  },

  deleteAdminUser: (id: string) => {
    const admins = db.getAdminUsers();
    db.saveAdminUsers(admins.filter(a => a.id !== id));
  },

  // Donor Management (Local Only)
  getDonors: async (): Promise<Donor[]> => {
    const data = localStorage.getItem(DB_KEY);
    if (!data) {
      const preparedInitial = INITIAL_DONORS.map((d, i) => ({
        ...d,
        loginId: `BDC-ID00${i + 1}`,
        password: 'password',
        userType: 'Donor'
      }));
      localStorage.setItem(DB_KEY, JSON.stringify(preparedInitial));
      return preparedInitial as Donor[];
    }
    return JSON.parse(data);
  },

  saveDonors: (donors: Donor[]) => {
    localStorage.setItem(DB_KEY, JSON.stringify(donors));
  },

  addDonor: async (formData: DonorFormData): Promise<Donor> => {
    const donors = await db.getDonors();
    let loginId = '';
    let isUnique = false;
    while (!isUnique) {
      const rand = Math.floor(1000 + Math.random() * 9000);
      loginId = `BDC-ID${rand}`;
      isUnique = !donors.some(d => d.loginId === loginId);
    }
    const password = Math.random().toString(36).substring(2, 8).toUpperCase();

    const newDonor: Donor = {
      name: formData.name,
      bloodGroup: formData.bloodGroup,
      age: formData.age,
      gender: formData.gender,
      address: formData.address,
      phone: formData.phone,
      occupation: formData.occupation,
      designation: formData.designation,
      department: formData.department,
      lastDonationDate: formData.lastDonationDate,
      internalNotes: formData.internalNotes,
      loginId,
      password,
      userType: formData.userType || 'Donor',
      id: formData.id || Math.random().toString(36).substring(2, 11),
      createdAt: formData.createdAt || new Date().toISOString(),
      isBlocked: formData.isBlocked ?? false,
      verificationStatus: formData.verificationStatus || 'Unverified',
      reports: formData.reports ?? 0,
      availability: formData.availability || 'Available'
    } as Donor;

    const updated = [newDonor, ...donors];
    db.saveDonors(updated);
    return newDonor;
  },

  updateDonor: async (id: string, updates: Partial<Donor>): Promise<Donor | null> => {
    const donors = await db.getDonors();
    const index = donors.findIndex(d => d.id === id);
    if (index === -1) return null;
    
    const updatedDonor = { ...donors[index], ...updates };
    donors[index] = updatedDonor;
    db.saveDonors(donors);
    
    const session = db.getSession();
    if (session && session.type === 'donor' && session.user.id === id) {
      db.setSession(updatedDonor, 'donor');
    }
    
    return updatedDonor;
  },

  deleteDonor: async (id: string): Promise<boolean> => {
    const donors = await db.getDonors();
    const filtered = donors.filter(d => d.id !== id);
    db.saveDonors(filtered);
    return true;
  },

  // Emergency Alerts
  getEmergencyAlerts: (): EmergencyAlert[] => {
    const data = localStorage.getItem(ALERT_KEY);
    return data ? JSON.parse(data) : DEFAULT_ALERTS;
  },

  saveEmergencyAlerts: (alerts: EmergencyAlert[]): void => {
    localStorage.setItem(ALERT_KEY, JSON.stringify(alerts));
  },

  addEmergencyAlert: (alert: Omit<EmergencyAlert, 'id' | 'updatedAt'>): void => {
    const alerts = db.getEmergencyAlerts();
    const newAlert: EmergencyAlert = {
      ...alert,
      id: Math.random().toString(36).substring(2, 11),
      updatedAt: new Date().toISOString()
    };
    db.saveEmergencyAlerts([newAlert, ...alerts]);
  },

  deleteEmergencyAlert: (id: string): void => {
    const alerts = db.getEmergencyAlerts();
    db.saveEmergencyAlerts(alerts.filter(a => a.id !== id));
  },

  // Audit Logs
  getAuditLogs: (): AuditLog[] => {
    const data = localStorage.getItem(LOG_KEY);
    return data ? JSON.parse(data) : [];
  },

  addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog => {
    const logs = db.getAuditLogs();
    const newLog: AuditLog = {
      ...log,
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString()
    };
    const updated = [newLog, ...logs];
    localStorage.setItem(LOG_KEY, JSON.stringify(updated.slice(0, 500)));
    return newLog;
  }
};
