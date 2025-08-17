import fetch from "node-fetch"; // Ensure node-fetch is installed: npm i node-fetch
import { uploadBase64ToCloudinary } from "./cloudinary.config.js"; // Assuming this exists

const HF_TOKEN = process.env.HF_TOKEN; // Add to .env: HF_TOKEN=your_huggingface_token (get from huggingface.co/settings/tokens)
const IMAGE_MODEL = "runwayml/stable-diffusion-v1-5"; // Free model for text-to-image
const TEXT_MODEL = "microsoft/phi-2"; // Free model for text generation (instruct-like)

async function queryImage(prompt) {
  const response = await fetch(
    `https://api-inference.huggingface.co/models/${IMAGE_MODEL}`,
    {
      headers: { Authorization: `Bearer ${HF_TOKEN}` },
      method: "POST",
      body: JSON.stringify({ inputs: prompt }),
    }
  );

  if (!response.ok) {
    throw new Error(`Hugging Face API error: ${response.statusText}`);
  }

  const buffer = await response.buffer();
  const base64 = buffer.toString("base64");
  return `data:image/png;base64,${base64}`;
}

async function queryText(prompt) {
  const response = await fetch(
    `https://api-inference.huggingface.co/models/${TEXT_MODEL}`,
    {
      headers: { Authorization: `Bearer ${HF_TOKEN}` },
      method: "POST",
      body: JSON.stringify({ inputs: prompt }),
    }
  );

  if (!response.ok) {
    throw new Error(`Hugging Face API error: ${response.statusText}`);
  }

  const json = await response.json();
  return json[0]?.generated_text || "";
}

export const generatePatternImage = async (
  garmentType,
  style,
  fabricType,
  sizeRange,
  occasion,
  additionalDetails
) => {
  const prompt = `A detailed sewing pattern diagram for a ${style} ${garmentType} made of ${fabricType}, size ${sizeRange}, suitable for ${
    occasion || "any occasion"
  }, ${additionalDetails || ""}. Technical line drawing with measurements.`;
  const base64 = await queryImage(prompt);
  const url = await uploadBase64ToCloudinary(base64, "ai-patterns");
  return url;
};

export const generateFashionSampleImage = async (patternData, patternUrl) => {
  const {
    garmentType,
    style,
    fabricType,
    sizeRange,
    occasion,
    additionalDetails,
  } = patternData;
  const prompt = `A realistic fashion photo of a model wearing a ${style} ${garmentType} made of ${fabricType}, size ${sizeRange}, for ${
    occasion || "any occasion"
  }, ${additionalDetails || ""}. High quality, photorealistic.`;
  const base64 = await queryImage(prompt);
  const url = await uploadBase64ToCloudinary(base64, "ai-samples");
  return url;
};

export const generateInstructions = async (patternData) => {
  const {
    garmentType,
    style,
    fabricType,
    sizeRange,
    occasion,
    additionalDetails,
  } = patternData;
  const prompt = `Generate a numbered list of 7-10 step-by-step sewing instructions for creating a ${style} ${garmentType} made of ${fabricType}, size ${sizeRange}, for ${
    occasion || "any occasion"
  }, with details: ${additionalDetails || "none"}. Start with "1."`;
  const text = await queryText(prompt);
  return text
    .split("\n")
    .filter((line) => line.trim().startsWith(/\d+\./))
    .map((line) => line.trim());
};

export const generateMaterials = async (patternData) => {
  const {
    garmentType,
    style,
    fabricType,
    sizeRange,
    occasion,
    additionalDetails,
  } = patternData;
  const prompt = `Generate a bullet list of 5-8 materials needed for sewing a ${style} ${garmentType} made of ${fabricType}, size ${sizeRange}, for ${
    occasion || "any occasion"
  }, with details: ${additionalDetails || "none"}. Start with "- "`;
  const text = await queryText(prompt);
  return text
    .split("\n")
    .filter((line) => line.trim().startsWith("-"))
    .map((line) => line.trim().slice(2));
};
