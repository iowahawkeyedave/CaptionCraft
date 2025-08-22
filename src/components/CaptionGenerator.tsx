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
          story: "In the realm where imagination meets reality, this captivating piece stands as a testament to the boundless creativity of the human spirit. The artist has woven together elements of light, shadow, and emotion to create something truly extraordinary. Each stroke, each pixel, each carefully considered detail speaks to a deeper narrative that unfolds before the viewer's eyes.\n\nThe composition draws you in with its masterful use of visual storytelling. There's a sense of movement, of life breathing within the static frame, as if the very essence of the subject has been captured and immortalized. The interplay of colors creates a symphony of visual harmony, each hue carefully chosen to evoke specific emotions and memories.\n\nAs you study the piece more closely, layers of meaning begin to emerge. The artist has embedded subtle symbols and metaphors throughout the work, creating a rich tapestry of interpretation. Perhaps there's a story of transformation here, or a meditation on the passage of time, or simply a celebration of beauty in its purest form.\n\nThe technical execution is flawless, demonstrating years of dedication to the craft. Every element has been considered, from the overall composition to the finest details that might only be noticed upon closer inspection. This is not merely an image; it's a portal into another world, a glimpse into the artist's soul, and an invitation for viewers to embark on their own journey of discovery.\n\nIn a world often filled with chaos and uncertainty, works like this remind us of the power of art to inspire, to heal, and to connect us to something greater than ourselves. It stands as a beacon of creativity, encouraging others to pick up their tools and create something meaningful of their own.",
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