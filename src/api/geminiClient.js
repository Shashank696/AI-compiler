// Gemini API Client — Free alternative to Base44 LLM
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

  // Parse JSON from response
  try {
    // Try direct parse first
    return JSON.parse(text);
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }
    // Try to find JSON object/array in the text
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]);
    }
    throw new Error("Failed to parse JSON from Gemini response: " + text.slice(0, 200));
  }
}
