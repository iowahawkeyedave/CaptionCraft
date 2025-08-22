export interface OllamaModel {
  name: string;
  model: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families?: string[];
    parameter_size: string;
    quantization_level: string;
  };
  modified_at: string;
}

export interface OllamaModelsResponse {
  models: OllamaModel[];
}

export async function fetchOllamaModels(serverUrl: string): Promise<OllamaModel[]> {
  try {
    const cleanUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
    const response = await fetch(`${cleanUrl}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
    }

    const data: OllamaModelsResponse = await response.json();
    
    if (!data.models || !Array.isArray(data.models)) {
      throw new Error('Invalid response format from Ollama');
    }

    // Filter for vision models - be more specific about which models actually support vision
    const visionModels = data.models.filter(model => {
      const modelName = model.name.toLowerCase();
      return modelName.includes('llava') || 
             modelName.includes('vision') || 
             modelName.includes('multimodal') ||
             modelName.includes('bakllava') ||
             modelName.includes('moondream') ||
             modelName.includes('pixtral') ||
             modelName.includes('qwen2-vl') ||
             modelName.includes('internvl') ||
             modelName.includes('cogvlm') ||
             // Only include specific Gemma models that have vision capabilities
             (modelName.includes('gemma') && (modelName.includes('paligemma') || modelName.includes('vision')));
    });

    console.log('All available Ollama models:', data.models.map(m => m.name));
    console.log('Vision models found:', visionModels.map(m => m.name));
    
    return visionModels;
  } catch (error) {
    console.error('Error fetching Ollama models:', error);
    throw error;
  }
}

export async function testOllamaConnection(serverUrl: string): Promise<{ connected: boolean; error?: string }> {
  try {
    const cleanUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
    console.log(`Testing connection to: ${cleanUrl}/api/tags`);
    
    const response = await fetch(`${cleanUrl}/api/tags`, {
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
        error: 'CORS policy error - Ollama needs CORS enabled for browser access. Run with --cors flag.' 
      };
    }
    
    if (errorMessage.toLowerCase().includes('cors')) {
      return { 
        connected: false, 
        error: 'CORS policy blocks browser requests to Ollama. Run Ollama with CORS enabled.' 
      };
    }
    
    if (errorMessage.toLowerCase().includes('network')) {
      return { 
        connected: false, 
        error: 'Network error - ensure Ollama server is running on the specified URL' 
      };
    }
    
    return { 
      connected: false, 
      error: `Connection failed: ${errorMessage}` 
    };
  }
}

export function getDefaultOllamaVisionModels(): OllamaModel[] {
  return [
    { 
      name: 'llava:latest', 
      model: 'llava:latest',
      size: 0,
      digest: '',
      details: { format: '', family: 'llava', parameter_size: '7B', quantization_level: 'Q4_0' },
      modified_at: ''
    },
    { 
      name: 'llava:7b', 
      model: 'llava:7b',
      size: 0,
      digest: '',
      details: { format: '', family: 'llava', parameter_size: '7B', quantization_level: 'Q4_0' },
      modified_at: ''
    },
    { 
      name: 'llava:13b', 
      model: 'llava:13b',
      size: 0,
      digest: '',
      details: { format: '', family: 'llava', parameter_size: '13B', quantization_level: 'Q4_0' },
      modified_at: ''
    },
    { 
      name: 'llava-llama3:latest', 
      model: 'llava-llama3:latest',
      size: 0,
      digest: '',
      details: { format: '', family: 'llava', parameter_size: '8B', quantization_level: 'Q4_0' },
      modified_at: ''
    },
    { 
      name: 'bakllava:latest', 
      model: 'bakllava:latest',
      size: 0,
      digest: '',
      details: { format: '', family: 'bakllava', parameter_size: '7B', quantization_level: 'Q4_0' },
      modified_at: ''
    },
    { 
      name: 'moondream:latest', 
      model: 'moondream:latest',
      size: 0,
      digest: '',
      details: { format: '', family: 'moondream', parameter_size: '1.8B', quantization_level: 'Q4_0' },
      modified_at: ''
    },
  ];
}