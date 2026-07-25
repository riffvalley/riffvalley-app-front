import axios from "axios";

export interface LanguageToolReplacement {
  value: string;
}

export interface LanguageToolMatch {
  message: string;
  shortMessage: string;
  offset: number;
  length: number;
  replacements: LanguageToolReplacement[];
  rule: { id: string; description: string };
}

interface LanguageToolCheckResponse {
  matches: LanguageToolMatch[];
}

export async function checkSpelling(text: string, language = "es"): Promise<LanguageToolMatch[]> {
  const response = await axios.post<LanguageToolCheckResponse>(
    "https://api.languagetool.org/v2/check",
    new URLSearchParams({ text, language }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  return response.data.matches || [];
}
