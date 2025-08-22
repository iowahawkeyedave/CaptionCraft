import React, { useEffect, useCallback } from 'react';
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

  const generateContent = useCallback(async () => {
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
          title: "Visual Story Awaiting Discovery",
          story: "This image holds a story waiting to be told. While our AI analysis encountered an issue, the visual elements present in this piece speak volumes about the creative vision behind it. The composition, lighting, and subject matter work together to create a compelling narrative that invites viewers to explore and interpret.\n\nEvery image contains layers of meaning - from the technical choices made in its creation to the emotional resonance it evokes in those who view it. The interplay of visual elements creates a unique atmosphere that can transport viewers to different worlds, evoke memories, or inspire new ideas.\n\nThe artistic choices evident in this piece - whether in color palette, composition, lighting, or subject matter - demonstrate the creator's vision and skill. These elements combine to create something that goes beyond mere documentation, becoming a form of visual storytelling that speaks to universal human experiences.\n\nArt has the power to communicate across barriers of language and culture, touching something fundamental in our shared human experience. This piece, like all meaningful visual art, serves as a bridge between the creator's vision and the viewer's imagination, creating a space for personal interpretation and emotional connection.\n\nWhile we couldn't generate a specific analysis this time, the image itself remains a testament to the power of visual communication and the endless possibilities that emerge when creativity meets technical skill. Each viewing may reveal new details and inspire different interpretations, making it a living piece of art that continues to engage and inspire.",
          tags: ["art", "creative", "visual", "story", "inspiration"]
        },
        instagram: {
          caption: "Every image tells a story ✨ What narrative do you see here? 🎨",
          hashtags: ["art", "visual", "story", "creative", "inspiration"]
        }
      };
      
      onContentGenerated(fallbackContent);
    }
  }, [image, isNSFW, onContentGenerated]);

  useEffect(() => {
    if (isLoading && image) {
      generateContent();
    }
  }, [isLoading, image, isNSFW, generateContent]);

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
              <li>📝 DeviantArt title and immersive story (800-1000 words)</li>
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