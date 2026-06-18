import { AnalysisRequest, AnalysisResponse, SearchSuggestion } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function analyzeStock(payload: AnalysisRequest): Promise<AnalysisResponse> {
  const response = await fetch(`${API_URL}/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Analysis request failed.");
  }

  return response.json();
}

export async function searchCompanies(q: string): Promise<SearchSuggestion[]> {
  const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(q)}`);
  if (!response.ok) return [];
  return response.json();
}
