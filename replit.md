# Vivid - Note-taking and Task Management App

## Overview

Vivid is a React Native mobile application built with Expo that combines note-taking, task management, and reminder functionality. The app features a modern Material Design 3 interface with support for both light and dark themes, markdown editing, and multi-language support (Russian and English). The application integrates with Supabase for backend services and uses a file-based navigation structure with Expo Router.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React Native with Expo SDK 53
- **Navigation**: Expo Router with file-based routing and React Navigation bottom tabs
- **UI Library**: React Native Paper (Material Design 3)
- **State Management**: React Context API for theme and authentication
- **Internationalization**: i18next with Russian and English support
- **Styling**: React Native Paper theming with custom light/dark themes

### Backend Architecture
- **Database**: Supabase (PostgreSQL) with real-time capabilities
- **Authentication**: Supabase Auth with email/password
- **File Storage**: Supabase Storage for image attachments
- **API**: Supabase client for database operations

### Data Storage Solutions
- **Primary Database**: Supabase PostgreSQL for notes, tasks, and user data
- **Local Storage**: AsyncStorage for user preferences, offline caching, and session persistence
- **File Storage**: Supabase Storage for media attachments

## Key Components

### Core Screens
1. **Welcome Screen**: Onboarding with permission requests
2. **Notes Screen**: Hierarchical folder/note structure with search and Kanban view
3. **Tasks Screen**: Task management with priorities, tags, and recurring schedules
4. **Settings Screen**: Theme, language, and app configuration
5. **Note Editor**: Rich text editor with markdown support and media attachments

### UI Components
- **Sidebar**: Hierarchical folder navigation with drag-and-drop
- **IOSContextMenu**: Platform-specific context menus
- **MediaAttachment**: Image handling with resize and positioning
- **TagSelector/PrioritySelector**: Task categorization components
- **ThemedStatusBar**: Synchronized status bar with app theme

### Navigation Structure
- Bottom tab navigation with three main sections
- Stack navigation for detailed views and settings
- File-based routing using Expo Router

## Data Flow

### Authentication Flow
1. App checks for existing session in AsyncStorage
2. Validates session with Supabase
3. Redirects to AuthScreen if unauthenticated
4. Maintains session state through AuthContext

### Notes Management
1. Notes stored in hierarchical structure (folders/notes)
2. Real-time synchronization with Supabase
3. Local caching for offline access
4. Event bus for cross-component updates

### Task Management
1. Tasks with priority levels, tags, and due dates
2. Recurring task generation based on intervals
3. Notification scheduling for reminders
4. Progress tracking with completion statistics

### Data Persistence
- Supabase for server-side persistence
- AsyncStorage for local settings and offline data
- Event-driven updates between components

## External Dependencies

### Core Dependencies
- **@supabase/supabase-js**: Backend integration
- **expo**: Development framework and services
- **react-native-paper**: Material Design UI components
- **react-navigation**: Navigation framework
- **i18next/react-i18next**: Internationalization

### Media and Rich Text
- **expo-image-picker**: Image selection functionality
- **react-native-pell-rich-editor**: Rich text editing
- **react-native-markdown-display**: Markdown rendering
- **react-native-svg**: Vector graphics support

### Utility Libraries
- **react-native-gesture-handler**: Touch interactions
- **@react-native-async-storage/async-storage**: Local storage
- **expo-notifications**: Push notifications
- **mitt**: Event bus for component communication

## Deployment Strategy

### Development
- Expo CLI for local development
- Hot reloading and debugging with Expo tools
- Jest for unit testing with React Native Testing Library

### Production
- **Mobile**: Expo Application Services (EAS) for iOS and Android builds
- **Web**: Expo web deployment pipeline
- **CI/CD**: Automated testing with ESLint, StyleLint, and Jest

### Environment Configuration
- Supabase credentials managed through Expo environment variables
- Platform-specific configurations in app.json
- Metro bundler configuration for React Native web compatibility

### Testing Strategy
- Jest with React Native Testing Library for component testing
- Mock implementations for Expo modules and external services
- Automated testing pipeline integrated with build process

The application follows modern React Native development practices with a focus on user experience, offline capability, and cross-platform compatibility. The architecture supports both immediate functionality and future scalability through the Supabase backend integration.