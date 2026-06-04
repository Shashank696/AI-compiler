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

  let attempts = 0;
  const maxAttempts = 5;
  let delay = 2000; // Start with a 2-second delay

  while (attempts < maxAttempts) {
    attempts++;
    try {
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
        
        // If rate limit (429) or temporary overload (503), retry with delay
        if ((response.status === 429 || response.status === 503) && attempts < maxAttempts) {
          console.warn(`Gemini API returned transient status ${response.status}. Retrying in ${delay}ms... (Attempt ${attempts} of ${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
          continue;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("Empty response from Gemini API");
      }

      // Parse JSON from response
      try {
        return parseJsonSafe(text);
      } catch (err) {
        const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
        if (jsonMatch) {
          try {
            return parseJsonSafe(jsonMatch[1].trim());
          } catch (matchErr) {
            err = matchErr;
          }
        }
        const objectMatch = text.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          try {
            return parseJsonSafe(objectMatch[0]);
          } catch (objErr) {
            err = objErr;
          }
        }
        throw err;
      }

    } catch (err) {
      const isTransient = err.message.includes("429") || 
                          err.message.includes("503") || 
                          err.message.includes("high demand") || 
                          err.message.includes("overloaded") ||
                          err.message.includes("rate limit") ||
                          err.message.includes("Failed to fetch");

      if (isTransient && attempts < maxAttempts) {
        console.warn(`Transient error in invokeLLM: ${err.message}. Retrying in ${delay}ms... (Attempt ${attempts} of ${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }
      throw err;
    }
  }
}
