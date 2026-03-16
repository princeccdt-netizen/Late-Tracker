
import { Student, AnalysisResult } from "../types";

export const analyzeStudentLatePatterns = async (student: Student): Promise<AnalysisResult> => {
  try {
    const response = await fetch('/api/gemini/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student })
    });

    if (!response.ok) throw new Error('API request failed');
    return await response.json();
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      riskLevel: 'Medium',
      prediction: "Unable to run AI analysis at this moment.",
      recommendation: "Monitor manually and check past attendance records."
    };
  }
};

export const generateParentAlert = async (student: Student, gate: string): Promise<string> => {
  try {
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }).toLowerCase();
    const pronoun = student.sex?.toLowerCase() === 'female' ? 'her' : 'his';
    return `⏰ *COLLEGE ATTENDANCE UPDATE*\n\nDear parents, your ward, *${student.name}*, today came to the class at *${currentTime}*. This late arrival has impacted ${pronoun} attendance percentage.\n\n⚠️ Please ensure that, your ward arrive on time ⏰\n\n_DGVC Administration_`;
  } catch (error) {
    console.error("Parent Alert Error:", error);
    return `⏰ *COLLEGE ATTENDANCE UPDATE*\n\nDear parents, your ward, *${student.name}*, has arrived late. Please ensure they arrive on time.\n\n_DGVC Administration_`;
  }
};

export const generateStudentAlert = async (student: Student, gate: string): Promise<string> => {
  try {
    const response = await fetch('/api/gemini/student-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student, gate })
    });

    if (!response.ok) throw new Error('API request failed');
    const data = await response.json();
    const aiText = data.text || `Hey ${student.name}, you've been marked late at ${gate}. Your punctuality score has been updated. Don't miss the start of your lectures!`;

    return `⏰ *COLLEGE ATTENDANCE UPDATE*\n\n${aiText}\n\n_DGVC Administration_`;
  } catch (error) {
    console.error("Gemini Student Alert Error:", error);
    return `⏰ *LATE ARRIVAL LOGGED*\n\nHi *${student.name}*, you arrived late at *${gate}*. Your record has been updated. Please ensure you reach your classes on time.`;
  }
};

export const generateLecturerHighAlert = async (student: Student, lecturerName: string): Promise<string> => {
  try {
    const response = await fetch('/api/gemini/lecturer-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student, lecturerName })
    });

    if (!response.ok) throw new Error('API request failed');
    const data = await response.json();
    const aiText = data.text || `🚨 HIGH ALERT: Student ${student.name} (${student.roll_no}) has exceeded the late entry threshold with ${student.late_count_this_month + 1} instances this month. Please intervene.`;

    return `🚨 *HIGH PRIORITY LATE ALERT*\n\n${aiText}\n\n_DGVC Administration_`;
  } catch (error) {
    console.error("Gemini Lecturer Alert Error:", error);
    return `🚨 *HIGH PRIORITY LATE ALERT*\n\nLecturer, student *${student.name}* (${student.roll_no}) has arrived late for the *${student.late_count_this_month + 1}th* time this month. Immediate counseling/action is recommended.\n\n_DGVC Administration_`;
  }
};
