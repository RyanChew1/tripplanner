# Univo - Trip Planner Project Story

## Inspiration

The inspiration for Univo came from the realization that travel planning is inherently a collaborative experience, yet most existing travel apps focus on individual users. We noticed that group trips often involve scattered communication across multiple platforms - WhatsApp for coordination, Google Docs for itineraries, various booking sites for flights and hotels, and separate photo sharing apps. This fragmentation leads to lost information, miscommunication, and a disjointed travel planning experience.

The name "Univo" comes from "Unity in Voyage" - representing our vision of bringing people together through seamless, collaborative travel planning. We wanted to create a platform where friends, families, and travel groups could plan, book, and share their adventures in one unified experience.

## What it does

Univo is a comprehensive group travel planning platform that transforms how people plan and experience trips together. The application provides:

**Core Features:**
- **Group Management**: Create travel groups with customizable roles (manager, admin, traveler) and invite members via email
- **Trip Planning**: Plan multiple trips within groups with detailed itineraries, dates, and descriptions
- **Flight & Hotel Booking**: Integrated search and booking for flights and hotels through Amadeus API
- **Real-time Collaboration**: Group chat functionality for seamless communication during planning
- **Photo Albums**: Shared photo albums for each trip with premium storage features
- **Calendar Integration**: Export trip details to Google Calendar for easy scheduling
- **Subscription Tiers**: Free tier with limited groups/trips, premium tier with unlimited access

**Technical Capabilities:**
- **Authentication**: Firebase Auth with email/password and Google sign-in
- **Real-time Data**: Firebase Firestore for live updates across all users
- **Payment Processing**: Stripe integration for subscription management
- **File Storage**: Firebase Storage for photo uploads and management
- **API Integrations**: Amadeus for travel booking, Google Calendar for scheduling
- **Responsive Design**: Modern UI built with Next.js, React, and Tailwind CSS

## How we built it

**Frontend Architecture:**
- **Next.js 15** with App Router for modern React development
- **TypeScript** for type safety and better developer experience
- **Tailwind CSS** for responsive, utility-first styling
- **Radix UI** components for accessible, customizable UI elements
- **TanStack Query** for efficient data fetching and caching
- **React Context** for authentication state management

**Backend & Database:**
- **Firebase Firestore** for real-time database operations
- **Firebase Authentication** for user management
- **Firebase Storage** for file uploads and photo management
- **Next.js API Routes** for server-side logic and external API integration

**Third-party Integrations:**
- **Amadeus API** for flight and hotel search/booking capabilities
- **Stripe** for subscription billing and payment processing
- **Google Calendar API** for trip export and scheduling
- **Google OAuth** for seamless authentication

**Development Tools:**
- **ESLint** for code quality and consistency
- **TypeScript** for static type checking
- **Git** for version control and collaboration
- **Environment-based configuration** for secure API key management

## Challenges we ran into

**1. Complex State Management**
Managing real-time updates across multiple users in a group travel context was challenging. We had to implement sophisticated state synchronization to ensure all group members see updates instantly, especially for chat messages and trip modifications.

**2. Firebase Storage CORS Issues**
Implementing photo uploads initially failed due to CORS policy restrictions. We had to configure Firebase Storage rules and CORS settings properly, which required deep understanding of Firebase security rules and Google Cloud Storage configuration.

**3. Stripe Webhook Synchronization**
Ensuring user subscription status stays synchronized between Stripe and our database was complex. We had to implement robust webhook handling to automatically update user tiers when subscriptions change, with proper error handling for failed webhook deliveries.

**4. Amadeus API Integration Complexity**
The Amadeus API has complex data structures for flight and hotel data. We had to create comprehensive type definitions and handle various edge cases like price changes, booking confirmations, and error scenarios.

**5. Real-time Permission Management**
Implementing role-based access control (manager, admin, traveler) with real-time updates required careful consideration of security rules and user permissions across different features.

**6. Google Calendar OAuth Flow**
Setting up the OAuth flow for Google Calendar integration required handling token refresh, scope management, and proper error handling for authentication failures.

## Accomplishments that we're proud of

**1. Seamless Real-time Collaboration**
We successfully implemented real-time updates across all features - when one user books a flight, all group members see it instantly. The chat system works flawlessly with live message updates.

**2. Comprehensive Travel Booking Integration**
We built a complete travel booking system that handles flight search, price confirmation, hotel booking, and integrates with external APIs while maintaining a smooth user experience.

**3. Robust Subscription System**
Our Stripe integration includes automatic tier management, webhook handling, and seamless user experience for subscription upgrades and downgrades.

**4. Advanced Photo Management**
We implemented a sophisticated photo album system with Firebase Storage, including upload progress tracking, error handling, and premium storage features.

**5. Modern, Responsive UI**
The application features a beautiful, modern interface that works seamlessly across desktop and mobile devices, with smooth animations and intuitive navigation.

**6. Comprehensive Error Handling**
We implemented robust error handling throughout the application, with user-friendly error messages and graceful fallbacks for API failures.

## What we learned

**Technical Learnings:**
- **Firebase Security Rules**: Deep understanding of Firestore security rules and how to implement complex permission systems
- **Real-time Data Synchronization**: How to handle real-time updates efficiently without overwhelming the client
- **API Integration Best Practices**: Proper error handling, rate limiting, and data transformation for external APIs
- **OAuth Implementation**: Complex authentication flows with token management and refresh handling
- **Payment Processing**: Stripe webhook handling and subscription lifecycle management

**Product Development:**
- **User Experience Design**: How to balance feature richness with usability in a collaborative application
- **Group Dynamics**: Understanding how different user roles and permissions affect the collaborative experience
- **Performance Optimization**: Techniques for optimizing real-time applications with large datasets

**Project Management:**
- **API Documentation**: The importance of comprehensive setup documentation for complex integrations
- **Environment Management**: Proper handling of environment variables and configuration across development and production
- **Testing Strategies**: How to test real-time features and external API integrations effectively

## What's next for Univo

**Short-term Improvements:**
- **Mobile App**: Native iOS and Android applications for better mobile experience
- **Advanced Itinerary Builder**: Drag-and-drop itinerary creation with time-based scheduling
- **Expense Tracking**: Built-in expense splitting and tracking for group trips
- **Offline Support**: Offline capability for viewing trip details and photos

**Medium-term Features:**
- **AI-Powered Recommendations**: Machine learning suggestions for activities, restaurants, and attractions
- **Travel Document Management**: Passport, visa, and travel document storage and reminders
- **Weather Integration**: Real-time weather updates and packing suggestions
- **Social Features**: Trip sharing, public trip templates, and community features

**Long-term Vision:**
- **Global Expansion**: Multi-language support and local payment methods
- **Travel Agent Integration**: Connect with travel agents for complex bookings
- **Blockchain Integration**: Decentralized trip ownership and smart contracts for group bookings
- **AR/VR Features**: Virtual trip previews and augmented reality navigation

**Technical Roadmap:**
- **Microservices Architecture**: Breaking down the monolithic structure for better scalability
- **Advanced Analytics**: User behavior tracking and trip success metrics
- **API Rate Optimization**: Implementing caching and request optimization
- **Security Enhancements**: Advanced security features and compliance certifications

Univo represents our commitment to revolutionizing how people plan and experience travel together, making group trips more organized, collaborative, and memorable.
