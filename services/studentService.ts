
import { supabase } from '../lib/supabase';
import { Student } from '../types';

export const studentService = {
  /**
   * Fetches a single student by their roll number
   */
  async getStudentByRoll(rollNo: string) {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('roll_no', rollNo)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Registers a new student into the system with all 19 required fields
   */
  async createStudent(studentData: any) {
    const { data, error } = await supabase
      .from('students')
      .upsert([
        {
          roll_no: studentData.roll_no,
          registration_no: studentData.registration_no,
          name: studentData.name,
          dob: studentData.dob || null,
          sex: studentData.sex,
          department: studentData.department,
          stream: studentData.stream,
          section: studentData.section,
          shift: studentData.shift,
          years: studentData.years,
          student_phone: studentData.student_phone,
          email: studentData.email || `${studentData.roll_no}@college.edu`,
          father_name: studentData.father_name,
          father_phone: studentData.father_phone,
          father_occupation: studentData.father_occupation,
          mother_name: studentData.mother_name,
          mother_phone: studentData.mother_phone,
          mother_occupation: studentData.mother_occupation,
          parent_phone: studentData.father_phone || studentData.mother_phone,
          password: studentData.password,
          photo_url: studentData.photoUrl,
          punctuality_score: 100,
          late_count_this_month: 0,
          has_generated_qr: false
        }
      ], { onConflict: 'roll_no' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Updates existing student records
   */
  async updateStudent(rollNo: string, updates: Partial<Student>) {
    const { data, error } = await supabase
      .from('students')
      .update(updates)
      .eq('roll_no', rollNo)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Increments the late count and updates punctuality score
   */
  async incrementLateCount(rollNo: string, currentCount: number) {
    const newCount = (currentCount || 0) + 1;
    // Deduct 5 points per late arrival
    const { data, error } = await supabase
      .from('students')
      .update({ 
        late_count_this_month: newCount,
        punctuality_score: Math.max(0, 100 - (newCount * 5))
      })
      .eq('roll_no', rollNo);

    if (error) throw error;
    return data;
  }
};
