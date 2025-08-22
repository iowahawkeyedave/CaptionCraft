import React, { useCallback, useState, DragEvent } from 'react';
import './ImageUpload.css';

interface ImageUploadProps {
  onImageUpload: (imageDataUrl: string) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onImageUpload }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileRead = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreviewUrl(dataUrl);
      onImageUpload(dataUrl);
    };
    reader.readAsDataURL(file);
  }, [onImageUpload]);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      handleFileRead(files[0]);
    }
  }, [handleFileRead]);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileRead(files[0]);
    }
  }, [handleFileRead]);

  return (
    <div className="image-upload">
      <div
        className={`upload-zone ${isDragging ? 'dragging' : ''} ${previewUrl ? 'has-image' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {previewUrl ? (
          <div className="image-preview">
            <img src={previewUrl} alt="Uploaded" />
            <div className="upload-overlay">
              <p>Drop a new image to replace</p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="file-input"
                id="file-input"
              />
              <label htmlFor="file-input" className="upload-button">
                Choose New Image
              </label>
            </div>
          </div>
        ) : (
          <div className="upload-placeholder">
            <div className="upload-icon">📷</div>
            <p>Drag and drop an image here</p>
            <p>or</p>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="file-input"
              id="file-input"
            />
            <label htmlFor="file-input" className="upload-button">
              Choose Image
            </label>
            <small>Supports JPG, PNG, GIF, WebP</small>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;