export interface ImageAnalysis {
  title: string;
  story: string;
  instagramCaption: string;
  objects: string[];
  colors: string[];
  style: string;
  mood: string;
}

export type AIProvider = 'openai' | 'lmstudio' | 'ollama' | 'mock';

interface AIConfig {
  provider: AIProvider;
  endpoint: string;
  apiKey?: string;
  model: string;
}

function getAIConfig(): AIConfig {
  let provider: AIProvider = 'mock';
  let openaiApiKey = '';
  let lmstudioUrl = 'http://localhost:1234';
  let lmstudioApiKey = '';
  let ollamaUrl = 'http://localhost:11434';
  let visionModel = 'gpt-4-vision-preview';

  try {
    const savedSettings = localStorage.getItem('ai-captioning-settings');
    console.log('Raw saved settings:', savedSettings);
    
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      console.log('Parsed settings:', settings);
      
      provider = settings.provider || 'mock';
      openaiApiKey = settings.openaiApiKey || '';
      lmstudioUrl = settings.lmstudioUrl || 'http://localhost:1234';
      lmstudioApiKey = settings.lmstudioApiKey || '';
      ollamaUrl = settings.ollamaUrl || 'http://localhost:11434';
      visionModel = settings.visionModel || 'gpt-4-vision-preview';
    } else {
      console.log('No saved settings found, using environment variables');
      provider = (process.env.REACT_APP_AI_PROVIDER as AIProvider) || 'mock';
      openaiApiKey = process.env.REACT_APP_OPENAI_API_KEY || '';
      lmstudioUrl = process.env.REACT_APP_LMSTUDIO_URL || 'http://localhost:1234';
      lmstudioApiKey = process.env.REACT_APP_LMSTUDIO_API_KEY || '';
      ollamaUrl = process.env.REACT_APP_OLLAMA_URL || 'http://localhost:11434';
      visionModel = process.env.REACT_APP_VISION_MODEL || 'gpt-4-vision-preview';
    }
  } catch (error) {
    console.error('Failed to parse saved settings, using environment variables:', error);
    provider = (process.env.REACT_APP_AI_PROVIDER as AIProvider) || 'mock';
    openaiApiKey = process.env.REACT_APP_OPENAI_API_KEY || '';
    lmstudioUrl = process.env.REACT_APP_LMSTUDIO_URL || 'http://localhost:1234';
    lmstudioApiKey = process.env.REACT_APP_LMSTUDIO_API_KEY || '';
    ollamaUrl = process.env.REACT_APP_OLLAMA_URL || 'http://localhost:11434';
    visionModel = process.env.REACT_APP_VISION_MODEL || 'gpt-4-vision-preview';
  }

  console.log('Final AI config:', { provider, lmstudioUrl, ollamaUrl, visionModel });
  
  switch (provider) {
    case 'openai':
      return {
        provider: 'openai',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        apiKey: openaiApiKey,
        model: visionModel
      };
    
    case 'lmstudio':
      return {
        provider: 'lmstudio',
        endpoint: `${lmstudioUrl}/v1/chat/completions`,
        apiKey: lmstudioApiKey || undefined,
        model: visionModel
      };
    
    case 'ollama':
      return {
        provider: 'ollama',
        endpoint: `${ollamaUrl}/api/generate`,
        apiKey: undefined,
        model: visionModel
      };
    
    default:
      return {
        provider: 'mock',
        endpoint: '',
        model: 'mock'
      };
  }
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

  try {
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
        body = getLMStudioRequestBody(imageDataUrl, prompt, config.model);
        break;
      case 'ollama':
        prompt = getOllamaPrompt(isNSFW);
        body = getOllamaRequestBody(imageDataUrl, prompt, config.model);
        break;
      default:
        prompt = getOpenAIPrompt(isNSFW);
        body = getOpenAIRequestBody(imageDataUrl, prompt, config.model);
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

    try {
      const analysis = parseAIResponse(content);
      return analysis;
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.log('Raw AI response:', content);
      return generateMockAnalysis(imageDataUrl);
    }
  } catch (error) {
    console.error(`${config.provider} analysis failed:`, error);
    return generateMockAnalysis(imageDataUrl);
  }
}

function getOpenAIPrompt(isNSFW: boolean = false): string {
  const nsfwInstructions = isNSFW 
    ? `\n\nNSFW/MATURE CONTENT: You may include mature themes, adult content, and sensual elements in the DeviantArt story. Keep the Instagram caption appropriate for general audiences.`
    : `\n\nKeep all content appropriate for general audiences.`;

  return `Analyze this image and provide a JSON response with the following structure:
{
  "title": "A compelling title for DeviantArt (max 100 chars)",
  "story": "A detailed story/description for DeviantArt (150-300 words)",
  "instagramCaption": "An engaging Instagram caption (max 150 chars)",
  "objects": ["list", "of", "main", "objects", "or", "subjects"],
  "colors": ["dominant", "color", "palette"],
  "style": "artistic style (e.g., digital art, photography, abstract)",
  "mood": "overall mood or emotion"
}

IMPORTANT: Keep hashtags SHORT and readable. Each hashtag should be 2-4 words maximum (e.g., #DigitalArt, #Photography, #ArtWork, #Creative). Avoid extremely long compound hashtags.

Make the content engaging and suitable for social media sharing.${nsfwInstructions}`;
}

