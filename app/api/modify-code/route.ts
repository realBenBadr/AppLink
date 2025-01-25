import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

export async function POST(request: Request) {
  try {
    const { code, prompt, model = "gemini-pro" } = await request.json();

    if (!code || !prompt) {
      return NextResponse.json(
        { error: "Code and prompt are required" },
        { status: 400 }
      );
    }

    // Get Gemini to modify the code based on the prompt
    const modelInstance = genAI.getGenerativeModel({ model });
    const result = await modelInstance.generateContent(`
      You are an expert React developer. Modify the following React code according to this request: "${prompt}"
      
      Current code:
      ${code}
      
      Please provide only the modified code without any explanations or markdown formatting.
      Ensure the code is complete and includes all necessary imports.
      The code should be a complete, working React component.
      Do not include any markdown code blocks or comments about the changes.
      Return only the modified TypeScript/React code.
    `);

    const modifiedCode = result.response.text();

    return new Response(modifiedCode, {
      headers: {
        "Content-Type": "text/plain",
      },
    });
  } catch (error) {
    console.error("Error modifying code:", error);
    return NextResponse.json(
      { error: "Failed to modify code" },
      { status: 500 }
    );
  }
} 