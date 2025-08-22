import React, { useState } from 'react';
import './ResultDisplay.css';
import { GeneratedContent } from '../App';

interface ResultDisplayProps {
  content: GeneratedContent;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ content }) => {
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const copyToClipboard = async (text: string, itemName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(itemName);
      setTimeout(() => setCopiedItem(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedItem(itemName);
      setTimeout(() => setCopiedItem(null), 2000);
    }
  };

  const formatHashtags = (hashtags: string[]): string => {
    return hashtags.map(tag => `#${tag}`).join(' ');
  };

  const formatTags = (tags: string[]): string => {
    return tags.join(', ');
  };

  return (
    <div className="result-display">
      <h2>Generated Content</h2>
      
      {/* DeviantArt Story - Full Width */}
      <div className="full-width-section">
        <div className="content-section deviantart-story-section">
          <div className="section-header">
            <h3>🎨 DeviantArt Story</h3>
          </div>
          <div className="content-item">
            <div className="item-header">
              <h4>Story/Description</h4>
              <button
                className={`copy-button ${copiedItem === 'da-story' ? 'copied' : ''}`}
                onClick={() => copyToClipboard(content.deviantart.story, 'da-story')}
              >
                {copiedItem === 'da-story' ? '✓' : '📋'}
              </button>
            </div>
            <div className="item-content story-content">
              {content.deviantart.story}
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout for other content */}
      <div className="content-grid">
        <div className="content-section deviantart-section">
          <div className="section-header">
            <h3>🎨 DeviantArt Title & Tags</h3>
          </div>
          
          <div className="content-item">
            <div className="item-header">
              <h4>Title</h4>
              <button
                className={`copy-button ${copiedItem === 'da-title' ? 'copied' : ''}`}
                onClick={() => copyToClipboard(content.deviantart.title, 'da-title')}
              >
                {copiedItem === 'da-title' ? '✓' : '📋'}
              </button>
            </div>
            <div className="item-content title-content">
              {content.deviantart.title}
            </div>
          </div>

          <div className="content-item">
            <div className="item-header">
              <h4>Tags</h4>
              <button
                className={`copy-button ${copiedItem === 'da-tags' ? 'copied' : ''}`}
                onClick={() => copyToClipboard(formatTags(content.deviantart.tags), 'da-tags')}
              >
                {copiedItem === 'da-tags' ? '✓' : '📋'}
              </button>
            </div>
            <div className="item-content tags-content">
              {content.deviantart.tags.map((tag, index) => (
                <span key={index} className="tag">{tag}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="content-section instagram-section">
          <div className="section-header">
            <h3>📱 Instagram Content</h3>
          </div>
          
          <div className="content-item">
            <div className="item-header">
              <h4>Caption</h4>
              <button
                className={`copy-button ${copiedItem === 'ig-caption' ? 'copied' : ''}`}
                onClick={() => copyToClipboard(content.instagram.caption, 'ig-caption')}
              >
                {copiedItem === 'ig-caption' ? '✓' : '📋'}
              </button>
            </div>
            <div className="item-content caption-content">
              {content.instagram.caption}
            </div>
          </div>

          <div className="content-item">
            <div className="item-header">
              <h4>Hashtags</h4>
              <button
                className={`copy-button ${copiedItem === 'ig-hashtags' ? 'copied' : ''}`}
                onClick={() => copyToClipboard(formatHashtags(content.instagram.hashtags), 'ig-hashtags')}
              >
                {copiedItem === 'ig-hashtags' ? '✓' : '📋'}
              </button>
            </div>
            <div className="item-content hashtags-content">
              {content.instagram.hashtags.map((hashtag, index) => (
                <span key={index} className="hashtag">#{hashtag}</span>
              ))}
            </div>
          </div>

          <div className="content-item full-post">
            <div className="item-header">
              <h4>Full Instagram Post</h4>
              <button
                className={`copy-button ${copiedItem === 'ig-full' ? 'copied' : ''}`}
                onClick={() => copyToClipboard(
                  `${content.instagram.caption}\n\n${formatHashtags(content.instagram.hashtags)}`,
                  'ig-full'
                )}
              >
                {copiedItem === 'ig-full' ? '✓' : '📋'}
              </button>
            </div>
            <div className="item-content full-post-content">
              <div className="caption-preview">{content.instagram.caption}</div>
              <div className="hashtags-preview">
                {formatHashtags(content.instagram.hashtags)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultDisplay;