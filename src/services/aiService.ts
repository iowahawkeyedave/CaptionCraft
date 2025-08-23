import { generateCaptionWithGemini } from './geminiService';

export interface ImageAnalysis {
  title: string;
  story: string;
  instagramCaption: string;
  objects: string[];
  colors: string[];
  style: string;
  mood: string;
}

export type AIProvider = 'openai' | 'lmstudio' | 'ollama' | 'gemini' | 'mock';

function sanitizeJsonString(jsonString: string): string {
  if (!jsonString) return '{}';
  
  let sanitized = jsonString.trim();
  
  // Remove code block markers if present
  sanitized = sanitized.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  
  // Fix common JSON issues
  // Remove trailing commas before closing braces/brackets
  sanitized = sanitized.replace(/,(\s*[}\]])/g, '$1');
  
  // Fix unescaped quotes in string values (but be careful not to break properly escaped ones)
  // This is a more conservative approach that only fixes obvious issues
  sanitized = sanitized.replace(/"([^"]*?)\n([^"]*?)"/g, '"$1\\n$2"'); // Fix literal newlines in strings
  sanitized = sanitized.replace(/"([^"]*?)\t([^"]*?)"/g, '"$1\\t$2"'); // Fix literal tabs in strings
  
  // Remove control characters that break JSON parsing
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  
  return sanitized;
}

interface AIConfig {
  provider: AIProvider;
  endpoint: string;
  apiKey?: string;
  geminiApiKey?: string;
  visionModel: string;
  storyModel: string;
}

function getAIConfig(): AIConfig {
  let provider: AIProvider = 'mock';
  let openaiApiKey = '';
  let geminiApiKey = '';
  let lmstudioUrl = 'http://localhost:1234';
  let lmstudioApiKey = '';
  let ollamaUrl = 'http://localhost:11434';
  let visionModel = 'gpt-4-vision-preview';
  let storyModel = 'gpt-4o';

  try {
    const savedSettings = localStorage.getItem('ai-captioning-settings');
    console.log('Raw saved settings:', savedSettings);
    
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      console.log('Parsed settings:', settings);
      
      provider = settings.provider || 'mock';
      openaiApiKey = settings.openaiApiKey || '';
      geminiApiKey = settings.geminiApiKey || '';
      lmstudioUrl = settings.lmstudioUrl || 'http://localhost:1234';
      lmstudioApiKey = settings.lmstudioApiKey || '';
      ollamaUrl = settings.ollamaUrl || 'http://localhost:11434';
      
      // Set appropriate default models based on provider
      if (settings.provider === 'gemini') {
        visionModel = settings.visionModel || 'gemini-1.5-pro';
        storyModel = settings.storyModel || 'gemini-1.5-pro';
      } else {
        visionModel = settings.visionModel || 'gpt-4-vision-preview';
        storyModel = settings.storyModel || 'gpt-4o';
      }
    } else {
      console.log('No saved settings found, using environment variables');
      provider = (process.env.REACT_APP_AI_PROVIDER as AIProvider) || 'mock';
      openaiApiKey = process.env.REACT_APP_OPENAI_API_KEY || '';
      geminiApiKey = process.env.REACT_APP_GEMINI_API_KEY || '';
      lmstudioUrl = process.env.REACT_APP_LMSTUDIO_URL || 'http://localhost:1234';
      lmstudioApiKey = process.env.REACT_APP_LMSTUDIO_API_KEY || '';
      ollamaUrl = process.env.REACT_APP_OLLAMA_URL || 'http://localhost:11434';
      
      // Set appropriate default models based on provider
      if (provider === 'gemini') {
        visionModel = process.env.REACT_APP_VISION_MODEL || 'gemini-1.5-pro';
        storyModel = process.env.REACT_APP_STORY_MODEL || 'gemini-1.5-pro';
      } else {
        visionModel = process.env.REACT_APP_VISION_MODEL || 'gpt-4-vision-preview';
        storyModel = process.env.REACT_APP_STORY_MODEL || 'gpt-4o';
      }
    }
  } catch (error) {
    console.error('Failed to parse saved settings, using environment variables:', error);
    provider = (process.env.REACT_APP_AI_PROVIDER as AIProvider) || 'mock';
    openaiApiKey = process.env.REACT_APP_OPENAI_API_KEY || '';
    geminiApiKey = process.env.REACT_APP_GEMINI_API_KEY || '';
    lmstudioUrl = process.env.REACT_APP_LMSTUDIO_URL || 'http://localhost:1234';
    lmstudioApiKey = process.env.REACT_APP_LMSTUDIO_API_KEY || '';
    ollamaUrl = process.env.REACT_APP_OLLAMA_URL || 'http://localhost:11434';
    
    // Set appropriate default models based on provider
    if (provider === 'gemini') {
      visionModel = process.env.REACT_APP_VISION_MODEL || 'gemini-1.5-pro';
      storyModel = process.env.REACT_APP_STORY_MODEL || 'gemini-1.5-pro';
    } else {
      visionModel = process.env.REACT_APP_VISION_MODEL || 'gpt-4-vision-preview';
      storyModel = process.env.REACT_APP_STORY_MODEL || 'gpt-4o';
    }
  }

  console.log('Final AI config:', { provider, lmstudioUrl, ollamaUrl, visionModel, storyModel });
  
  switch (provider) {
    case 'openai':
      return {
        provider: 'openai',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        apiKey: openaiApiKey,
        visionModel: visionModel,
        storyModel: storyModel
      };
    
    case 'gemini':
        return {
          provider: 'gemini',
          endpoint: '', // Not used for Gemini
          apiKey: geminiApiKey,
          visionModel: visionModel,
          storyModel: storyModel
        };

    case 'lmstudio':
      return {
        provider: 'lmstudio',
        endpoint: `${lmstudioUrl}/v1/chat/completions`,
        apiKey: lmstudioApiKey || undefined,
        visionModel: visionModel,
        storyModel: storyModel
      };
    
    case 'ollama':
      return {
        provider: 'ollama',
        endpoint: `${ollamaUrl}/api/generate`,
        apiKey: undefined,
        visionModel: visionModel,
        storyModel: storyModel
      };
    
    default:
      return {
        provider: 'mock',
        endpoint: '',
        visionModel: 'mock',
        storyModel: 'mock'
      };
  }
}

