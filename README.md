# Town Hall

A secure, verified platform for local community communication and civic engagement.

## About

Town Hall enables direct, verified communication between local governments and their citizens. Our platform provides:

## Disconnected branches

See the "react-demo" branch for our database testing applet and other deliverables we need to accomplish for our class

- **Robust Verification**: Identity verification ensures only legitimate community members can participate
- **Emergency Response**: Direct alerts from authorized officials during critical situations
- **Community Engagement**: Structured discussion forums for civic issues and resource sharing
- **Local Focus**: Geographic validation ensures community-specific participation

## Tech Stack

- **Frontend**: Next.js 14, which is a React framework, with App Router
- **Styling**: TailwindCSS 4 with shadcn/ui components
- **Authentication**: Firebase Authentication
- **Database**: Firestore, which is a NoSQL database.
- **Hosting**: Firebase Hosting
- **Functions**: Firebase Cloud Functions
- **Storage**: Firebase Storage

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm or yarn
- Firebase CLI (`npm install -g firebase-tools`)

### Installation

1. Clone the repository
   ```
   git clone (this link)
   cd (name of project)
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Set up environment variables
   ```
   cp .env.example .env.local
   ```
   Then edit `.env.local` with your Firebase configuration

4. Start the development server
   ```
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Firebase Setup

1. Log in to Firebase CLI
   ```
   firebase login
   ```

2. Initialize Firebase in the project
   ```
   firebase init
   ```
   Select Firestore, Authentication, Storage, and Hosting features

### Deployment

1. Build the application
   ```
   npm run build
   ```

2. Deploy to Firebase
   ```
   firebase deploy
   ```

## Project Structure

```
town-hall/
├── app/                  # Next.js app router pages
├── components/           # React components
│   ├── ui/               # shadcn/ui components
│   └── ...               # Custom components
├── lib/                  # Utility functions
│   └── firebase/         # Firebase configuration
├── public/               # Static assets
├── styles/               # Global styles
└── ...
```
