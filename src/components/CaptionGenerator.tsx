import React, { useEffect } from 'react';
import './CaptionGenerator.css';
import { GeneratedContent } from '../App';
import { analyzeImage } from '../services/aiService';

interface CaptionGeneratorProps {
  image: string;
  onContentGenerated: (content: GeneratedContent) => void;
  isLoading: boolean;
  onGenerateClick: () => void;
  isNSFW: boolean;
  onNSFWChange: (isNSFW: boolean) => void;
}

const CaptionGenerator: React.FC<CaptionGeneratorProps> = ({
  image,
  onContentGenerated,
  isLoading,
  onGenerateClick,
  isNSFW,
  onNSFWChange
}) => {

  useEffect(() => {
    if (isLoading && image) {
      generateContent();
    }
  }, [isLoading, image]);

  const generateContent = async () => {
    try {
      const analysis = await analyzeImage(image, isNSFW);
      
      const deviantartTags = [
        ...analysis.objects.slice(0, 5),
        ...analysis.colors.slice(0, 3),
        analysis.style,
        analysis.mood
      ].filter(Boolean);

      // Generate proper Instagram hashtags - keep them short and readable
      const instagramHashtags = [
        'art', 'digitalart', 'artwork', 'creative',
        ...analysis.objects.slice(0, 3).map(obj => obj.toLowerCase().replace(/\s+/g, '')),
        ...analysis.colors.slice(0, 2).map(color => color.toLowerCase().replace(/\s+/g, '')),
        analysis.style?.toLowerCase().replace(/\s+/g, ''),
        analysis.mood?.toLowerCase().replace(/\s+/g, '')
      ].filter(Boolean)
       .map(tag => {
         // Limit hashtag length to prevent extremely long ones
         if (tag.length > 20) {
           // Extract key words from long phrases
           const words = tag.split(/[\s\-_]+/);
           return words.slice(0, 2).join('');
         }
         return tag;
       })
       .filter(tag => tag.length > 2 && tag.length <= 20); // Remove very short or very long tags

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
        
        <div className="nsfw-option">
          <label className="nsfw-checkbox">
            <input
              type="checkbox"
              checked={isNSFW}
              onChange={(e) => onNSFWChange(e.target.checked)}
              disabled={isLoading}
            />
            <span className="checkmark"></span>
            Generate NSFW/Mature Content
          </label>
          <p className="nsfw-description">Enable for mature themes in DeviantArt stories (18+)</p>
        </div>
        
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