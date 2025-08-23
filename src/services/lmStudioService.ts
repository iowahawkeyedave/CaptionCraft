export interface LMStudioModel {
  id: string;
  object: string;
  created?: number;
  owned_by?: string;
}

export interface LMStudioModelsResponse {
  object: string;
  data: LMStudioModel[];
}

export async function fetchAllLMStudioModels(serverUrl: string): Promise<LMStudioModel[]> {
  try {
    const cleanUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
    const response = await fetch(`${cleanUrl}/v1/models`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
    }

    const data: LMStudioModelsResponse = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid response format from LM Studio');
    }

    console.log('All available models:', data.data.map(m => m.id));
    
    return data.data;
  } catch (error) {
    console.error('Error fetching LM Studio models:', error);
    throw error;
  }
}

export async function fetchLMStudioModels(serverUrl: string): Promise<LMStudioModel[]> {
  try {
    const allModels = await fetchAllLMStudioModels(serverUrl);

    const visionModels = allModels.filter(model => {
      const modelName = model.id.toLowerCase();
      return modelName.includes('llava') || 
             modelName.includes('vision') || 
             modelName.includes('multimodal') ||
             modelName.includes('bakllava') ||
             modelName.includes('moondream') ||
             modelName.includes('gemma') ||
             modelName.includes('pixtral') ||
             modelName.includes('qwen2-vl') ||
             modelName.includes('internvl') ||
             modelName.includes('cogvlm');
    });

    console.log('Vision models found:', visionModels.map(m => m.id));
    
    return visionModels;
  } catch (error) {
    console.error('Error fetching LM Studio models:', error);
    throw error;
  }
}

export async function testLMStudioConnection(serverUrl: string): Promise<{ connected: boolean; error?: string }> {
  try {
    const cleanUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
    console.log(`Testing connection to: ${cleanUrl}/v1/models`);
    
    // Try with different fetch configurations
    const response = await fetch(`${cleanUrl}/v1/models`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      mode: 'cors',
      credentials: 'omit',
    });
    
    console.log(`Response status: ${response.status}, OK: ${response.ok}`);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('Response data:', data);
      return { connected: true };
    } else {
      return { 
        connected: false, 
        error: `Server returned ${response.status}: ${response.statusText}` 
      };
    }
  } catch (error) {
    console.error('Connection test failed:', error);
    console.error('Error type:', typeof error);
    console.error('Error constructor:', error?.constructor?.name);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error message:', errorMessage);
    
    // More specific CORS detection
    if (error instanceof TypeError && errorMessage.includes('Failed to fetch')) {
      return { 
        connected: false, 
        error: 'CORS policy error - LM Studio needs CORS enabled for browser access. Check console for details.' 
      };
    }
    
    if (errorMessage.toLowerCase().includes('cors')) {
      return { 
        connected: false, 
        error: 'CORS policy blocks browser requests to LM Studio' 
      };
    }
    
    if (errorMessage.toLowerCase().includes('network')) {
      return { 
        connected: false, 
        error: 'Network error - ensure LM Studio server is running on the specified URL' 
      };
    }
    
    return { 
      connected: false, 
      error: `Connection failed: ${errorMessage}` 
    };
  }
}

export function getDefaultVisionModels(): LMStudioModel[] {
  return [
    { id: 'llava-v1.6-vicuna-7b', object: 'model' },
    { id: 'llava-v1.6-mistral-7b', object: 'model' },
    { id: 'llava-v1.6-34b', object: 'model' },
    { id: 'bakllava-1', object: 'model' },
    { id: 'moondream2', object: 'model' },
    { id: 'google/gemma-2b-it', object: 'model' },
    { id: 'google/gemma-7b-it', object: 'model' },
    { id: 'qwen2-vl-7b-instruct', object: 'model' },
    { id: 'pixtral-12b', object: 'model' },
  ];
}