# CaptionCraft

An AI-powered web application that crafts compelling titles, stories, and captions for your images, specifically designed for DeviantArt and Instagram sharing.

## Features

- 🖼️ **Drag & Drop Image Upload** - Easy image uploading with preview
- 🤖 **Multiple AI Providers** - Support for OpenAI GPT-4 Vision, LM Studio (local), and mock mode
- ⚙️ **Easy Configuration** - Built-in settings panel for AI provider configuration
- 🎨 **DeviantArt Content** - Generates titles, detailed stories, and relevant tags
- 📱 **Instagram Content** - Creates engaging captions and trending hashtags
- 📋 **One-Click Copy** - Copy individual elements or complete posts to clipboard
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile devices
- 🏠 **Local AI Support** - Run completely offline with LM Studio

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Development Server**
   ```bash
   npm start
   ```

3. **Open Your Browser**
   - Navigate to `http://localhost:3000`
   - Click the ⚙️ settings button to configure your AI provider
   - Upload an image and generate content!

## AI Provider Configuration

The app supports three AI providers that you can configure through the settings panel:

### 🎭 Mock Mode (Default)
- **No setup required** - Works immediately with realistic demo data
- Perfect for testing and demonstration
- No API keys or external services needed

### 🌐 OpenAI GPT-4 Vision
- **Setup**: Get an API key from [OpenAI Platform](https://platform.openai.com/api-keys)
- **Cost**: Charged per API request
- **Quality**: Excellent, production-ready results
- **Models**: `gpt-4-vision-preview`, `gpt-4-turbo-vision`

### 🏠 LM Studio (Local AI)
- **Setup**: Download [LM Studio](https://lmstudio.ai/) and a vision model
- **Cost**: Free after initial setup
- **Privacy**: Runs completely offline
- **Models**: `llava-v1.6-vicuna-7b`, `llava-v1.6-mistral-7b`, or any compatible vision model

#### LM Studio Setup Guide:

1. **Download LM Studio**: Get it from [lmstudio.ai](https://lmstudio.ai/)
2. **Download a Vision Model**: 
   - Recommended: `llava-v1.6-vicuna-7b` or `llava-v1.6-mistral-7b`
   - Look for models with "llava" in the name for vision support
3. **Load the Model**: Open LM Studio and load your downloaded model
4. **Start Local Server**: 
   - Go to "Local Server" tab in LM Studio
   - Click "Start Server" (usually runs on `http://localhost:1234`)
5. **Configure App**: 
   - Open settings (⚙️) in the app
   - Select "LM Studio (Local)" as provider
   - Set server URL (default: `http://localhost:1234`)
   - Save settings and refresh the page

### Environment Variables (Alternative Configuration)

You can also configure the app using environment variables by copying `.env.example` to `.env`:

```bash
# Choose your AI provider: openai, lmstudio, or mock
REACT_APP_AI_PROVIDER=mock

# OpenAI Configuration
REACT_APP_OPENAI_API_KEY=your_openai_api_key_here

# LM Studio Configuration
REACT_APP_LMSTUDIO_URL=http://localhost:1234
REACT_APP_LMSTUDIO_API_KEY=

# Vision model settings
REACT_APP_VISION_MODEL=gpt-4-vision-preview
```

## How to Use

1. **Upload an Image** - Drag and drop or click to select an image file
2. **Generate Content** - Click the "Generate Content" button to analyze your image
3. **Copy Content** - Use the copy buttons to copy titles, stories, captions, or hashtags
4. **Share** - Paste the generated content to DeviantArt or Instagram

## Technologies Used

- **React 18** with TypeScript
- **Multiple AI Providers**: OpenAI GPT-4 Vision API, LM Studio local inference
- **CSS3** with backdrop filters and animations
- **HTML5** File API for image handling
- **Local Storage** for settings persistence

## Content Generated

### DeviantArt
- **Title**: Compelling, SEO-friendly titles
- **Story**: Detailed descriptions and artistic narratives
- **Tags**: Relevant keywords for discoverability

### Instagram
- **Caption**: Engaging, character-optimized captions
- **Hashtags**: Trending and relevant hashtags
- **Full Post**: Ready-to-paste combination of caption and hashtags

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - feel free to use this project for personal or commercial purposes.