import { GoogleGenAI, Modality, Type, Chat } from "@google/genai";
import { FileConversionResult, ModelConfig } from '../types';

if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not set. Using a placeholder. API calls will fail.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || " " });

export const createChat = (modelConfig: ModelConfig): Chat => {
  // FIX: Use the `modelConfig` parameter to access `modelId`, not an undefined `model` object.
  return ai.chats.create({
    model: modelConfig.modelId,
    config: {
      ...modelConfig.config,
    },
  });
};

export const sendChatMessage = async (chat: Chat, prompt: string, images: FileConversionResult[]): Promise<string> => {
   const imageParts = images.map(image => ({
    inlineData: {
      data: image.base64,
      mimeType: image.mimeType,
    },
  }));

  // FIX: The `sendMessage` method from `@google/genai`'s Chat object expects an object with a `message` property containing the parts.
  const parts = [
      ...imageParts,
      { text: prompt }
  ];
  const response = await chat.sendMessage({ message: parts });

  return response.text;
};


export const generateVideo = async (prompt: string, image?: FileConversionResult): Promise<string> => {
  let operation = await ai.models.generateVideos({
    model: 'veo-3.0-generate-preview',
    prompt: prompt,
    ...(image && { 
      image: { 
        imageBytes: image.base64, 
        mimeType: image.mimeType 
      } 
    }),
    config: {
      numberOfVideos: 1
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) {
    throw new Error("Video generation failed or returned no link.");
  }
  
  return `${downloadLink}&key=${process.env.API_KEY}`;
};

export const editImage = async (prompt: string, images: FileConversionResult[]): Promise<FileConversionResult> => {
  const imageParts = images.map(image => ({
    inlineData: {
      data: image.base64,
      mimeType: image.mimeType,
    },
  }));
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image-preview',
    contents: {
      parts: [
        ...imageParts,
        {
          text: prompt,
        },
      ],
    },
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });

  const imagePart = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);

  if (imagePart && imagePart.inlineData) {
    return {
      base64: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType,
    };
  }

  throw new Error("Image editing failed. No image was returned.");
};


export const generatePromptFromImage = async (image: FileConversionResult, modelConfig: ModelConfig): Promise<string> => {
  const response = await ai.models.generateContent({
    model: modelConfig.modelId,
    contents: {
      parts: [
        {
          inlineData: {
            data: image.base64,
            mimeType: image.mimeType,
          },
        },
        {
          text: "Describe this image in detail to create a creative and inspiring prompt for an AI image/video generator. Focus on objects, atmosphere, style, and potential actions.",
        },
      ],
    },
    config: {
      ...modelConfig.config,
    }
  });
  return response.text;
};

export const generateDetailedPrompt = async (prompt: string, images: FileConversionResult[], modelConfig: ModelConfig): Promise<{ prompt: string; intent: 'IMAGE' | 'VIDEO' }> => {
  const imageParts = images.map(image => ({
    inlineData: {
      data: image.base64,
      mimeType: image.mimeType,
    },
  }));
  
  const systemInstruction = "You are a world-class prompt engineer for generative AI. Your task is to analyze the user's idea and any reference images, then combine them into a single, cohesive, detailed prompt suitable for an advanced AI model. Also, classify whether the prompt's intent is for an IMAGE or a VIDEO.";

  const userMessage = `User's idea: "${prompt}". Please analyze the provided images and this idea to generate the detailed prompt and classify its intent.`;
  
  const response = await ai.models.generateContent({
    model: modelConfig.modelId,
    contents: {
      parts: [
        ...imageParts,
        {
          text: userMessage,
        },
      ],
    },
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          prompt: {
            type: Type.STRING,
            description: "The detailed, generated prompt for the AI model."
          },
          intent: {
            type: Type.STRING,
            description: "The classified intent of the prompt, either 'IMAGE' or 'VIDEO'."
          }
        },
        required: ["prompt", "intent"]
      },
      ...modelConfig.config,
    }
  });
  
  try {
    const result = JSON.parse(response.text);
    if ((result.intent === 'IMAGE' || result.intent === 'VIDEO') && typeof result.prompt === 'string') {
        return result as { prompt: string; intent: 'IMAGE' | 'VIDEO' };
    } else {
        const fallbackIntent = (result.prompt || '').toLowerCase().includes('video') ? 'VIDEO' : 'IMAGE';
        return { prompt: result.prompt || "Error: Could not generate prompt.", intent: fallbackIntent };
    }
  } catch (e) {
      console.error("Failed to parse JSON response from Gemini:", response.text, e);
      throw new Error("Failed to get a valid response from the AI assistant.");
  }
};

export const regenerateDetailedPrompt = async (originalIdea: string, previousPrompt: string, images: FileConversionResult[], modelConfig: ModelConfig): Promise<{ prompt: string; intent: 'IMAGE' | 'VIDEO' }> => {
  const imageParts = images.map(image => ({
    inlineData: {
      data: image.base64,
      mimeType: image.mimeType,
    },
  }));
  
  const systemInstruction = `You are a world-class prompt engineer for generative AI. Your task is to analyze the user's idea, any reference images, and a previous prompt you generated. Then, create a creative variation of the previous prompt, ensuring it's still suitable for advanced AI models. Also, classify whether the new prompt's intent is for an IMAGE or a VIDEO.`;

  const userMessage = `User's original idea: "${originalIdea}".
The previous prompt you generated was: "${previousPrompt}".
Please generate a creative variation of that prompt. Do not just rephrase it; create a distinct alternative while keeping the core subject and style. Analyze any provided images for additional context.`;

  const response = await ai.models.generateContent({
    model: modelConfig.modelId,
    contents: {
      parts: [
        ...imageParts,
        {
          text: userMessage,
        },
      ],
    },
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          prompt: {
            type: Type.STRING,
            description: "The new, varied, detailed, generated prompt for the AI model."
          },
          intent: {
            type: Type.STRING,
            description: "The classified intent of the prompt, either 'IMAGE' or 'VIDEO'."
          }
        },
        required: ["prompt", "intent"]
      },
      ...modelConfig.config,
    }
  });
  
  try {
    const result = JSON.parse(response.text);
    if ((result.intent === 'IMAGE' || result.intent === 'VIDEO') && typeof result.prompt === 'string') {
        return result as { prompt: string; intent: 'IMAGE' | 'VIDEO' };
    } else {
        const fallbackIntent = (result.prompt || '').toLowerCase().includes('video') ? 'VIDEO' : 'IMAGE';
        return { prompt: result.prompt || "Error: Could not regenerate prompt.", intent: fallbackIntent };
    }
  } catch (e) {
      console.error("Failed to parse JSON response from Gemini:", response.text, e);
      throw new Error("Failed to get a valid response from the AI assistant.");
  }
};

export const generateImage = async (prompt: string, aspectRatio: '1:1' | '16:9' | '9:16' = '1:1'): Promise<FileConversionResult> => {
  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: prompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/png',
      aspectRatio: aspectRatio,
    },
  });

  if (!response.generatedImages || response.generatedImages.length === 0) {
    throw new Error("Image generation failed. No image was returned.");
  }
  
  const imageData = response.generatedImages[0].image;

  return {
    base64: imageData.imageBytes,
    mimeType: imageData.mimeType,
  };
};
