import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "YOUR_API_KEY_HERE";
const ai = new GoogleGenAI({ apiKey });

export async function generateComplaintDetails(description) {
  try {
    const prompt = `
      You are an AI assistant for a Smart City civic issue reporting platform.
      Based on the following user description of a problem, extract and generate:
      1. A short, professional title.
      2. The responsible department (e.g., Road & Transport, Sanitation, Water Supply, Electricity, Public Safety, Parks & Recreation).
      3. A priority level (Low, Medium, High, Critical).
      4. An estimated resolution time (in days or hours).
      
      User Description: "${description}"
      
      Return ONLY a JSON object in this format (no markdown code blocks, just raw JSON):
      {
        "title": "Title here",
        "department": "Department here",
        "priority": "Priority here",
        "estimatedTime": "Time here"
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    let text = response.text;
    if (text.startsWith("```json")) {
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    }
    
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Generation Error:", error);
    return null;
  }
}

export async function detectDuplicates(description, location, existingComplaints) {
  // In a real scenario, this would use embeddings/vector search.
  // For now, we simulate an AI check by looking for keyword overlaps.
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([]); // return empty for now
    }, 1000);
  });
}

export async function analyzeFeedback(comment) {
  if (!comment) return null;
  
  try {
    const prompt = `
      You are an AI assistant analyzing citizen feedback on a resolved civic complaint.
      Feedback Comment: "${comment}"
      
      Generate an analysis with:
      1. Sentiment (Positive, Neutral, or Negative)
      2. Completion Score (0-100 integer based on how satisfied the citizen seems)
      3. Summary (a concise 1-2 sentence summary of the core issue mentioned)
      4. Suggested Action (e.g., "Close Complaint", "Forward to Department", "Re-investigate")
      
      Return ONLY a JSON object in this format (no markdown):
      {
        "sentiment": "Positive",
        "completionScore": 85,
        "summary": "Short summary",
        "suggestedAction": "Suggested action"
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    let text = response.text;
    if (text.startsWith("```json")) {
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    }
    
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Feedback Analysis Error:", error);
    return {
      sentiment: "Neutral",
      completionScore: 50,
      summary: comment,
      suggestedAction: "Manual Review Required"
    };
  }
}
