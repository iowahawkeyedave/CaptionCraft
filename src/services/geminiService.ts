
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

export async function generateCaptionWithGemini(
  apiKey: string,
  modelName: string,
  image_data: string,
  prompt: string,
  max_tokens: number,
  temperature: number,
  mimeType: string = 'image/jpeg'
) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const generationConfig = {
      temperature: temperature,
      topK: 32,
      topP: 1,
      maxOutputTokens: max_tokens,
    };

    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];

    const parts = [
      {
        inlineData: {
          mimeType: mimeType,
          data: image_data,
        },
      },
      {
        text: prompt,
      },
    ];

    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
      generationConfig,
      safetySettings,
    });

    const response = result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating caption with Gemini:", error);
    throw error;
  }
}

export async function testGeminiConnection(apiKey: string): Promise<{ connected: boolean; error?: string }> {
    if (!apiKey) {
        return { connected: false, error: "API key is missing." };
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // This is a lightweight call to check if the API key is valid
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        await model.countTokens("test");
        return { connected: true };
    } catch (error) {
        console.error("Gemini connection test failed:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return { connected: false, error: `Connection failed: ${errorMessage}` };
    }
}
