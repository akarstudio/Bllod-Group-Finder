
import { BloodGroup, AlertTemplate } from './types';

export const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export const DISCLAIMER = "This platform connects voluntary blood donors. No money is involved. Please report any fraudulent activity.";

export const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'password123',
  note: "READ_ME: The default administrative credentials for this portal are 'admin' and 'password123'. Keep this information secure."
};

export const ALERT_TEMPLATES: AlertTemplate[] = [
  {
    id: 't1',
    name: 'Accident Emergency',
    severity: 'Critical',
    message: 'Multiple trauma victims admitted. Immediate blood support needed for surgery. Please respond if you are nearby.'
  },
  {
    id: 't2',
    name: 'General Shortage',
    severity: 'Urgent',
    message: 'The local blood bank is running low on this specific group. We invite healthy donors to visit the facility today.'
  },
  {
    id: 't3',
    name: 'Scheduled Surgery',
    severity: 'Standard',
    message: 'Planned operation for tomorrow morning. We are seeking 2 units of this blood group for backup.'
  }
];

export const INITIAL_DONORS: any[] = [
  {
    id: '1',
    name: 'John Doe',
    bloodGroup: 'O+',
    age: 28,
    gender: 'Male',
    address: 'Downtown Metro',
    phone: '+1234567890',
    occupation: 'Engineer',
    designation: 'Software Lead',
    department: 'Technology',
    lastDonationDate: '2023-10-15',
    availability: 'Available',
    verificationStatus: 'Verified',
    createdAt: new Date().toISOString(),
    isBlocked: false,
    reports: 0
  },
  {
    id: '2',
    name: 'Sarah Smith',
    bloodGroup: 'B-',
    age: 32,
    gender: 'Female',
    address: 'North Hills',
    phone: '+1987654321',
    occupation: 'Teacher',
    designation: 'Senior Instructor',
    department: 'Education',
    lastDonationDate: '2023-11-20',
    availability: 'Available',
    verificationStatus: 'Unverified',
    createdAt: new Date().toISOString(),
    isBlocked: false,
    reports: 0
  }
];
