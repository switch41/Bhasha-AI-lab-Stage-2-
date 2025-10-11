# Culture AI Suite (Bhasha AI Lab)

Culture AI Suite is a comprehensive platform designed to build and fine-tune AI models for low-resource Indian languages. This application empowers communities to contribute linguistic content, create curated datasets, and train custom AI models while preserving cultural and linguistic diversity.

## Key Highlights

🤖 **Fully Automated LLM Training**: Culture AI Suite automatically fine-tunes and trains language models with zero manual intervention. Simply create a dataset, and the system handles the entire training pipeline - from parameter optimization to job submission and monitoring.

⚡ **End-to-End Automation**: The platform features a complete automated workflow:
- Dataset creation triggers automatic fine-tuning jobs
- AI-optimized parameters are calculated automatically
- Jobs are submitted to OpenAI or custom LLM providers in the background
- Real-time monitoring via automated cron jobs (every 5 minutes)
- Status updates and metrics are synchronized automatically

🎯 **Smart AI Optimization**: Advanced algorithms analyze your dataset to recommend optimal training parameters, data splits, and LoRA configurations, ensuring the best possible model performance.

## Features

### 1. Authentication & User Management
- **Email OTP Authentication**: Secure passwordless login system
- **Anonymous Guest Access**: Try the platform without registration
- **Role-Based Access Control**: Support for admin, user, and member roles
- **Activity Logging**: Track all key user actions across the platform

### 2. Content Management
- **Content Contribution**: Add linguistic content including text, proverbs, and narratives
- **Rich Metadata Support**:
  - Language selection (10+ Indian languages)
  - Regional information
  - Category classification
  - Source attribution
  - Dialect specification
  - Cultural context documentation
- **Draft/Published Workflow**: Review content before publishing
- **AI Quality Analysis**: Optional Gemini API integration for automated quality scoring
- **Auto-deduplication**: Prevents duplicate entries (85% similarity threshold)
- **Comprehensive Validation**:
  - Text length: 10-10,000 characters
  - Token count: Maximum 2000 tokens
  - Supported languages: Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Odia
  - Valid content types enforcement
- **Content Browser**: Search and filter by language, type, and status
- **Advanced Search**: Full-text search across content, categories, and cultural context
- **Statistics Dashboard**: Track content by language, type, and average quality scores

### 3. Dataset Creation & Management
- **Dataset Builder**: Create curated datasets from published content
- **Advanced Filtering Options**:
  - Filter by language
  - Filter by content type
  - Set minimum quality score thresholds
- **Auto-deduplication**: Remove duplicates within datasets
- **Tokenization Analysis**: Detailed token distribution metrics
  - Average, median, min, max tokens
  - Standard deviation
  - Percentile analysis (25th, 75th, 95th)
  - Distribution categories (short, medium, long)
- **Dataset Normalization**:
  - **Manual Mode**: Custom text length, quality score, duplicate removal
  - **AI-Powered Mode**: Smart cleanup (min 50 chars, quality ≥5.0, auto-dedup)
- **Data Splitting**: Configurable train/validation/test splits
- **Export Functionality**: JSONL format for training
- **Dataset Browser**: View, filter, preview, and export datasets
- **Metadata Tracking**: Comprehensive metadata including regions, categories, and token statistics

### 4. Fine-tuning System
- **Unified Base Model Selection**:
  - OpenAI models (GPT-3.5 Turbo, GPT-4)
  - Custom LLM connections
  - Automatic provider inference
- **AI Parameter Optimization**:
  - Dynamic learning rate based on dataset size
  - Batch size adjustment for token variance
  - Intelligent epoch recommendations
  - LoRA rank and alpha configuration (4-64 rank based on complexity)
  - Cost and time estimates
- **Smart Split Feature**:
  - **AI-Optimized Split**: Analyzes dataset size for optimal train/validation/test ratios
  - **Manual Split**: Custom percentage input with validation
  - Real-time sample count display
  - Reasoning and confidence scores
- **Manual Parameter Configuration**: Full control over hyperparameters
- **Automatic Fine-tuning & Training**:
  - **Auto-Fine-tuning**: Automatically trigger training upon dataset creation
  - **Automated LLM Training**: Complete end-to-end training pipeline without manual intervention
  - **Background Processing**: Jobs run asynchronously with real-time status updates
  - **Smart Job Scheduling**: Automatic job submission to OpenAI or custom LLM providers
  - **Continuous Monitoring**: Automated polling and status synchronization via cron jobs

### 5. Job Monitoring & Tracking
- **Real-time Job Tracking**: Monitor progress, metrics, and status updates
- **OpenAI Integration**: Live status polling and synchronization
- **Job Metrics Display**:
  - Loss history visualization
  - Training steps tracking
  - Current epoch monitoring
- **Job Cancellation**: Cancel running jobs at any time
- **Status Filtering**: View jobs by status (pending, running, completed, failed, cancelled)
- **Cost & Time Estimates**: Display estimated costs and duration before starting

### 6. LLM Connections Management
- **Custom LLM Integration**: Connect external LLM providers
- **Configuration Options**:
  - API endpoints
  - Authentication types (Bearer, API Key, None)
  - Data formats (JSONL, JSON, CSV)
  - Model identifiers
- **Connection Testing**: Verify LLM connections before use
- **Active/Inactive Toggle**: Enable or disable connections as needed

### 7. External Dataset Import
- **Multi-source Support**:
  - Kaggle datasets
  - File upload (CSV, JSONL, JSON)
  - URL-based imports