function getVisionAnalysisPrompt(): string {
  return `Analyze this image thoroughly and provide detailed visual information. Respond with ONLY a valid JSON object in this exact format:

{
  "description": "A detailed 2-3 sentence description of what is actually shown in the image - the main subjects, their actions, setting, composition, and any notable details",
  "objects": ["list", "of", "main", "objects", "or", "subjects", "in", "image"],
  "colors": ["dominant", "color", "names"],
  "style": "artistic style description (e.g., digital art, photography, painting, abstract)",
  "mood": "overall mood or emotion (e.g., serene, energetic, mysterious, joyful)",
  "setting": "the location, environment, or background setting",
  "details": ["notable", "specific", "visual", "elements", "or", "features"]
}

Be very specific about what you see. Include details about:
- What people/characters are doing if present
- The environment and setting
- Key visual elements and composition
- Any text, symbols, or distinctive features
- The overall scene and context

Important: Respond with ONLY the JSON object, no other text.`;
}

function getStoryGenerationPrompt(visionAnalysis: any, isNSFW: boolean = false): string {
  const nsfwInstructions = isNSFW 
    ? `\n\nNSFW/MATURE CONTENT: You may include mature themes, adult content, and sensual elements in the DeviantArt story. Keep the Instagram caption appropriate for general audiences.`
    : `\n\nKeep all content appropriate for general audiences.`;

  // Extract the main subject from objects array
  const mainSubject = Array.isArray(visionAnalysis.objects) && visionAnalysis.objects.length > 0 
    ? visionAnalysis.objects[0] 
    : 'subject';

  return `Image description:
${visionAnalysis.description || 'A scene'}

Write a story about what is described above. Use ONLY this description as the basis for your story.

Format your response as JSON:
{
  "title": "Title based on the description",
  "story": "Story based on the description above",
  "instagramCaption": "Caption based on the description"
}

${nsfwInstructions}`;
}

function getLMStudioTextRequestBody(prompt: string, model: string) {
  return {
    model,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 2000,
    temperature: 0.7
  };
}

