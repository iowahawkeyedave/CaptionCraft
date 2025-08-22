import React, { useState, useCallback } from 'react';
import './App.css';
import ImageUpload from './components/ImageUpload';
import CaptionGenerator from './components/CaptionGenerator';
import ResultDisplay from './components/ResultDisplay';
import Settings from './components/Settings';

export interface GeneratedContent {
  deviantart: {
    title: string;
    story: string;
    tags: string[];
  };
  instagram: {
    caption: string;
    hashtags: string[];
  };
}

function App() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isNSFW, setIsNSFW] = useState(false);

  const handleImageUpload = useCallback((imageDataUrl: string) => {
    setUploadedImage(imageDataUrl);
    setGeneratedContent(null);
  }, []);

  const handleContentGenerated = useCallback((content: GeneratedContent) => {
    setGeneratedContent(content);
    setIsLoading(false);
  }, []);

  const handleGenerateContent = useCallback(() => {
    if (!uploadedImage) return;
    setIsLoading(true);
    setGeneratedContent(null);
  }, [uploadedImage]);

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <div className="header-text">
            <h1>CaptionCraft</h1>
            <p>Craft compelling titles, stories, and captions for DeviantArt and Instagram</p>
          </div>
          <button 
            className="settings-button"
            onClick={() => setShowSettings(true)}
            title="AI Provider Settings"
          >
            ⚙️
          </button>
        </div>
      </header>
      
      <main className="App-main">
        <div className="upload-section">
          <ImageUpload onImageUpload={handleImageUpload} />
        </div>

        {uploadedImage && (
          <div className="generate-section">
            <CaptionGenerator 
              image={uploadedImage}
              onContentGenerated={handleContentGenerated}
              isLoading={isLoading}
              onGenerateClick={handleGenerateContent}
              isNSFW={isNSFW}
              onNSFWChange={setIsNSFW}
            />
          </div>
        )}

        {generatedContent && (
          <div className="results-section">
            <ResultDisplay content={generatedContent} />
          </div>
        )}
      </main>

      <Settings 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}

export default App;