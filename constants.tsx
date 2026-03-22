
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
  },
  {
    name: 'Priya Sharma',
    roll_no: '21E1122',
    registration_no: '2113101035280',
    dob: '2004-03-22',
    sex: 'Female',
    department: 'Electronics',
    stream: 'B.Tech',
    section: 'B',
    shift: 'Day',
    years: '3rd Year',
    aadhar_no: '9876 5432 1098',
    has_pan: false,
    address: '45, Rosewood Street, Delhi',
    email: 'priya.s@college.edu',
    student_phone: '+91 99887 76655',
    father_name: 'Suresh Sharma',
    father_phone: '+91 99887 76654',
    father_occupation: 'Business',
    mother_name: 'Anita Sharma',
    mother_phone: '+91 99887 76653',
    mother_occupation: 'Doctor',
    parent_phone: '+91 99887 76654',
    photo_url: 'https://i.pravatar.cc/150?u=priya',
    punctuality_score: 95,
    late_count_this_month: 1,
    has_generated_qr: true
  },
  {
    name: 'nagappan',
    roll_no: '23E2636',
    registration_no: '231310103324',
    dob: '2005-06-21',
    sex: 'Male',
    department: 'BCA',
    stream: 'BCA',
    section: 'A',
    shift: 'Day',
    years: '3',
    aadhar_no: '4455 6677 8899',
    has_pan: false,
    address: 'Vellore, Tamil Nadu',
    email: 'esrdtfyhk@gmail.com',
    student_phone: '9884867189',
    father_name: 'Murugan',
    father_phone: '9884867189',
    father_occupation: 'Farmer',
    mother_name: 'Selvi',
    mother_phone: '9884867180',
    mother_occupation: 'Homemaker',
    parent_phone: '9884867189', // Matches student phone as per screenshot layout logic
    photo_url: 'https://i.ibb.co/vzR0yPv/Nagappan.jpg', // Using a placeholder or the one from the system if available
    punctuality_score: 100,
    late_count_this_month: 0,
    has_generated_qr: true
  }
];

export const GATES = [
  'Krishna Block',
  'Main Block',
  'Goverdhan Block',
  'Gangha Block'
];

export const ROLE_CONFIG = {
  [AppRole.FACULTY]: { title: 'Discipline Incharge', color: 'blue' },
  [AppRole.STUDENT]: { title: 'Student Portal', color: 'indigo' },
  [AppRole.ADMIN_TEACHER]: { title: 'Teacher Dashboard', color: 'green' },
  [AppRole.ADMIN_HOD]: { title: 'HOD Analytics', color: 'purple' },
  [AppRole.ADMIN_PRINCIPAL]: { title: 'Principal Command', color: 'red' },
};
