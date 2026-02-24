
import React from 'react';
import { Student, AppRole } from './types';

export const MOCK_STUDENTS: Student[] = [
  {
    name: 'Arjun Mehta',
    roll_no: '21E1156',
    registration_no: '2113101035276',
    dob: '2003-05-15',
    sex: 'Male',
    department: 'Computer Science',
    stream: 'B.Tech',
    section: 'A',
    shift: 'Day',
    aadhar_no: '1234 5678 9012',
    has_pan: true,
    pan_no: 'ABCDE1234F',
    address: '123, Silicon Valley, Bangalore',
    email: 'arjun.mehta@college.edu',
    student_phone: '+91 98765 43210',
    alt_phone: '+91 98765 43211',
    father_name: 'Rajesh Mehta',
    // Added missing father_phone property to satisfy Student interface
    father_phone: '+91 98765 43210',
    father_occupation: 'Engineer',
    mother_name: 'Sushma Mehta',
    // Added missing mother_phone property to satisfy Student interface
    mother_phone: '+91 98765 43212',
    mother_occupation: 'Teacher',
    parent_phone: '+91 98765 43210',
    photo_url: 'https://i.pravatar.cc/150?u=arjun',
    punctuality_score: 85,
    late_count_this_month: 4,
    has_generated_qr: true
  }
];

export const GATES = [
  'Krishna Block',
  'Goverdhan Block',
  'Ganga Block',
  'Kavari Block',
  'Main Block'
];

export const ROLE_CONFIG = {
  [AppRole.FACULTY]: { title: 'Faculty Scanner', color: 'blue' },
  [AppRole.STUDENT]: { title: 'Student Portal', color: 'indigo' },
  [AppRole.ADMIN_TEACHER]: { title: 'Teacher Dashboard', color: 'green' },
  [AppRole.ADMIN_HOD]: { title: 'HOD Analytics', color: 'purple' },
  [AppRole.ADMIN_PRINCIPAL]: { title: 'Principal Command', color: 'red' },
};
