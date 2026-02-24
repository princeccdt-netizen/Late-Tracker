
import { supabase } from '../lib/supabase';
import { AppRole } from '../types';

export interface StaffData {
  id: string;
  name: string;
  email: string;
  password: string;
  role: AppRole;
  assigned_value: string;
  phone_no?: string;
  department?: string;
  stream?: string;
  years?: string;
  section?: string;
}

export const staffService = {
  /**
   * Registers a new staff member
   */
  async createStaff(staff: StaffData) {
    const { data, error } = await supabase
      .from('staff_users')
      .upsert([
        {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          password: staff.password,
          role: staff.role,
          assigned_value: staff.assigned_value,
          phone_no: staff.phone_no,
          department: staff.department,
          stream: staff.stream,
          years: staff.years,
          section: staff.section
        }
      ], { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Updates staff records
   */
  async updateStaff(id: string, updates: Partial<StaffData>) {
    const { data, error } = await supabase
      .from('staff_users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Fetches all staff (filtered by role constraints if necessary)
   */
  async getAllStaff() {
    const { data, error } = await supabase
      .from('staff_users')
      .select('*')
      .order('name');

    if (error) throw error;
    return data as StaffData[];
  },

  async getStaffByIdOrEmail(identifier: string) {
    const { data, error } = await supabase
      .from('staff_users')
      .select('*')
      .or(`id.eq.${identifier},email.eq.${identifier}`)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getStaffById(id: string) {
    const { data, error } = await supabase
      .from('staff_users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getLecturerForStudent(stream: string, section: string, years: string) {
    const { data, error } = await supabase
      .from('staff_users')
      .select('*')
      .eq('role', AppRole.ADMIN_TEACHER)
      .eq('stream', stream)
      .eq('section', section)
      .eq('years', years)
      .maybeSingle();

    if (error) throw error;
    return data as StaffData | null;
  }
};
