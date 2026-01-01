
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export interface ParsedOrder {
  customer_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  order_number: string;
  delivery_date: string;
  notes: string;
}

// Convert File to Base64 helper
export async function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string } }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}


const SYSTEM_PROMPT = `
You are an AI assistant for a delivery logistics app.
Your task is to extract delivery order details from the provided input (text or image).
The input might be a chat message, an email, a screenshot of a list, or a spreadsheet row.

Extract the orders and return them as a JSON OBJECT with a key "orders" containing an ARRAY of objects.
Example: { "orders": [ { ... }, { ... } ] }

Fields to extract for each order:
- customer_name (string): Name of the recipient.
- address (string): Full street address.
- city (string)
- state (string)
- zip_code (string)
- phone (string)
- order_number (string)
- delivery_date (string): YYYY-MM-DD.
- notes (string)

If a field is missing, use "".
RETURN ONLY THE RAW JSON.
`;

export async function parseOrderAI(input: string | File | File[]): Promise<ParsedOrder[] | null> {
  if (!apiKey) {
    console.error("Gemini API Key is missing");
    throw new Error("API Key missing");
  }

  // Using gemini-2.5-pro (Latest 2025 SOTA Model)
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

  try {
    let result;
    const prompt = `${SYSTEM_PROMPT}\nCurrent Date: ${new Date().toISOString().split('T')[0]}`;

    if (typeof input === 'string') {
      result = await model.generateContent([prompt, `Input Text:\n"${input}"`]);
    } else if (Array.isArray(input)) {
      // Handle multiple files
      const imageParts = await Promise.all(input.map(file => fileToGenerativePart(file)));
      result = await model.generateContent([prompt, ...imageParts]);
    } else {
      // Handle single file
      const imagePart = await fileToGenerativePart(input);
      result = await model.generateContent([prompt, imagePart]);
    }

    const response = await result.response;
    const textResponse = response.text();

    console.log("Gemini Raw Response:", textResponse);

    const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    // Ensure we always return an array
    if (parsed.orders && Array.isArray(parsed.orders)) {
      return parsed.orders;
    } else if (Array.isArray(parsed)) {
      return parsed;
    } else {
      return [parsed] as ParsedOrder[];
    }

  } catch (error) {
    console.error("Gemini AI Error:", error);
    return null;
  }
}
