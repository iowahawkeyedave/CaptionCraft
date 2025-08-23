import React, { useState, useEffect, useCallback } from 'react';
import './Settings.css';
import { AIProvider } from '../services/aiService';
import { fetchLMStudioModels, fetchAllLMStudioModels, testLMStudioConnection, getDefaultVisionModels, LMStudioModel } from '../services/lmStudioService';
import { fetchOllamaModels, fetchAllOllamaModels, testOllamaConnection, getDefaultOllamaVisionModels, OllamaModel } from '../services/ollamaService';
import { testGeminiConnection } from '../services/geminiService';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LocalSettings {
  provider: AIProvider;
  openaiApiKey: string;
  geminiApiKey: string;
  lmstudioUrl: string;
  lmstudioApiKey: string;
  ollamaUrl: string;
  visionModel: string;
  storyModel: string;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<LocalSettings>({
    provider: 'mock',
    openaiApiKey: '',
    geminiApiKey: '',
    lmstudioUrl: 'http://localhost:1234',
    lmstudioApiKey: '',
    ollamaUrl: 'http://localhost:11434',
    visionModel: 'gpt-4-vision-preview',
    storyModel: 'gpt-4o'
  });

  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [availableModels, setAvailableModels] = useState<LMStudioModel[] | OllamaModel[]>([]);
  const [allAvailableModels, setAllAvailableModels] = useState<LMStudioModel[] | OllamaModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    const savedSettings = localStorage.getItem('ai-captioning-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Failed to parse saved settings:', error);
      }
    }
  }, []);

  const handleSettingChange = (key: keyof LocalSettings, value: string) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      
      // Auto-set appropriate model defaults when switching provider
      if (key === 'provider') {
        if (value === 'gemini') {
          // Set Gemini model defaults if current models are not Gemini models
          if (!prev.visionModel.startsWith('gemini')) {
            newSettings.visionModel = 'gemini-1.5-pro';
          }
          if (!prev.storyModel.startsWith('gemini')) {
            newSettings.storyModel = 'gemini-1.5-pro';
          }
        } else if (value === 'openai') {
          // Set OpenAI model defaults if current models are not OpenAI models
          if (!prev.visionModel.startsWith('gpt')) {
            newSettings.visionModel = 'gpt-4-vision-preview';
          }
          if (!prev.storyModel.startsWith('gpt')) {
            newSettings.storyModel = 'gpt-4o';
          }
        }
      }
      
      return newSettings;
    });
    setHasChanges(true);
    
    if (key === 'lmstudioUrl' || key === 'ollamaUrl' || key === 'geminiApiKey' || key === 'provider') {
      setConnectionStatus('unknown');
      setAvailableModels([]);
      setAllAvailableModels([]);
      setModelError(null);
      setConnectionError(null);
    }
  };

  const testConnection = useCallback(async () => {
    if (settings.provider === 'lmstudio' && !settings.lmstudioUrl) return;
    if (settings.provider === 'ollama' && !settings.ollamaUrl) return;
    if (settings.provider === 'gemini' && !settings.geminiApiKey) return;
    
    setConnectionStatus('unknown');
    setConnectionError(null);
    
    let result;
    if (settings.provider === 'lmstudio') {
      result = await testLMStudioConnection(settings.lmstudioUrl);
      if (!result.connected) {
        setConnectionError(result.error || 'Could not connect to LM Studio server');
        setAvailableModels(getDefaultVisionModels());
      }
    } else if (settings.provider === 'ollama') {
      result = await testOllamaConnection(settings.ollamaUrl);
      if (!result.connected) {
        setConnectionError(result.error || 'Could not connect to Ollama server');
        setAvailableModels(getDefaultOllamaVisionModels());
      }
    } else if (settings.provider === 'gemini') {
      result = await testGeminiConnection(settings.geminiApiKey);
      if (!result.connected) {
        setConnectionError(result.error || 'Could not connect to Gemini');
      }
    } else {
      return;
    }
    
    setConnectionStatus(result.connected ? 'connected' : 'disconnected');
    
    if (result.connected) {
      setConnectionError(null);
    }
  }, [settings.lmstudioUrl, settings.ollamaUrl, settings.geminiApiKey, settings.provider]);

  const loadAvailableModels = useCallback(async () => {
    if (settings.provider === 'gemini') return;
    if (settings.provider === 'lmstudio' && !settings.lmstudioUrl) return;
    if (settings.provider === 'ollama' && !settings.ollamaUrl) return;
    if (settings.provider !== 'lmstudio' && settings.provider !== 'ollama') return;
    
    setIsLoadingModels(true);
    setModelError(null);
    
    try {
      let visionModels, allModels;
      if (settings.provider === 'lmstudio') {
        // Load both vision models and all models
        visionModels = await fetchLMStudioModels(settings.lmstudioUrl);
        allModels = await fetchAllLMStudioModels(settings.lmstudioUrl);
        
        setAvailableModels(visionModels.length > 0 ? visionModels : getDefaultVisionModels());
        setAllAvailableModels(allModels.length > 0 ? allModels : getDefaultVisionModels());
        
        if (visionModels.length === 0) {
          setModelError('No vision models found. Make sure you have a vision model loaded in LM Studio.');
        }
      } else if (settings.provider === 'ollama') {
        // Load both vision models and all models
        visionModels = await fetchOllamaModels(settings.ollamaUrl);
        allModels = await fetchAllOllamaModels(settings.ollamaUrl);
        
        setAvailableModels(visionModels.length > 0 ? visionModels : getDefaultOllamaVisionModels());
        setAllAvailableModels(allModels.length > 0 ? allModels : getDefaultOllamaVisionModels());
        
        if (visionModels.length === 0) {
          setModelError('No vision models found. Make sure you have a vision model installed in Ollama.');
        }
      }
      
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Failed to load models:', error);
      const serverName = settings.provider === 'lmstudio' ? 'LM Studio' : 'Ollama';
      setModelError(`Failed to fetch models from ${serverName} server`);
      
      if (settings.provider === 'lmstudio') {
        setAvailableModels(getDefaultVisionModels());
        setAllAvailableModels(getDefaultVisionModels());
      } else {
        setAvailableModels(getDefaultOllamaVisionModels());
        setAllAvailableModels(getDefaultOllamaVisionModels());
      }
      setConnectionStatus('disconnected');
    } finally {
      setIsLoadingModels(false);
    }
  }, [settings.lmstudioUrl, settings.ollamaUrl, settings.provider]);

  useEffect(() => {
    if ((settings.provider === 'lmstudio' || settings.provider === 'ollama' || settings.provider === 'gemini') && isOpen) {
      testConnection();
      if (settings.provider !== 'gemini') {
        loadAvailableModels();
      }
    }
  }, [settings.provider, settings.lmstudioUrl, settings.ollamaUrl, settings.geminiApiKey, isOpen, testConnection, loadAvailableModels]);

  const handleSave = () => {
    localStorage.setItem('ai-captioning-settings', JSON.stringify(settings));
    
    Object.entries(settings).forEach(([key, value]) => {
      const envKey = getEnvKey(key);
      if (envKey) {
        (window as any).__AI_CONFIG__ = (window as any).__AI_CONFIG__ || {};
        (window as any).__AI_CONFIG__[envKey] = value;
      }
    });

    setHasChanges(false);
    alert('Settings saved! Please refresh the page for changes to take effect.');
  };

  const handleReset = () => {
    const defaultSettings: LocalSettings = {
      provider: 'mock',
      openaiApiKey: '',
      geminiApiKey: '',
      lmstudioUrl: 'http://localhost:1234',
      lmstudioApiKey: '',
      ollamaUrl: 'http://localhost:11434',
      visionModel: 'gpt-4-vision-preview',
      storyModel: 'gpt-4o'
    };
    setSettings(defaultSettings);
    setHasChanges(true);
  };

  const getEnvKey = (settingKey: string): string | null => {
    const mapping: Record<string, string> = {
      provider: 'REACT_APP_AI_PROVIDER',
      openaiApiKey: 'REACT_APP_OPENAI_API_KEY',
      geminiApiKey: 'REACT_APP_GEMINI_API_KEY',
      lmstudioUrl: 'REACT_APP_LMSTUDIO_URL',
      lmstudioApiKey: 'REACT_APP_LMSTUDIO_API_KEY',
      ollamaUrl: 'REACT_APP_OLLAMA_URL',
      visionModel: 'REACT_APP_VISION_MODEL',
      storyModel: 'REACT_APP_STORY_MODEL'
    };
    return mapping[settingKey] || null;
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <h2>AI Provider Settings</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="settings-content">
          <div className="setting-group">
            <label htmlFor="provider">AI Provider</label>
            <select
              id="provider"
              value={settings.provider}
              onChange={(e) => handleSettingChange('provider', e.target.value)}
            >
              <option value="mock">Mock (Demo Mode)</option>
              <option value="openai">OpenAI</option>
              <option value="gemini">Google Gemini</option>
              <option value="lmstudio">LM Studio (Local)</option>
              <option value="ollama">Ollama (Local)</option>
            </select>
            <small>
              {settings.provider === 'mock' && 'Uses realistic demo data for testing'}
              {settings.provider === 'openai' && 'Uses OpenAI\'s GPT-4 Vision API'}
              {settings.provider === 'gemini' && 'Uses Google\'s Gemini API'}
              {settings.provider === 'lmstudio' && 'Uses your local LM Studio server'}
              {settings.provider === 'ollama' && 'Uses your local Ollama server'}
            </small>
          </div>

          {settings.provider === 'openai' && (
            <div className="setting-group">
              <label htmlFor="openaiApiKey">OpenAI API Key</label>
              <input
                type="password"
                id="openaiApiKey"
                value={settings.openaiApiKey}
                onChange={(e) => handleSettingChange('openaiApiKey', e.target.value)}
                placeholder="sk-..."
              />
              <small>
                Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI Platform</a>
              </small>
            </div>
          )}

          {settings.provider === 'gemini' && (
            <div className="setting-group">
              <label htmlFor="geminiApiKey">Google Gemini API Key</label>
              <div className="api-key-input-group">
                <input
                  type={showGeminiKey ? 'text' : 'password'}
                  id="geminiApiKey"
                  value={settings.geminiApiKey}
                  onChange={(e) => handleSettingChange('geminiApiKey', e.target.value)}
                  placeholder="Enter your Gemini API key"
                />
                <button 
                  type="button" 
                  className="toggle-visibility-button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  title={showGeminiKey ? 'Hide key' : 'Show key'}
                >
                  {showGeminiKey ? '👁️' : '🙈'}
                </button>
              </div>
              <small>
                Get your API key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a>
                {connectionStatus === 'connected' && <span className="status-success"> • Connected</span>}
                {connectionStatus === 'disconnected' && (
                  <>
                    <span className="status-error"> • Disconnected</span>
                    {connectionError && (
                      <div className="connection-error-details">
                        <strong>Error:</strong> {connectionError}
                      </div>
                    )}
                  </>
                )}
              </small>
            </div>
          )}

          {settings.provider === 'lmstudio' && (
            <>
              <div className="setting-group">
                <label htmlFor="lmstudioUrl">LM Studio Server URL</label>
                <div className="url-input-group">
                  <input
                    type="text"
                    id="lmstudioUrl"
                    value={settings.lmstudioUrl}
                    onChange={(e) => handleSettingChange('lmstudioUrl', e.target.value)}
                    placeholder="http://localhost:1234"
                  />
                  <button 
                    type="button" 
                    className={`test-connection-button ${connectionStatus}`}
                    onClick={testConnection}
                    disabled={!settings.lmstudioUrl}
                    title="Test connection to LM Studio"
                  >
                    {connectionStatus === 'connected' && '✓'}
                    {connectionStatus === 'disconnected' && '✗'}
                    {connectionStatus === 'unknown' && '?'}
                  </button>
                </div>
                <small>
                  URL of your LM Studio local server (default: http://localhost:1234)
                  {connectionStatus === 'connected' && <span className="status-success"> • Connected</span>}
                  {connectionStatus === 'disconnected' && (
                    <>
                      <span className="status-error"> • Disconnected</span>
                      {connectionError && (
                        <div className="connection-error-details">
                          <strong>Error:</strong> {connectionError}
                        </div>
                      )}
                    </>
                  )}
                </small>
              </div>

              <div className="setting-group">
                <label htmlFor="lmstudioApiKey">LM Studio API Key (Optional)</label>
                <input
                  type="password"
                  id="lmstudioApiKey"
                  value={settings.lmstudioApiKey}
                  onChange={(e) => handleSettingChange('lmstudioApiKey', e.target.value)}
                  placeholder="Leave empty for local usage"
                />
                <small>Usually not needed for local LM Studio servers</small>
              </div>
            </>
          )}

          {settings.provider === 'ollama' && (
            <div className="setting-group">
              <label htmlFor="ollamaUrl">Ollama Server URL</label>
              <div className="url-input-group">
                <input
                  type="text"
                  id="ollamaUrl"
                  value={settings.ollamaUrl}
                  onChange={(e) => handleSettingChange('ollamaUrl', e.target.value)}
                  placeholder="http://localhost:11434"
                />
                <button 
                  type="button" 
                  className={`test-connection-button ${connectionStatus}`}
                  onClick={testConnection}
                  disabled={!settings.ollamaUrl}
                  title="Test connection to Ollama"
                >
                  {connectionStatus === 'connected' && '✓'}
                  {connectionStatus === 'disconnected' && '✗'}
                  {connectionStatus === 'unknown' && '?'}
                </button>
              </div>
              <small>
                URL of your Ollama local server (default: http://localhost:11434)
                {connectionStatus === 'connected' && <span className="status-success"> • Connected</span>}
                {connectionStatus === 'disconnected' && (
                  <>
                    <span className="status-error"> • Disconnected</span>
                    {connectionError && (
                      <div className="connection-error-details">
                        <strong>Error:</strong> {connectionError}
                      </div>
                    )}
                  </>
                )}
              </small>
            </div>
          )}

          {(settings.provider === 'openai' || settings.provider === 'gemini') && (
            <>
              <div className="setting-group">
                <label htmlFor="visionModel">Vision Model</label>
                <input
                  type="text"
                  id="visionModel"
                  value={settings.visionModel}
                  onChange={(e) => handleSettingChange('visionModel', e.target.value)}
                  placeholder={settings.provider === 'gemini' ? 'gemini-1.5-pro' : 'gpt-4-vision-preview'}
                />
                <small>Model for image analysis (e.g., {settings.provider === 'gemini' ? 'gemini-1.5-pro, gemini-1.5-flash' : 'gpt-4-vision-preview, gpt-4o'})</small>
              </div>

              <div className="setting-group">
                <label htmlFor="storyModel">Story Model</label>
                <input
                  type="text"
                  id="storyModel"
                  value={settings.storyModel}
                  onChange={(e) => handleSettingChange('storyModel', e.target.value)}
                  placeholder={settings.provider === 'gemini' ? 'gemini-1.5-pro' : 'gpt-4o'}
                />
                <small>Text model for creative story generation (e.g., {settings.provider === 'gemini' ? 'gemini-1.5-pro, gemini-1.5-flash' : 'gpt-4o, gpt-4-turbo, gpt-3.5-turbo'})</small>
              </div>
            </>
          )}

          {(settings.provider === 'lmstudio' || settings.provider === 'ollama') && (
            <>
              <div className="setting-group">
                <label htmlFor="visionModel">Vision Model</label>
                {availableModels.length > 0 ? (
                  <div className="model-selection-group">
                    <select
                      id="visionModel"
                      value={settings.visionModel}
                      onChange={(e) => handleSettingChange('visionModel', e.target.value)}
                      disabled={isLoadingModels}
                    >
                      {availableModels.map((model) => (
                        <option key={'id' in model ? model.id : model.name} value={'id' in model ? model.id : model.name}>
                          {'id' in model ? model.id : model.name}
                        </option>
                      ))}
                    </select>
                    <button 
                      type="button" 
                      className="refresh-models-button"
                      onClick={loadAvailableModels}
                      disabled={isLoadingModels || (settings.provider === 'lmstudio' && !settings.lmstudioUrl) || (settings.provider === 'ollama' && !settings.ollamaUrl)}
                      title="Refresh available models"
                    >
                      {isLoadingModels ? '⟳' : '🔄'}
                    </button>
                  </div>
                ) : (
                  <div className="model-input-group">
                    <input
                      type="text"
                      id="visionModel"
                      value={settings.visionModel}
                      onChange={(e) => handleSettingChange('visionModel', e.target.value)}
                      placeholder={settings.provider === 'lmstudio' ? 'google/gemma-3-4b' : 'llava:latest'}
                    />
                    <button 
                      type="button" 
                      className="refresh-models-button"
                      onClick={loadAvailableModels}
                      disabled={isLoadingModels || (settings.provider === 'lmstudio' && !settings.lmstudioUrl) || (settings.provider === 'ollama' && !settings.ollamaUrl)}
                      title="Try to detect models automatically"
                    >
                      {isLoadingModels ? '⟳' : '🔍'}
                    </button>
                  </div>
                )}
                <small>
                  {isLoadingModels && 'Loading available vision models...'}
                  {!isLoadingModels && !modelError && connectionStatus === 'connected' && availableModels.length > 0 && 
                    `Found ${availableModels.length} vision model${availableModels.length !== 1 ? 's' : ''}`}
                  {modelError && <span className="status-error">{modelError}</span>}
                  {!modelError && !isLoadingModels && availableModels.length === 0 && connectionStatus === 'connected' && 
                    'No vision models detected - you can manually enter the model name above'}
                  {!modelError && !isLoadingModels && availableModels.length === 0 && connectionStatus === 'disconnected' && 
                    `Connection failed - check ${settings.provider === 'lmstudio' ? 'CORS settings' : 'CORS flag'} or manually enter model name`}
                </small>
              </div>

              <div className="setting-group">
                <label htmlFor="storyModel">Story Model</label>
                {allAvailableModels.length > 0 ? (
                  <div className="model-selection-group">
                    <select
                      id="storyModel"
                      value={settings.storyModel}
                      onChange={(e) => handleSettingChange('storyModel', e.target.value)}
                      disabled={isLoadingModels}
                    >
                      {allAvailableModels.map((model) => (
                        <option key={'id' in model ? model.id : model.name} value={'id' in model ? model.id : model.name}>
                          {'id' in model ? model.id : model.name}
                        </option>
                      ))}
                    </select>
                    <button 
                      type="button" 
                      className="refresh-models-button"
                      onClick={loadAvailableModels}
                      disabled={isLoadingModels || (settings.provider === 'lmstudio' && !settings.lmstudioUrl) || (settings.provider === 'ollama' && !settings.ollamaUrl)}
                      title="Refresh available models"
                    >
                      {isLoadingModels ? '⟳' : '🔄'}
                    </button>
                  </div>
                ) : (
                  <div className="model-input-group">
                    <input
                      type="text"
                      id="storyModel"
                      value={settings.storyModel}
                      onChange={(e) => handleSettingChange('storyModel', e.target.value)}
                      placeholder={settings.provider === 'lmstudio' ? 'llama-3.1-8b' : 'llama3.1:latest'}
                    />
                    <button 
                      type="button" 
                      className="refresh-models-button"
                      onClick={loadAvailableModels}
                      disabled={isLoadingModels || (settings.provider === 'lmstudio' && !settings.lmstudioUrl) || (settings.provider === 'ollama' && !settings.ollamaUrl)}
                      title="Try to detect models automatically"
                    >
                      {isLoadingModels ? '⟳' : '🔍'}
                    </button>
                  </div>
                )}
                <small>
                  {isLoadingModels && 'Loading available models...'}
                  {!isLoadingModels && !modelError && connectionStatus === 'connected' && allAvailableModels.length > 0 && 
                    `Found ${allAvailableModels.length} model${allAvailableModels.length !== 1 ? 's' : ''}`}
                  {!modelError && !isLoadingModels && allAvailableModels.length === 0 && connectionStatus === 'connected' && 
                    'No models detected - you can manually enter the model name above'}
                  {!modelError && !isLoadingModels && allAvailableModels.length === 0 && connectionStatus === 'disconnected' && 
                    `Connection failed - check ${settings.provider === 'lmstudio' ? 'CORS settings' : 'CORS flag'} or manually enter model name`}
                </small>
              </div>
            </>
          )}

          <div className="setup-guide">
            <h3>Setup Guide</h3>
            {settings.provider === 'gemini' && (
              <div className="guide-content">
                <h4>Google Gemini Setup:</h4>
                <ol>
                  <li>Go to <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a></li>
                  <li>Create a new API key</li>
                  <li>Enter your API key above and save settings</li>
                </ol>
                <p><strong>Note:</strong> Gemini API usage may be subject to charges.</p>
              </div>
            )}
            {settings.provider === 'lmstudio' && (
              <div className="guide-content">
                <h4>LM Studio Setup:</h4>
                <ol>
                  <li>Download and install <a href="https://lmstudio.ai/" target="_blank" rel="noopener noreferrer">LM Studio</a></li>
                  <li>Download a vision model (recommended: llava-v1.6-vicuna-7b, google/gemma-3-4b, or qwen2-vl)</li>
                  <li>Load the model in LM Studio</li>
                  <li>Start the local server:
                    <ul>
                      <li>Go to "Local Server" tab</li>
                      <li><strong>Enable CORS:</strong> Check "Allow CORS" in server settings</li>
                      <li>Click "Start Server" (usually port 1234)</li>
                    </ul>
                  </li>
                  <li>Set the server URL above and save settings</li>
                </ol>
                <p><strong>CORS Issue?</strong> If connection fails, ensure "Allow CORS" is enabled in LM Studio's server settings. This allows browser requests from this web app.</p>
                <p><strong>Alternative:</strong> You can also manually set the model name to one of your loaded models if auto-detection fails.</p>
              </div>
            )}
            {settings.provider === 'ollama' && (
              <div className="guide-content">
                <h4>Ollama Setup:</h4>
                <ol>
                  <li>Download and install <a href="https://ollama.ai/" target="_blank" rel="noopener noreferrer">Ollama</a></li>
                  <li>Install a vision model (recommended options):
                    <ul>
                      <li><code>ollama pull llava:latest</code> (most popular)</li>
                      <li><code>ollama pull gemma3:4b</code> (fast, efficient)</li>
                      <li><code>ollama pull gemma3:12b</code> (higher quality)</li>
                      <li><code>ollama pull bakllava:latest</code> (good for detailed analysis)</li>
                      <li><code>ollama pull moondream:latest</code> (smallest, fastest)</li>
                    </ul>
                  </li>
                  <li>Start Ollama with CORS enabled:
                    <ul>
                      <li><strong>Windows:</strong> Set environment variable <code>OLLAMA_ORIGINS=*</code> and restart Ollama</li>
                      <li><strong>Mac/Linux:</strong> Run <code>OLLAMA_ORIGINS=* ollama serve</code></li>
                    </ul>
                  </li>
                  <li>Set the server URL above (default: http://localhost:11434) and save settings</li>
                </ol>
                <p><strong>CORS Issue?</strong> If connection fails, ensure CORS is enabled with the OLLAMA_ORIGINS environment variable. This allows browser requests from this web app.</p>
                <p><strong>Alternative:</strong> You can also manually set the model name to one of your installed models if auto-detection fails.</p>
              </div>
            )}
            {settings.provider === 'openai' && (
              <div className="guide-content">
                <h4>OpenAI Setup:</h4>
                <ol>
                  <li>Create an account at <a href="https://platform.openai.com/" target="_blank" rel="noopener noreferrer">OpenAI Platform</a></li>
                  <li>Add billing information to your account</li>
                  <li>Generate an API key from the API keys page</li>
                  <li>Enter your API key above and save settings</li>
                </ol>
                <p><strong>Note:</strong> OpenAI vision API usage will be charged to your account.</p>
              </div>
            )}
          </div>
        </div>

        <div className="settings-footer">
          <button className="reset-button" onClick={handleReset}>
            Reset to Defaults
          </button>
          <div className="action-buttons">
            <button className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button 
              className={`save-button ${hasChanges ? 'has-changes' : ''}`}
              onClick={handleSave}
              disabled={!hasChanges}
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;