export async function analyzeImage(imageDataUrl: string, isNSFW: boolean = false): Promise<ImageAnalysis> {
  const config = getAIConfig();
  console.log('analyzeImage called with config:', config);
  
  if (config.provider === 'mock') {
    console.info('Using mock AI analysis.');
    return generateMockAnalysis(imageDataUrl);
  }

  if (config.provider === 'openai' && !config.apiKey) {
    console.warn('OpenAI API key not found. Using mock analysis.');
    return generateMockAnalysis(imageDataUrl);
  }

  if (config.provider === 'gemini' && !config.apiKey) {
    console.warn('Gemini API key not found. Using mock analysis.');
    return generateMockAnalysis(imageDataUrl);
  }

  try {
    // Check if we should use dual-model workflow 
    // Use dual-model for LM Studio/Ollama to get better image analysis first, then story generation
    const useDualModels = (config.provider === 'lmstudio' || config.provider === 'ollama');
    
    if (useDualModels) {
      console.log('Using dual-model workflow for LM Studio');
      return await analyzeDualModel(imageDataUrl, isNSFW, config);
    } else {
      console.log('Using single-model workflow');
      return await analyzeSingleModel(imageDataUrl, isNSFW, config);
    }
  } catch (error) {
    console.error(`${config.provider} analysis failed:`, error);
    return generateMockAnalysis(imageDataUrl);
  }
}

