import React, { useState, useEffect, useCallback } from 'react';
import './Settings.css';
import { AIProvider } from '../services/aiService';
import { fetchLMStudioModels, testLMStudioConnection, getDefaultVisionModels, LMStudioModel } from '../services/lmStudioService';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LocalSettings {
  provider: AIProvider;
  openaiApiKey: string;
  lmstudioUrl: string;
  lmstudioApiKey: string;
  visionModel: string;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<LocalSettings>({
    provider: 'mock',
    openaiApiKey: '',
    lmstudioUrl: 'http://localhost:1234',
    lmstudioApiKey: '',
    visionModel: 'gpt-4-vision-preview'
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [availableModels, setAvailableModels] = useState<LMStudioModel[]>([]);
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
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
    
    if (key === 'lmstudioUrl') {
      setConnectionStatus('unknown');
      setAvailableModels([]);
      setModelError(null);
      setConnectionError(null);
    }
  };

  const testConnection = useCallback(async () => {
    if (!settings.lmstudioUrl) return;
    
    setConnectionStatus('unknown');
    setConnectionError(null);
    
    const result = await testLMStudioConnection(settings.lmstudioUrl);
    setConnectionStatus(result.connected ? 'connected' : 'disconnected');
    
    if (!result.connected) {
      setConnectionError(result.error || 'Could not connect to LM Studio server');
      setAvailableModels(getDefaultVisionModels());
    } else {
      setConnectionError(null);
    }
  }, [settings.lmstudioUrl]);

  const loadAvailableModels = useCallback(async () => {
    if (!settings.lmstudioUrl || settings.provider !== 'lmstudio') return;
    
    setIsLoadingModels(true);
    setModelError(null);
    
    try {
      const models = await fetchLMStudioModels(settings.lmstudioUrl);
      setAvailableModels(models.length > 0 ? models : getDefaultVisionModels());
      setConnectionStatus('connected');
      
      if (models.length === 0) {
        setModelError('No vision models found. Make sure you have a vision model loaded in LM Studio.');
      }
    } catch (error) {
      console.error('Failed to load models:', error);
      setModelError('Failed to fetch models from LM Studio server');
      setAvailableModels(getDefaultVisionModels());
      setConnectionStatus('disconnected');
    } finally {
      setIsLoadingModels(false);
    }
  }, [settings.lmstudioUrl, settings.provider]);

  useEffect(() => {
    if (settings.provider === 'lmstudio' && isOpen) {
      testConnection();
      loadAvailableModels();
    }
  }, [settings.provider, settings.lmstudioUrl, isOpen, testConnection, loadAvailableModels]);

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
      lmstudioUrl: 'http://localhost:1234',
      lmstudioApiKey: '',
      visionModel: 'gpt-4-vision-preview'
    };
    setSettings(defaultSettings);
    setHasChanges(true);
  };

  const getEnvKey = (settingKey: string): string | null => {
    const mapping: Record<string, string> = {
      provider: 'REACT_APP_AI_PROVIDER',
      openaiApiKey: 'REACT_APP_OPENAI_API_KEY',
      lmstudioUrl: 'REACT_APP_LMSTUDIO_URL',
      lmstudioApiKey: 'REACT_APP_LMSTUDIO_API_KEY',
      visionModel: 'REACT_APP_VISION_MODEL'
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
              <option value="lmstudio">LM Studio (Local)</option>
            </select>
            <small>
              {settings.provider === 'mock' && 'Uses realistic demo data for testing'}
              {settings.provider === 'openai' && 'Uses OpenAI\'s GPT-4 Vision API'}
              {settings.provider === 'lmstudio' && 'Uses your local LM Studio server'}
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

          {settings.provider === 'openai' && (
            <div className="setting-group">
              <label htmlFor="visionModel">Vision Model</label>
              <input
                type="text"
                id="visionModel"
                value={settings.visionModel}
                onChange={(e) => handleSettingChange('visionModel', e.target.value)}
                placeholder="gpt-4-vision-preview"
              />
              <small>OpenAI vision model (e.g., gpt-4-vision-preview, gpt-4-turbo-vision)</small>
            </div>
          )}

          {settings.provider === 'lmstudio' && (
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
                      <option key={model.id} value={model.id}>
                        {model.id}
                      </option>
                    ))}
                  </select>
                  <button 
                    type="button" 
                    className="refresh-models-button"
                    onClick={loadAvailableModels}
                    disabled={isLoadingModels || !settings.lmstudioUrl}
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
                    placeholder="google/gemma-3-4b"
                  />
                  <button 
                    type="button" 
                    className="refresh-models-button"
                    onClick={loadAvailableModels}
                    disabled={isLoadingModels || !settings.lmstudioUrl}
                    title="Try to detect models automatically"
                  >
                    {isLoadingModels ? '⟳' : '🔍'}
                  </button>
                </div>
              )}
              <small>
                {isLoadingModels && 'Loading available models...'}
                {!isLoadingModels && !modelError && connectionStatus === 'connected' && availableModels.length > 0 && 
                  `Found ${availableModels.length} vision model${availableModels.length !== 1 ? 's' : ''}`}
                {modelError && <span className="status-error">{modelError}</span>}
                {!modelError && !isLoadingModels && availableModels.length === 0 && connectionStatus === 'connected' && 
                  'No vision models detected - you can manually enter the model name above'}
                {!modelError && !isLoadingModels && availableModels.length === 0 && connectionStatus === 'disconnected' && 
                  'Connection failed - check CORS settings or manually enter model name'}
              </small>
            </div>
          )}

          <div className="setup-guide">
            <h3>Setup Guide</h3>
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