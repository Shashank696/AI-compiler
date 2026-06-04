// Gemini API Client — Free alternative to Base44 LLM
import { jsonrepair } from "jsonrepair";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

/**
 * Invoke Google Gemini LLM — drop-in replacement for base44.integrations.Core.InvokeLLM
 * @param {Object} params
 * @param {string} params.prompt - The prompt text
 * @param {Object} [params.response_json_schema] - JSON schema for structured output (used as guidance)
 * @returns {Object} Parsed JSON response from Gemini
 */
export async function invokeLLM({ prompt, response_json_schema }) {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "Missing VITE_GEMINI_API_KEY. Get a free key at https://aistudio.google.com/apikey and add it to your .env.local file."
    );
  }

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
      maxOutputTokens: 8192,
    },
  };

  // If a schema is provided, add it to guide structured output
  if (response_json_schema) {
    requestBody.generationConfig.responseSchema = response_json_schema;
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData?.error?.message || `Gemini API error: ${response.status}`;
    throw new Error(errorMessage);
  }

  const data = await response.json();

  // Extract text from Gemini response
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Empty response from Gemini API");
  }

  // Helper to parse JSON with jsonrepair fallback
  const parseJsonSafe = (jsonStr) => {
    try {
      return JSON.parse(jsonStr);
    } catch (parseError) {
      try {
        const repaired = jsonrepair(jsonStr);
        return JSON.parse(repaired);
      } catch (repairError) {
        // Extract a snippet of text around the parsing failure location for easier debugging
        let snippet = "";
        const posMatch = parseError.message.match(/at position (\d+)/);
        if (posMatch) {
          const pos = parseInt(posMatch[1], 10);
          const start = Math.max(0, pos - 150);
          const end = Math.min(jsonStr.length, pos + 150);
          snippet = `\n\nSnippet around position ${pos}:\n... ${jsonStr.slice(start, pos)} 👉 ${jsonStr.slice(pos, pos + 10)} ...`;
        } else {
          snippet = `\n\nRaw end of output:\n... ${jsonStr.slice(-300)}`;
        }
        throw new Error(`${parseError.message}${snippet}\n(Total Length: ${jsonStr.length} characters)`);
      }
    }
  };

  // Parse JSON from response
  try {
    // Try direct parse first
    return parseJsonSafe(text);
  } catch (err) {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        return parseJsonSafe(jsonMatch[1].trim());
      } catch (matchErr) {
        err = matchErr;
      }
    }
    // Try to find JSON object/array in the text
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return parseJsonSafe(objectMatch[0]);
      } catch (objErr) {
        err = objErr;
      }
    }
    throw new Error(`Failed to parse JSON from Gemini response: ${err.message}. Raw output: ${text.slice(0, 300)}...`);
  }
}