async function analyzeSingleModel(imageDataUrl: string, isNSFW: boolean, config: AIConfig): Promise<ImageAnalysis> {
  if (config.provider === 'gemini') {
    const prompt = getGeminiPrompt(isNSFW);
    const base64Image = imageDataUrl.split(',')[1];
    // Extract mime type from data URL
    const mimeType = imageDataUrl.split(',')[0].split(':')[1].split(';')[0] || 'image/jpeg';
    const result = await generateCaptionWithGemini(
      config.apiKey!, 
      config.visionModel,
      base64Image,
      prompt,
      2000,
      0.7,
      mimeType
    );
    return parseAIResponse(result);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  let prompt: string;
  let body: any;

  switch (config.provider) {
    case 'lmstudio':
      prompt = getLMStudioPrompt(isNSFW);
      body = getLMStudioRequestBody(imageDataUrl, prompt, config.visionModel);
      break;
    case 'ollama':
      prompt = getOllamaPrompt(isNSFW);
      body = getOllamaRequestBody(imageDataUrl, prompt, config.visionModel);
      break;
    default:
      prompt = getOpenAIPrompt(isNSFW);
      body = getOpenAIRequestBody(imageDataUrl, prompt, config.visionModel);
  }

  console.log('Making request to:', config.endpoint);
  console.log('Request headers:', headers);
  console.log('Request body:', JSON.stringify(body, null, 2));

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} - ${response.statusText}`);
  }

  const data = await response.json();
  let content;
  
  if (config.provider === 'ollama') {
    content = data.response;
  } else {
    content = data.choices[0]?.message?.content;
  }
  
  if (!content) {
    throw new Error('No content in API response');
  }

  console.log(`Raw ${config.provider} AI response:`, content);
  
  try {
    const analysis = parseAIResponse(content);
    console.log('Successfully parsed AI response:', analysis);
    return analysis;
  } catch (parseError) {
    console.error(`Failed to parse ${config.provider} AI response:`, parseError);
    console.log('Raw AI response that failed to parse:', content);
    console.log('Response length:', content.length);
    console.log('Response preview (first 500 chars):', content.substring(0, 500));
    console.log('Response preview (last 500 chars):', content.substring(Math.max(0, content.length - 500)));
    return generateMockAnalysis(imageDataUrl);
  }
}

function getGeminiPrompt(isNSFW: boolean = false): string {
  const nsfwInstructions = isNSFW 
    ? `\n\nNSFW/MATURE CONTENT: You may include mature themes, adult content, and sensual elements in the DeviantArt story. Keep the Instagram caption appropriate for general audiences.`
    : `\n\nKeep all content appropriate for general audiences.`;

  return `CAREFULLY EXAMINE this image and provide a JSON response with the following structure:
{
  "title": "A compelling title for DeviantArt (max 100 chars)",
  "story": "An extremely creative and detailed story/description for DeviantArt (800-1000 words). IMPORTANT: Base your story directly on what you see in the image. Describe the actual subjects, objects, setting, lighting, composition, and visual elements present. Then expand this into an immersive narrative that brings these specific visual elements to life with rich descriptions, character development (if people/characters are visible), world-building around the actual setting shown, emotional depth, and creative storytelling. Include vivid sensory details about what you observe, dialogue if appropriate for the scene depicted, and paint a complete picture that captivates readers while staying true to the image content.",
  "instagramCaption": "An engaging Instagram caption (max 150 chars)",
  "objects": ["list", "of", "main", "objects", "or", "subjects"],
  "colors": ["dominant", "color", "palette"],
  "style": "artistic style (e.g., digital art, photography, abstract)",
  "mood": "overall mood or emotion"
}

CRITICAL: Your story MUST be based on what you actually see in the image. Don't create generic content - analyze the specific visual elements, subjects, setting, colors, lighting, and composition, then build your narrative around these observed details.

IMPORTANT: Keep hashtags SHORT and readable. Each hashtag should be 2-4 words maximum (e.g., #DigitalArt, #Photography, #ArtWork, #Creative). Avoid extremely long compound hashtags.

Make the content engaging and suitable for social media sharing.${nsfwInstructions}`;
}

async function analyzeDualModel(imageDataUrl: string, isNSFW: boolean, config: AIConfig): Promise<ImageAnalysis> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  // Step 1: Use vision model to analyze the image and extract basic information
  console.log('Step 1: Analyzing image with vision model:', config.visionModel);
  const visionPrompt = getVisionAnalysisPrompt();
  const visionBody = getLMStudioRequestBody(imageDataUrl, visionPrompt, config.visionModel);

  const visionResponse = await fetch(config.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(visionBody)
  });

  if (!visionResponse.ok) {
    throw new Error(`Vision model request failed: ${visionResponse.status} - ${visionResponse.statusText}`);
  }

  const visionData = await visionResponse.json();
  const visionContent = visionData.choices[0]?.message?.content;
  
  if (!visionContent) {
    throw new Error('No content in vision model response');
  }

  let visionAnalysis;
  try {
    console.log('Raw vision model response:', visionContent);
    
    // Try multiple JSON extraction patterns
    let jsonString = null;
    
    // Pattern 1: Complete JSON object (most common)
    const fullJsonMatch = visionContent.match(/\{[\s\S]*\}/);
    if (fullJsonMatch) {
      jsonString = fullJsonMatch[0];
    }
    
    // Pattern 2: JSON wrapped in code blocks
    const codeBlockMatch = visionContent.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      jsonString = codeBlockMatch[1];
    }
    
    // Pattern 3: Try to clean up the string and parse directly
    if (!jsonString) {
      jsonString = visionContent.trim();
    }
    
    console.log('Attempting to parse vision JSON:', jsonString);
    
    // Try parsing raw JSON first, then sanitize if needed
    try {
      visionAnalysis = JSON.parse(jsonString);
    } catch (rawError) {
      console.log('Raw JSON parse failed, trying sanitized version');
      const sanitizedJson = sanitizeJsonString(jsonString);
      console.log('Sanitized vision JSON:', sanitizedJson);
      visionAnalysis = JSON.parse(sanitizedJson);
    }
  } catch (error) {
    console.error('Failed to parse vision analysis:', error);
    console.log('Vision model raw response that failed to parse:', visionContent);
    
    // Try to extract at least the description from the raw response
    const descriptionMatch = visionContent.match(/"description"\s*:\s*"([^"]+(?:\\.[^"]*)*?)"/i);
    const extractedDescription = descriptionMatch ? descriptionMatch[1].replace(/\\"/g, '"') : 'An artistic image with creative visual elements';
    
    console.log('Extracted description from failed parse:', extractedDescription);
    
    visionAnalysis = {
      description: extractedDescription,
      objects: ['subject'],
      colors: ['colorful'],
      style: 'photography',
      mood: 'creative',
      setting: 'setting',
      details: ['visual elements']
    };
  }

  // Step 2: Use story model to generate creative content based on vision analysis
  // Use text-only request since we want the story model to rely on the vision analysis, not re-analyze the image
  console.log('Step 2: Generating story with story model (text-only):', config.storyModel);
  const storyPrompt = getStoryGenerationPrompt(visionAnalysis, isNSFW);
  const storyBody = getLMStudioTextRequestBody(storyPrompt, config.storyModel);
  
  const storyResponse = await fetch(config.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(storyBody)
  });

  if (!storyResponse.ok) {
    throw new Error(`Story model request failed: ${storyResponse.status} - ${storyResponse.statusText}`);
  }

  const storyData = await storyResponse.json();
  const storyContent = storyData.choices[0]?.message?.content;
  
  if (!storyContent) {
    throw new Error('No content in story model response');
  }

  let storyAnalysis;
  try {
    console.log('Raw story model response:', storyContent);
    
    // Try multiple JSON extraction patterns
    let jsonString = null;
    
    // Pattern 1: JSON wrapped in code blocks (most reliable)
    const codeBlockMatch = storyContent.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      jsonString = codeBlockMatch[1];
    }
    
    // Pattern 2: Complete JSON object
    if (!jsonString) {
      const fullJsonMatch = storyContent.match(/\{[\s\S]*\}/);
      if (fullJsonMatch) {
        jsonString = fullJsonMatch[0];
      }
    }
    
    // Pattern 3: Try to clean up the string and parse directly
    if (!jsonString) {
      jsonString = storyContent.trim();
    }
    
    console.log('Attempting to parse JSON:', jsonString?.substring(0, 200) + '...');
    
    // Try parsing raw JSON first
    try {
      storyAnalysis = JSON.parse(jsonString);
    } catch (firstError) {
      console.log('Raw JSON parse failed, trying sanitized version');
      // Sanitize JSON string to handle control characters
      const sanitizedJson = sanitizeJsonString(jsonString);
      console.log('Sanitized JSON (first 200 chars):', sanitizedJson?.substring(0, 200) + '...');
      storyAnalysis = JSON.parse(sanitizedJson);
    }
  } catch (error) {
    console.error('Failed to parse story analysis:', error);
    console.log('Story model raw response that failed to parse:', storyContent);
    
    // Try to extract content using regex patterns as fallback
    const titleMatch = storyContent.match(/"title"\s*:\s*"([^"\r\n]+)"/);
    const storyMatch = storyContent.match(/"story"\s*:\s*"([\s\S]*?)"\s*(?=,|\})/);
    const captionMatch = storyContent.match(/"instagramCaption"\s*:\s*"([^"\r\n]+)"/);
    
    storyAnalysis = {
      title: titleMatch ? titleMatch[1] : 'Creative Artwork',
      story: storyMatch ? storyMatch[1].replace(/\\"/g, '"') : 'A beautiful and inspiring piece of art that captures the imagination.',
      instagramCaption: captionMatch ? captionMatch[1] : 'Sharing some creative inspiration ✨'
    };
    
    console.log('Fallback story analysis:', storyAnalysis);
  }

  // Combine results from both models
  return {
    title: storyAnalysis.title || visionAnalysis.title || "Creative Artwork",
    story: storyAnalysis.story || "A captivating artistic piece that showcases creativity and vision.",
    instagramCaption: storyAnalysis.instagramCaption || "Sharing some creative inspiration ✨",
    objects: Array.isArray(visionAnalysis.objects) ? visionAnalysis.objects : ["art", "creative"],
    colors: Array.isArray(visionAnalysis.colors) ? visionAnalysis.colors : ["colorful"],
    style: visionAnalysis.style || "digital art",
    mood: visionAnalysis.mood || "inspiring"
  };
}

function getOpenAIPrompt(isNSFW: boolean = false): string {
  const nsfwInstructions = isNSFW 
    ? `\n\nNSFW/MATURE CONTENT: You may include mature themes, adult content, and sensual elements in the DeviantArt story. Keep the Instagram caption appropriate for general audiences.`
    : `\n\nKeep all content appropriate for general audiences.`;

  return `CAREFULLY EXAMINE this image and provide a JSON response with the following structure:
{
  "title": "A compelling title for DeviantArt (max 100 chars)",
  "story": "An extremely creative and detailed story/description for DeviantArt (800-1000 words). IMPORTANT: Base your story directly on what you see in the image. Describe the actual subjects, objects, setting, lighting, composition, and visual elements present. Then expand this into an immersive narrative that brings these specific visual elements to life with rich descriptions, character development (if people/characters are visible), world-building around the actual setting shown, emotional depth, and creative storytelling. Include vivid sensory details about what you observe, dialogue if appropriate for the scene depicted, and paint a complete picture that captivates readers while staying true to the image content.",
  "instagramCaption": "An engaging Instagram caption (max 150 chars)",
  "objects": ["list", "of", "main", "objects", "or", "subjects"],
  "colors": ["dominant", "color", "palette"],
  "style": "artistic style (e.g., digital art, photography, abstract)",
  "mood": "overall mood or emotion"
}

CRITICAL: Your story MUST be based on what you actually see in the image. Don't create generic content - analyze the specific visual elements, subjects, setting, colors, lighting, and composition, then build your narrative around these observed details.

IMPORTANT: Keep hashtags SHORT and readable. Each hashtag should be 2-4 words maximum (e.g., #DigitalArt, #Photography, #ArtWork, #Creative). Avoid extremely long compound hashtags.

Make the content engaging and suitable for social media sharing.${nsfwInstructions}`;
}

function getLMStudioPrompt(isNSFW: boolean = false): string {
  const nsfwInstructions = isNSFW 
    ? `\n\nNSFW/MATURE CONTENT: You may include mature themes, adult content, and sensual elements in the DeviantArt story. Keep the Instagram caption appropriate for general audiences.`
    : `\n\nKeep all content appropriate for general audiences.`;

  return `You are an expert art and social media content creator. You MUST carefully examine this image and describe EXACTLY what you see before creating any creative content.

**STEP 1: ANALYZE THE IMAGE**
Before writing anything else, look at this image and identify:
- What subjects/people are in the image and what they're doing
- The setting/location/background
- Objects, clothing, props visible
- Colors, lighting, composition
- Artistic style (photo, digital art, painting, etc.)
- Mood/atmosphere

**STEP 2: CREATE CONTENT BASED ON YOUR ANALYSIS**
Only after analyzing the image, create compelling content that directly references what you observed.

Respond with ONLY a valid JSON object in this exact format:
{
  "title": "A compelling title for DeviantArt that relates to what you see in the image (max 100 characters)",
  "story": "An extremely creative and detailed story/description for DeviantArt (800-1000 words). MANDATORY: Start by describing what you actually see in this specific image - the subjects, their appearance, actions, setting, objects, colors, lighting. Then expand this observed reality into an immersive narrative. Every detail in your story must connect back to something visible in the image. Do not invent elements not present in the image.",
  "instagramCaption": "An engaging Instagram caption that references the actual image content (max 150 characters with emojis)",
  "objects": ["list", "of", "actual", "objects", "visible", "in", "the", "image"],
  "colors": ["actual", "dominant", "colors", "you", "see"],
  "style": "the actual artistic style you observe (photography, digital art, painting, etc.)",
  "mood": "the actual mood/emotion you perceive from the image"
}

CRITICAL RULES:
1. Base everything on what you actually see in THIS specific image
2. Do not create generic or fictional content unrelated to the image
3. Your story must reference specific visual elements you observe
4. Every creative element should connect to something in the image${nsfwInstructions}

Important: Respond with ONLY the JSON object, no other text.`;
}

function getOllamaPrompt(isNSFW: boolean = false): string {
  const nsfwInstructions = isNSFW 
    ? `\n\nNSFW/MATURE CONTENT: You may include mature themes, adult content, and sensual elements in the DeviantArt story. Keep the Instagram caption appropriate for general audiences.`
    : `\n\nKeep all content appropriate for general audiences.`;

  return `You are an expert art and social media content creator. You MUST carefully examine this image and describe EXACTLY what you see before creating any creative content.

**STEP 1: ANALYZE THE IMAGE**
Before writing anything else, look at this image and identify:
- What subjects/people are in the image and what they're doing
- The setting/location/background
- Objects, clothing, props visible
- Colors, lighting, composition
- Artistic style (photo, digital art, painting, etc.)
- Mood/atmosphere

**STEP 2: CREATE CONTENT BASED ON YOUR ANALYSIS**
Only after analyzing the image, create compelling content that directly references what you observed.

Respond with ONLY a valid JSON object in this exact format:
{
  "title": "A compelling title for DeviantArt that relates to what you see in the image (max 100 characters)",
  "story": "An extremely creative and detailed story/description for DeviantArt (800-1000 words). MANDATORY: Start by describing what you actually see in this specific image - the subjects, their appearance, actions, setting, objects, colors, lighting. Then expand this observed reality into an immersive narrative. Every detail in your story must connect back to something visible in the image. Do not invent elements not present in the image.",
  "instagramCaption": "An engaging Instagram caption that references the actual image content (max 150 characters with emojis)",
  "objects": ["list", "of", "actual", "objects", "visible", "in", "the", "image"],
  "colors": ["actual", "dominant", "colors", "you", "see"],
  "style": "the actual artistic style you observe (photography, digital art, painting, etc.)",
  "mood": "the actual mood/emotion you perceive from the image"
}

CRITICAL RULES:
1. Base everything on what you actually see in THIS specific image
2. Do not create generic or fictional content unrelated to the image
3. Your story must reference specific visual elements you observe
4. Every creative element should connect to something in the image${nsfwInstructions}

Important: Respond with ONLY the JSON object, no other text.`;
}

function getOpenAIRequestBody(imageDataUrl: string, prompt: string, model: string) {
  return {
    model,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt
          },
          {
            type: 'image_url',
            image_url: {
              url: imageDataUrl
            }
          }
        ]
      }
    ],
    max_tokens: 2000
  };
}

function getLMStudioRequestBody(imageDataUrl: string, prompt: string, model: string) {
  // Try the standard OpenAI vision API format that many models support
  return {
    model,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt
          },
          {
            type: 'image_url',
            image_url: {
              url: imageDataUrl
            }
          }
        ]
      }
    ],
    max_tokens: 2000,
    temperature: 0.7
  };
}

function getOllamaRequestBody(imageDataUrl: string, prompt: string, model: string) {
  // Ollama uses its own API format with base64 images
  // Convert data URL to base64 (remove the data:image/...;base64, prefix)
  const base64Image = imageDataUrl.split(',')[1];
  
  return {
    model,
    prompt,
    images: [base64Image],
    stream: false,
    options: {
      temperature: 0.7,
      num_predict: 2000
    }
  };
}

function parseAIResponse(content: string): ImageAnalysis {
  let cleanContent = content.trim();
  
  // Try multiple JSON extraction patterns
  let jsonString = null;
  
  // Pattern 1: Complete JSON object (most common)
  const fullJsonMatch = cleanContent.match(/\{[\s\S]*\}/);
  if (fullJsonMatch) {
    jsonString = fullJsonMatch[0];
  }
  
  // Pattern 2: JSON wrapped in code blocks
  const codeBlockMatch = cleanContent.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (codeBlockMatch) {
    jsonString = codeBlockMatch[1];
  }
  
  // Pattern 3: Try to clean up the string and parse directly
  if (!jsonString) {
    jsonString = cleanContent;
  }
  
  try {
    console.log('Attempting to parse JSON:', jsonString);
    
    // Try parsing the raw JSON first (most common case)
    let analysis;
    try {
      analysis = JSON.parse(jsonString);
    } catch (firstError) {
      const errorMessage = firstError instanceof Error ? firstError.message : 'Unknown error';
      console.log('Raw JSON parse failed, trying sanitized version:', errorMessage);
      
      // Sanitize JSON string to handle control characters
      const sanitizedJson = sanitizeJsonString(jsonString);
      console.log('Sanitized JSON:', sanitizedJson);
      
      analysis = JSON.parse(sanitizedJson);
    }
    
    return {
      title: analysis.title || "Untitled Artwork",
      story: analysis.story || "A captivating artistic piece that showcases creativity and vision.",
      instagramCaption: analysis.instagramCaption || "Sharing some creative inspiration ✨",
      objects: Array.isArray(analysis.objects) ? analysis.objects : ["art", "creative"],
      colors: Array.isArray(analysis.colors) ? analysis.colors : ["colorful"],
      style: analysis.style || "digital art",
      mood: analysis.mood || "inspiring"
    };
  } catch (parseError) {
    console.error('JSON parsing failed, trying fallback extraction:', parseError);
    console.log('Raw content that failed to parse:', content);
    
    // Try to extract content using regex patterns as fallback
    const titleMatch = content.match(/"title"\s*:\s*"([^"]+(?:\\.[^"]*)*?)"/i);
    const storyMatch = content.match(/"story"\s*:\s*"([\s\S]*?)"/i);
    const captionMatch = content.match(/"instagramCaption"\s*:\s*"([^"]+(?:\\.[^"]*)*?)"/i);
    const objectsMatch = content.match(/"objects"\s*:\s*\[([^\]]+)\]/i);
    const colorsMatch = content.match(/"colors"\s*:\s*\[([^\]]+)\]/i);
    const styleMatch = content.match(/"style"\s*:\s*"([^"]+)"/i);
    const moodMatch = content.match(/"mood"\s*:\s*"([^"]+)"/i);
    
    // Helper function to clean extracted strings
    const cleanString = (str: string) => str?.replace(/\\"|\\\\/g, '"') || '';
    
    // Helper function to parse array strings
    const parseArrayString = (arrayStr: string): string[] => {
      if (!arrayStr) return [];
      return arrayStr
        .split(',')
        .map(item => item.replace(/["'\s]/g, ''))
        .filter(item => item.length > 0)
        .slice(0, 5); // Limit to 5 items
    };
    
    const fallbackAnalysis = {
      title: titleMatch ? cleanString(titleMatch[1]) : 'Creative Artwork',
      story: storyMatch ? cleanString(storyMatch[1]) : 'A beautiful and inspiring piece of art that captures the imagination.',
      instagramCaption: captionMatch ? cleanString(captionMatch[1]) : 'Sharing some creative inspiration ✨',
      objects: objectsMatch ? parseArrayString(objectsMatch[1]) : ['art', 'creative'],
      colors: colorsMatch ? parseArrayString(colorsMatch[1]) : ['colorful'],
      style: styleMatch ? cleanString(styleMatch[1]) : 'digital art',
      mood: moodMatch ? cleanString(moodMatch[1]) : 'inspiring'
    };
    
    console.log('Fallback analysis result:', fallbackAnalysis);
    return fallbackAnalysis;
  }
}

function generateMockAnalysis(imageDataUrl: string): ImageAnalysis {
  const mockTitles = [
    "Digital Dreams in Motion",
    "Captured Moments of Wonder",
    "Artistic Expression Unleashed",
    "Visual Poetry in Pixels",
    "Creative Vision Realized"
  ];

  const mockStories = [
    "[Mock Mode Active] This image presents a compelling visual narrative that would benefit from AI analysis to fully capture its essence. The composition, lighting, and subject matter work together to create a story that deserves detailed exploration. In a full analysis, we would examine the specific elements visible - the subjects, objects, colors, and artistic techniques employed - to craft a rich, immersive narrative that brings the image to life with vivid descriptions and emotional depth.",
    "[Mock Mode Active] While operating in demonstration mode, this image clearly contains visual elements that would generate a fascinating story through proper AI analysis. The interplay of visual components suggests themes and narratives that could be expanded into an engaging tale. A complete analysis would identify the specific subjects, setting, mood, and artistic style to create a compelling narrative that captures the essence of what's actually depicted.",
    "[Mock Mode Active] This visual piece holds stories waiting to be discovered through detailed AI analysis. The composition and elements present would normally be carefully examined to identify subjects, objects, lighting, colors, and artistic choices that inform a rich narrative. In full operation, the AI would craft an immersive story based on these specific observed details, creating content that truly reflects the image's actual content and artistic vision."
  ];

  const mockCaptions = [
    "Lost in the beauty of this moment ✨ What story do you see? 🎨",
    "Sometimes the perfect shot just happens 📸 Feeling grateful for these magical moments ✨",
    "Art speaks where words fall silent 🎭 Sharing some creative inspiration with you today 💫",
    "Capturing the essence of creativity in a single frame 🌟 What emotions does this evoke for you?",
    "When imagination meets reality, magic happens ✨ Hope this brightens your day! 🌈"
  ];

  const objectPools = [
    ["landscape", "nature", "trees", "sky", "mountains"],
    ["portrait", "person", "face", "expression", "emotion"],
    ["abstract", "patterns", "shapes", "geometry", "design"],
    ["urban", "architecture", "buildings", "city", "street"],
    ["art", "creative", "digital", "painting", "illustration"]
  ];

  const colorPools = [
    ["blue", "teal", "azure"],
    ["warm", "orange", "amber"],
    ["cool", "purple", "lavender"],
    ["earthy", "brown", "beige"],
    ["vibrant", "rainbow", "multicolor"]
  ];

  const styles = ["digital art", "photography", "abstract art", "illustration", "mixed media"];
  const moods = ["serene", "energetic", "mysterious", "joyful", "contemplative"];

  return {
    title: mockTitles[Math.floor(Math.random() * mockTitles.length)],
    story: mockStories[Math.floor(Math.random() * mockStories.length)],
    instagramCaption: mockCaptions[Math.floor(Math.random() * mockCaptions.length)],
    objects: objectPools[Math.floor(Math.random() * objectPools.length)],
    colors: colorPools[Math.floor(Math.random() * colorPools.length)],
    style: styles[Math.floor(Math.random() * styles.length)],
    mood: moods[Math.floor(Math.random() * moods.length)]
  };
}