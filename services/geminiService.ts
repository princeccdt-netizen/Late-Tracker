
import { GoogleGenAI, Type } from "@google/genai";
import { Student, AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const analyzeStudentLatePatterns = async (student: Student): Promise<AnalysisResult> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Analyze the following student's late tracking data and predict their punctuality behavior. 
      Student: ${student.name}
      Department: ${student.department}
      Late count this month: ${student.late_count_this_month}
      Current Score: ${student.punctuality_score}
      
      Provide a risk assessment (Low, Medium, High), a one-sentence prediction, and a behavioral recommendation for the lecturer.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskLevel: { type: Type.STRING },
            prediction: { type: Type.STRING },
            recommendation: { type: Type.STRING },
          },
          required: ["riskLevel", "prediction", "recommendation"]
        }
      }
    });

    const text = response.text || '{}';
    return JSON.parse(text);
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
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Write a direct, friendly but firm WhatsApp message to the student ${student.name} about their late arrival at college.
      Arrival Gate: ${gate}
      Time: ${new Date().toLocaleTimeString()}
      Remaining Punctuality Score: ${student.punctuality_score - 5}%
      
      Requirements:
      1. Use direct "You" language.
      2. Keep it punchy and clear.
      3. Mention the score impact.
      4. Use emojis like ⏰ and ⚠️.`,
    });

    const aiText = response.text || `Hey ${student.name}, you've been marked late at ${gate}. Your punctuality score has been updated. Don't miss the start of your lectures!`;

    return `⏰ *COLLEGE ATTENDANCE UPDATE*\n\n${aiText}\n\n_DGVC Administration_`;
  } catch (error) {
    console.error("Gemini Student Alert Error:", error);
    return `⏰ *LATE ARRIVAL LOGGED*\n\nHi *${student.name}*, you arrived late at *${gate}*. Your record has been updated. Please ensure you reach your classes on time.`;
  }
};

export const generateLecturerHighAlert = async (student: Student, lecturerName: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Write a high-priority alert message to Lecturer ${lecturerName} about their student ${student.name} who has been late more than 3 times this month.
      Student Name: ${student.name}
      Roll No: ${student.roll_no}
      Late Count: ${student.late_count_this_month + 1}
      Department: ${student.department}
      Stream: ${student.stream}
      Section: ${student.section}
      
      Requirements:
      1. Professional but urgent tone.
      2. Highlight that this is a repeat offense (4th time or more).
      3. Request the lecturer to take disciplinary action or counsel the student.
      4. Use emojis like 🚨 and ⚠️.`,
    });

    const aiText = response.text || `🚨 HIGH ALERT: Student ${student.name} (${student.roll_no}) has exceeded the late entry threshold with ${student.late_count_this_month + 1} instances this month. Please intervene.`;

    return `🚨 *HIGH PRIORITY LATE ALERT*\n\n${aiText}\n\n_DGVC Administration_`;
  } catch (error) {
    console.error("Gemini Lecturer Alert Error:", error);
    return `🚨 *HIGH PRIORITY LATE ALERT*\n\nLecturer, student *${student.name}* (${student.roll_no}) has arrived late for the *${student.late_count_this_month + 1}th* time this month. Immediate counseling/action is recommended.\n\n_DGVC Administration_`;
  }
};
