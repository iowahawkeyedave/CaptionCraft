import React, { useEffect } from 'react';
import './CaptionGenerator.css';
import { GeneratedContent } from '../App';
import { analyzeImage } from '../services/aiService';

interface CaptionGeneratorProps {
  image: string;
  onContentGenerated: (content: GeneratedContent) => void;
  isLoading: boolean;
  onGenerateClick: () => void;
}

const CaptionGenerator: React.FC<CaptionGeneratorProps> = ({
  image,
  onContentGenerated,
  isLoading,
  onGenerateClick
}) => {

  useEffect(() => {
    if (isLoading && image) {
      generateContent();
    }
  }, [isLoading, image]);

  const generateContent = async () => {
    try {
      const analysis = await analyzeImage(image);
      
      const deviantartTags = [
        ...analysis.objects.slice(0, 5),
        ...analysis.colors.slice(0, 3),
        analysis.style,
        analysis.mood
      ].filter(Boolean);

      const instagramHashtags = [
        'art', 'digitalart', 'artwork', 'creative',
        ...analysis.objects.slice(0, 3),
        ...analysis.colors.slice(0, 2),
        analysis.style?.toLowerCase(),
        analysis.mood?.toLowerCase()
      ].filter(Boolean).map(tag => tag.replace(/\s+/g, ''));

      const content: GeneratedContent = {
        deviantart: {
          title: analysis.title,
          story: analysis.story,
          tags: deviantartTags
        },
        instagram: {
          caption: analysis.instagramCaption,
          hashtags: instagramHashtags
        }
      };

      onContentGenerated(content);
    } catch (error) {
      console.error('Error generating content:', error);
      
      const fallbackContent: GeneratedContent = {
        deviantart: {
          title: "Artistic Expression",
          story: "A captivating piece that showcases creativity and artistic vision. This work demonstrates the artist's unique perspective and technical skill, inviting viewers to explore the depths of imagination and emotion captured within the frame.",
          tags: ["art", "creative", "digital", "artistic", "expression"]
        },
        instagram: {
          caption: "Sharing some creative inspiration ✨ What do you see in this image?",
          hashtags: ["art", "creative", "inspiration", "artwork", "digital"]
        }
      };
      
      onContentGenerated(fallbackContent);
    }
  };

  return (
    <div className="caption-generator">
      <div className="generator-card">
        <h2>Generate Captions & Content</h2>
        <p>Click the button below to analyze your image and generate content for DeviantArt and Instagram</p>
        
        <button 
          className={`generate-button ${isLoading ? 'loading' : ''}`}
          onClick={onGenerateClick}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="spinner"></div>
              Analyzing Image...
            </>
          ) : (
            <>
              🤖 Generate Content
            </>
          )}
        </button>
        
        {isLoading && (
          <div className="loading-info">
            <p>Our AI is analyzing your image to create:</p>
            <ul>
              <li>📝 DeviantArt title and story</li>
              <li>🏷️ Relevant tags</li>
              <li>📱 Instagram caption</li>
              <li>📍 Trending hashtags</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default CaptionGenerator;