function getLMStudioPrompt(isNSFW: boolean = false): string {
  const nsfwInstructions = isNSFW 
    ? `\n\nNSFW/MATURE CONTENT: You may include mature themes, adult content, and sensual elements in the DeviantArt story. Keep the Instagram caption appropriate for general audiences.`
    : `\n\nKeep all content appropriate for general audiences.`;

  return `You are an expert art and social media content creator. Analyze this image and create compelling content for DeviantArt and Instagram.

Respond with ONLY a valid JSON object in this exact format:
{
  "title": "A compelling title for DeviantArt (max 100 characters)",
  "story": "A detailed story/description for DeviantArt (150-300 words that tells a story about the image)",
  "instagramCaption": "An engaging Instagram caption (max 150 characters with emojis)",
  "objects": ["list", "of", "main", "objects", "or", "subjects", "in", "image"],
  "colors": ["dominant", "color", "names"],
  "style": "artistic style description",
  "mood": "overall mood or emotion"
}

CRITICAL: For hashtags, use SHORT readable hashtags only. Each hashtag should be 2-4 words maximum (like #Art, #Photography, #Digital, #Creative, #Artwork). Never create extremely long compound hashtags.${nsfwInstructions}

Important: Respond with ONLY the JSON object, no other text.`;
}

function getOllamaPrompt(isNSFW: boolean = false): string {
  const nsfwInstructions = isNSFW 
    ? `\n\nNSFW/MATURE CONTENT: You may include mature themes, adult content, and sensual elements in the DeviantArt story. Keep the Instagram caption appropriate for general audiences.`
    : `\n\nKeep all content appropriate for general audiences.`;

  return `You are an expert art and social media content creator. Analyze this image and create compelling content for DeviantArt and Instagram.

Respond with ONLY a valid JSON object in this exact format:
{
  "title": "A compelling title for DeviantArt (max 100 characters)",
  "story": "A detailed story/description for DeviantArt (150-300 words that tells a story about the image)",
  "instagramCaption": "An engaging Instagram caption (max 150 characters with emojis)",
  "objects": ["list", "of", "main", "objects", "or", "subjects", "in", "image"],
  "colors": ["dominant", "color", "names"],
  "style": "artistic style description",
  "mood": "overall mood or emotion"
}

CRITICAL: For hashtags, use SHORT readable hashtags only. Each hashtag should be 2-4 words maximum (like #Art, #Photography, #Digital, #Creative, #Artwork). Never create extremely long compound hashtags.${nsfwInstructions}

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
    max_tokens: 1000
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
    max_tokens: 1000,
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
      num_predict: 1000
    }
  };
}

function parseAIResponse(content: string): ImageAnalysis {
  let cleanContent = content.trim();
  
  const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleanContent = jsonMatch[0];
  }
  
  const analysis = JSON.parse(cleanContent);
  
  return {
    title: analysis.title || "Untitled Artwork",
    story: analysis.story || "A captivating artistic piece that showcases creativity and vision.",
    instagramCaption: analysis.instagramCaption || "Sharing some creative inspiration ✨",
    objects: Array.isArray(analysis.objects) ? analysis.objects : ["art", "creative"],
    colors: Array.isArray(analysis.colors) ? analysis.colors : ["colorful"],
    style: analysis.style || "digital art",
    mood: analysis.mood || "inspiring"
  };
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
    "This captivating piece showcases the intersection of creativity and technology. Through careful composition and thoughtful color choices, the artist has created a work that speaks to the viewer on multiple levels. The intricate details invite closer inspection, while the overall harmony creates a sense of visual satisfaction. This piece represents a moment frozen in time, capturing not just an image, but an emotion and a story waiting to be discovered by each viewer.",
    "A stunning example of digital artistry that demonstrates the power of imagination brought to life through pixels and passion. The artist's vision is evident in every element, from the careful balance of light and shadow to the deliberate placement of each component. This work invites viewers to step into a world where reality and fantasy merge, creating an experience that is both familiar and otherworldly.",
    "In this remarkable piece, the artist has masterfully woven together elements of color, form, and emotion to create something truly special. The composition draws the eye naturally through the frame, creating a visual journey that rewards careful observation. Each viewing reveals new details and nuances, making this a work that continues to engage long after the first impression."
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