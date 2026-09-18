/**
 * CivicConnect Semantic & Geospatial Duplicate Detection Engine
 * Uses Gemini text embeddings (768-dim) and Haversine distance formula
 * to evaluate candidate duplicate civic complaints.
 */

const { GoogleGenAI } = require("@google/genai");

const DUPLICATE_SIMILARITY_THRESHOLD = parseFloat(process.env.DUPLICATE_SIMILARITY_THRESHOLD || "0.82");
const DUPLICATE_DISTANCE_METERS = parseFloat(process.env.DUPLICATE_DISTANCE_METERS || "100.0");
const DUPLICATE_MAX_AGE_DAYS = parseInt(process.env.DUPLICATE_MAX_AGE_DAYS || "14", 10);

/**
 * Calculates Haversine distance in meters between two GPS points.
 */
function calculateHaversineDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
    return Infinity;
  }
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates Cosine Similarity between two numeric vectors.
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Generates vector embedding for text using Google Gemini text-embedding-004.
 */
async function generateEmbedding(text, apiKey) {
  if (!text || !apiKey) return null;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.embedContent({
      model: "text-embedding-004",
      contents: text,
    });
    if (response && response.embedding && response.embedding.values) {
      return response.embedding.values;
    }
  } catch (err) {
    console.warn("Gemini embedding generation failed:", err.message);
  }
  return null;
}

/**
 * Evaluates duplicate status against existing active complaints in Firestore.
 */
async function checkDuplicateComplaint({
  description,
  location,
  department,
  embedding,
  existingComplaints = [],
  config = {}
}) {
  const simThreshold = config.duplicateSimilarityThreshold || DUPLICATE_SIMILARITY_THRESHOLD;
  const distThreshold = config.duplicateDistanceMeters || DUPLICATE_DISTANCE_METERS;
  const maxAgeDays = config.duplicateMaxAgeDays || DUPLICATE_MAX_AGE_DAYS;

  let bestMatch = null;
  let maxSimilarity = 0.0;
  let minDistance = Infinity;

  const now = Date.now();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

  for (const candidate of existingComplaints) {
    const cStatus = (candidate.status || "").toLowerCase();
    // Only check unresolved complaints
    if (cStatus === "resolved" || cStatus === "rejected") continue;

    // Check age
    if (candidate.createdAt) {
      const cTime = new Date(candidate.createdAt).getTime();
      if (now - cTime > maxAgeMs) continue;
    }

    // Check GPS proximity
    let dist = Infinity;
    const curLat = location?.latitude ?? location?.lat;
    const curLng = location?.longitude ?? location?.lng;
    const candLat = candidate.location?.latitude ?? candidate.location?.lat;
    const candLng = candidate.location?.longitude ?? candidate.location?.lng;

    if (curLat !== undefined && curLng !== undefined && candLat !== undefined && candLng !== undefined) {
      dist = calculateHaversineDistanceMeters(
        Number(curLat),
        Number(curLng),
        Number(candLat),
        Number(candLng)
      );
    }

    // Check Vector Similarity
    let sim = 0.0;
    if (embedding && candidate.embedding && Array.isArray(candidate.embedding)) {
      sim = cosineSimilarity(embedding, candidate.embedding);
    } else if (candidate.description || candidate.issueDescription) {
      // Lexical token overlap fallback if embedding is missing on candidate
      const textA = (description || "").toLowerCase().split(/\s+/);
      const textB = (candidate.description || candidate.issueDescription || "").toLowerCase().split(/\s+/);
      const setB = new Set(textB);
      const common = textA.filter((w) => w.length > 3 && setB.has(w));
      sim = common.length / Math.max(textA.length, 1);
    }

    if (sim > maxSimilarity) {
      maxSimilarity = sim;
      minDistance = dist;
      bestMatch = candidate;
    }
  }

  // Determine duplicate status
  if (bestMatch) {
    const isNearby = minDistance <= distThreshold;
    const isSemanticallySimilar = maxSimilarity >= simThreshold;
    const isSameDept = department && bestMatch.category && (department.toLowerCase() === bestMatch.category.toLowerCase());

    if (isSemanticallySimilar && isNearby) {
      return {
        isDuplicate: true,
        isPotentialDuplicate: false,
        matchedComplaintId: bestMatch.referenceId || bestMatch.complaintId || bestMatch.id,
        semanticSimilarity: Math.round(maxSimilarity * 100) / 100,
        distanceMeters: Math.round(minDistance),
        reason: `Duplicate detected: Highly similar issue (${Math.round(maxSimilarity * 100)}% similarity) reported ${Math.round(minDistance)}m away.`,
      };
    }

    if (isSemanticallySimilar || (isNearby && isSameDept && maxSimilarity >= 0.65)) {
      return {
        isDuplicate: false,
        isPotentialDuplicate: true,
        matchedComplaintId: bestMatch.referenceId || bestMatch.complaintId || bestMatch.id,
        semanticSimilarity: Math.round(maxSimilarity * 100) / 100,
        distanceMeters: minDistance !== Infinity ? Math.round(minDistance) : null,
        reason: `Potential duplicate: Moderate semantic overlap (${Math.round(maxSimilarity * 100)}%) with complaint ${bestMatch.referenceId || bestMatch.complaintId}. Supervisor verification recommended.`,
      };
    }
  }

  return {
    isDuplicate: false,
    isPotentialDuplicate: false,
    matchedComplaintId: null,
    semanticSimilarity: Math.round(maxSimilarity * 100) / 100,
    distanceMeters: minDistance !== Infinity ? Math.round(minDistance) : null,
    reason: "No duplicate complaints detected within spatial or semantic thresholds.",
  };
}

module.exports = {
  generateEmbedding,
  cosineSimilarity,
  calculateHaversineDistanceMeters,
  checkDuplicateComplaint,
  DUPLICATE_SIMILARITY_THRESHOLD,
  DUPLICATE_DISTANCE_METERS,
  DUPLICATE_MAX_AGE_DAYS,
};
