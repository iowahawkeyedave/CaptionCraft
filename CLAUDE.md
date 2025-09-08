# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CaptionCraft is an AI-powered web application for generating titles, stories, and captions for DeviantArt and Instagram from uploaded images. Built with React 18 + TypeScript, it supports multiple AI providers: Google Gemini, OpenAI, LM Studio (local), and Ollama (local).

## Development Commands

```bash
# Start development server (runs on port 3000)
npm start

# Build for production
npm run build

# Run tests (currently no tests implemented)
npm test

# Install dependencies
npm install
```

## Architecture

The application follows a service layer pattern with clear separation of concerns:

- **Components** (`/src/components/`): React UI components handling user interaction
- **Services** (`/src/services/`): AI integration layer with provider abstraction
- **Main Flow**: ImageUpload → CaptionGenerator → aiService → AI Provider APIs → ResultDisplay

### Key Services

- `aiService.ts`: Main service orchestrator that routes requests to different AI providers
- `geminiService.ts`: Google Gemini API integration  
- `lmStudioService.ts`: Local LM Studio integration (dual-model: vision + text)
- `ollamaService.ts`: Local Ollama integration (dual-model: vision + text)

### AI Provider Architecture

The application uses two different processing approaches:
1. **Single-model** (OpenAI, Gemini): Direct image analysis and content generation
2. **Dual-model** (LM Studio, Ollama): Vision model analyzes image → Text model generates story

## Critical Security Issues

⚠️ **IMMEDIATE ATTENTION REQUIRED**:
- 99 critical and 2 high severity npm vulnerabilities - run `npm audit fix`
- API keys stored in localStorage (Settings.tsx:196) - needs encryption or secure storage
- No input validation for uploaded images

## Configuration

- Settings stored in localStorage via Settings component
- Environment variables supported via .env files
- Mock mode available for testing without API costs
- TypeScript configuration in tsconfig.json (strict mode available but not fully enabled)

## Key Files to Understand

- `src/App.tsx`: Main application shell and state management
- `src/services/aiService.ts`: Central AI provider routing (863 lines - complex)
- `src/components/Settings.tsx`: Provider configuration and API key management
- `src/components/ImageUpload.tsx`: Drag-drop image handling with base64 conversion
- `src/components/CaptionGenerator.tsx`: AI content generation trigger
- `src/components/ResultDisplay.tsx`: Generated content display with copy-to-clipboard

## Testing Notes

Currently **no tests implemented**. When adding tests:
- Use Jest (already configured via react-scripts)
- Focus on aiService.ts logic and provider integrations
- Mock API calls to avoid costs during testing
- Test image upload validation and error handling

## Development Patterns

- Components use React hooks for state management
- Error handling varies between providers - standardization needed
- Image processing converts to base64 data URLs
- Provider responses are parsed into structured format: `{ title, story, caption, hashtags }`

## Technical Debt

- aiService.ts is complex and could benefit from provider pattern refactoring
- Missing React error boundaries for API failures  
- Direct localStorage usage could be abstracted
- Bundle size optimization needed (404MB node_modules)