import OpenAI from 'openai';
import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';
import { logger } from './logger';

const apiKey = process.env.OPENAI_API_KEY;
const baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

// Use gpt-4o for both high-quality text and multimodal work by default
const defaultTextModel = process.env.OPENAI_TEXT_MODEL || 'gpt-4o';
const defaultVisionModel = process.env.OPENAI_VISION_MODEL || 'gpt-4o';

const visionCapableModels = [
  'gpt-4o',
  'gpt-4o-mini-vision',
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4.1-turbo',
  'gpt-4.1-nano',
  'gpt-4-vision-preview',
  'gpt-4.1-preview'
];

const isVisionModel = (model: string) => {
  const normalized = model.toLowerCase();
  return visionCapableModels.some((candidate) => normalized.startsWith(candidate));
};

let client: OpenAI | null = null;

export const getOpenAIClient = () => {
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  if (!client) {
    client = new OpenAI({ apiKey, baseURL });
  }

  return client;
};

export interface SummaryRequest {
  prompt: string;
  imageUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export const generateSummary = async ({
  prompt,
  imageUrl,
  model,
  temperature = 0.3,
  maxTokens = 500
}: SummaryRequest) => {
  const openai = getOpenAIClient();

  try {
    // Auto-select appropriate model based on whether we have an image
    // If no model specified, use vision model for images, text model otherwise
    const baseModel = model || (imageUrl ? defaultVisionModel : defaultTextModel);
    const selectedModel =
      imageUrl && !isVisionModel(baseModel)
        ? (() => {
            logger.warn(
              `Model "${baseModel}" is not vision-capable. Falling back to "${defaultVisionModel}" for image analysis.`
            );
            return defaultVisionModel;
          })()
        : baseModel;

    // Build message content based on whether we have an image
    const content: string | ChatCompletionContentPart[] = imageUrl
      ? [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
              detail: 'high' // Use high detail for better audiogram analysis
            }
          }
        ]
      : prompt;

    logger.info(`Generating summary with model: ${selectedModel}${imageUrl ? ' (with vision)' : ' (text-only)'}`);

    const response = await openai.chat.completions.create({
      model: selectedModel,
      messages: [
        {
          role: 'system',
          content: 'You are an experienced clinical audiologist with expertise in interpreting audiograms. Provide clear, accurate, and empathetic analysis suitable for patients.'
        },
        { role: 'user', content }
      ],
      temperature,
      max_tokens: maxTokens
    });

    const text = response.choices[0]?.message?.content;

    if (!text) {
      throw new Error('OpenAI response did not include text content');
    }

    logger.info('Summary generated successfully');
    return text.trim();
  } catch (error) {
    logger.error('Failed to generate summary with OpenAI', error as Error);

    // Provide more helpful error messages
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('OpenAI API key is invalid or not configured properly');
      } else if (error.message.includes('rate limit')) {
        throw new Error('OpenAI rate limit exceeded. Please try again in a moment.');
      } else if (error.message.includes('model')) {
        throw new Error(`Invalid model specified. Vision analysis requires gpt-4o, gpt-4-turbo, or gpt-4-vision-preview`);
      }
    }

    throw error;
  }
};