- **Data Format Detection**: Automatic format recognition
- **Field Mapping**: Map external fields to internal schema
- **Record Validation**:
  - Required fields verification
  - Text and token length validation
  - Quality score checks
  - Language validation
  - Content type verification
- **Data Transformation**: Normalization and cleaning
- **Deduplication**: Remove duplicate entries automatically
- **Pipeline Configuration**: Automated dataset creation and fine-tuning workflows
- **Progress Tracking**: Real-time status updates during import (pending, processing, completed, failed)
- **Error Logging**: Comprehensive error tracking and reporting
- **Batch Processing**: Handle multiple records efficiently
- **Field Mapping Templates**: Save and reuse mapping configurations

### 8. Results Comparison & Testing
- **Test Prompt Management**: Add test prompts to completed jobs
- **Model Evaluation**: Compare base model vs fine-tuned model outputs
- **Metrics Calculation**:
  - BLEU score computation
  - Cultural accuracy assessment
- **Evaluation Status Tracking**: Monitor evaluation progress in real-time
- **Side-by-Side Comparison**: Visual comparison of base vs fine-tuned outputs
- **Expected Output Validation**: Compare against expected results

### 9. Dashboard & Analytics
- **Statistics Overview**:
  - Total content entries
  - Dataset count
  - Fine-tune jobs tracking
  - Average quality scores
- **Quick Actions**:
  - Add content
  - Create dataset
  - Start fine-tuning
  - Manage LLM connections
  - Import external datasets
- **Recent Activities**: View recent user actions
- **LLM Connection Status**: Active/total connections display
- **Real-time Progress**: Active fine-tuning job progress tracking

### 10. Landing Page
- **Mission Statement**: Clear project overview and goals
- **Feature Highlights**:
  - Content contribution capabilities
  - Dataset creation tools
  - AI fine-tuning workflows
  - Quality scoring system
  - Collaborative features
  - Multi-lingual support
- **Key Statistics**: Real-time project metrics display (10+ languages, 1000+ entries, 50+ datasets, 100+ models)
- **Call-to-Actions**: Tailored for authenticated and unauthenticated users
- **Status Bar**: LLM connections, datasets, and active jobs overview
- **Active Job Progress**: Real-time progress bars for running fine-tuning jobs
- **Dynamic Navigation**: Context-aware buttons based on authentication status

### 11. Backend Infrastructure
- **Convex Backend**: Real-time database and server functions
- **Automated Training Pipeline**:
  - **Automatic Job Submission**: Jobs are automatically submitted to providers upon creation
  - **Background Processing**: Training runs asynchronously without blocking user actions
  - **Real-time Synchronization**: Live status updates from OpenAI and custom providers
- **Cron Jobs**: Automated job polling (every 5 minutes) for continuous monitoring
- **Provider Integrations**:
  - OpenAI (GPT-3.5, GPT-4) - Automatic fine-tuning API integration
  - Google Gemini (quality analysis)
  - Custom LLM providers with flexible API support
- **Internal Actions**: Scheduled background tasks for job management
- **Data Export**: JSONL format for training with automatic formatting
- **Job Orchestration**: Complete automation from dataset creation to model deployment

## Tech Stack

### Frontend
- **Framework**: Vite with React 19
- **Language**: TypeScript
- **Routing**: React Router v7
- **Styling**: Tailwind CSS v4
- **UI Components**: Shadcn UI
- **Animations**: Framer Motion
- **Icons**: Lucide Icons

### Backend & Database
- **Backend**: Convex (real-time serverless backend)
- **Database**: Convex (real-time database)
- **Authentication**: Convex Auth (Email OTP, Anonymous)

### AI Integrations
- **OpenAI**: GPT-3.5, GPT-4 for fine-tuning
- **Google Gemini**: Content quality analysis

### Package Manager
- **pnpm**: Fast, disk space efficient package manager

## UI/UX Features

- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Framer Motion Animations**: Smooth page transitions and interactions
- **Shadcn UI Components**: Consistent, modern design system
- **Dark/Light Theme Support**: Using oklch color format for precise color control
- **Toast Notifications**: Real-time feedback for user actions (Sonner)
- **Loading States**: Spinners and progress indicators for better UX
- **Form Validation**: Both client-side and server-side validation

## Database Schema

The application uses 11 Convex tables:

1. **users**: User accounts and roles
2. **content**: Linguistic content entries
3. **datasets**: Curated training datasets
4. **finetune_jobs**: AI model training jobs
5. **test_prompts**: Model evaluation prompts
6. **activities**: User activity logs
7. **llm_connections**: Custom LLM integrations
8. **external_datasets**: Imported external data
9. **import_pipelines**: Data import workflows
10. **field_mappings**: Field mapping templates

## Application Routes

- `/` - Landing page
- `/auth` - Authentication (sign in/sign up)
- `/dashboard` - Main dashboard
- `/content` - Content browser
- `/content/new` - Add new content
- `/content/:id` - Edit content
- `/datasets` - Dataset browser
- `/datasets/create` - Create dataset
- `/finetune` - Fine-tuning jobs list
- `/finetune/new` - Start fine-tuning
- `/finetune/:id` - Job monitoring
- `/results/:id` - Results comparison
- `/llm-connections` - LLM connections management
- `/external-import` - External dataset import

## Installation

### Prerequisites
- Node.js 18 or higher
- pnpm package manager
- Convex account

### Step 1: Clone the Repository