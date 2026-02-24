
import { createClient } from '@supabase/supabase-js';

// Your project-specific URL
const supabaseUrl = 'https://cbhopinfwgsnynsxloqg.supabase.co';

// Your verified Supabase Anon Key (Public)
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNiaG9waW5md2dzbnluc3hsb3FnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MTE2MzEsImV4cCI6MjA4NDk4NzYzMX0.yhaB-S_86xkHMo8BYljwGce5JlzqB7YD1YNN0nfYAoU';

/**
 * --- DATABASE MODIFICATION QUERY ---
 * Run this in your Supabase SQL Editor to match the Student Enrollment Hub:
 * 
 * ALTER TABLE students 
 * ADD COLUMN IF NOT EXISTS stream TEXT,
 * ADD COLUMN IF NOT EXISTS section TEXT,
 * ADD COLUMN IF NOT EXISTS shift TEXT,
 * ADD COLUMN IF NOT EXISTS years TEXT, -- This is 'Batch'
 * ADD COLUMN IF NOT EXISTS father_phone TEXT,
 * ADD COLUMN IF NOT EXISTS father_occupation TEXT,
 * ADD COLUMN IF NOT EXISTS mother_phone TEXT,
 * ADD COLUMN IF NOT EXISTS mother_occupation TEXT;
 * 
 * -- Update existing table for all 19 fields support:
 * -- roll_no, name, department, batch (years), section, stream, sex, 
 * -- student_phone, shift, registration_no, password, photo_url, 
 * -- father_name, father_phone, father_occupation, mother_name, mother_phone, mother_occupation
 */

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});
