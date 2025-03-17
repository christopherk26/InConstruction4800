# Town Hall - A Serverless Civic Engagement Platform (For CS4800, Cal Poly Pomona)

Team members:

Christopher Kurdoghlian, CEO
Garrett Masuda, Database Lead
Kevin Thangasamy, Design Lead	
Nico Escobedo, Identification & Community Relations Lead
Ali Manasra, Software Engineer
Ramsey Foster, Software Engineer	


This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app), designed as "Town Hall," a secure, verified platform for local community communication. Built by In Construction, Inc., it leverages a serverless architecture with Firebase to foster trust, accountability, and hyper-local engagement between citizens and government officials.

The following is the Software Requirement Specification of the team.
[In Construction SRS (CS4800, Spring 2025).pdf](https://github.com/user-attachments/files/19299225/In.Construction.SRS.CS4800.Spring.2025.pdf)

## Project Overview

Town Hall addresses the disconnect in modern community communication by providing:
- **Verified Identity**: Mandatory user verification via government-issued ID, ensuring real-name participation (SRS FR 1.1.1).
- **Geographic Focus**: Location-specific communities with residency validation (SRS FR 1.1.2).
- **Civic Engagement**: Tools for posting, commenting, voting, and emergency alerts from verified officials (SRS FR 2.0, FR 3.2).
- **Responsive UI**: A web app with light/dark mode, collapsible sidebar, and plans for a mobile app (SRS FR 4.1.1, FR 4.1.2).

Originally envisioned in the SRS (Version 1.2, Feb 2025) with PostgreSQL and React Native, the current implementation pivots to Next.js and Firebase for scalability and simplicity, aligning with a serverless philosophy.

### Vision (From SRS)
Town Hall aims to:
- Solve **Emergency Communication Failures** with verified alerts (SRS 1.2).
- Combat **Misinformation** through strict verification (SRS 1.3).
- Reduce **Community Fragmentation** with geographic restrictions (SRS 1.3).
- Enhance **Government Accessibility** via direct, authenticated interaction (SRS 1.3).

### Current Features
- **Authentication**: Email/Google sign-in and document-based verification ( `./app/auth/**`).
- **Communities**: Join verified or "ghost" communities, post content, and filter by tags ( `./app/communities/**`).
- **Content**: Create posts with text/photos, upvote/downvote, and comment (SRS FR 2.1, FR 2.4).
- **Emergency Alerts**: Planned for officials with pinning capabilities (SRS FR 3.2, partially implemented).

## Serverless Approach

The project uses Firebase to eliminate traditional server management:
1. **Firebase Authentication**: Manages sign-up/login and session state ( `./lib/firebase-client.ts`).
2. **Firestore**: Stores users, posts, and community data with real-time updates (SRS FR 4.2.1 adapted from PostgreSQL).
3. **Firebase Storage**: Handles verification documents and post media (e.g., `./app/authenticate-person/page.tsx`).
4. **Cloud Functions**: Executes verification logic (e.g., `verifyUser` in `./app/authenticate-person/page.tsx`), replacing traditional APIs (SRS FR 4.2 adapted).
5. **Client-Side Logic**: Next.js pages/components call Firebase directly, bypassing server-side routes (e.g., `./app/login/page.tsx`).

## Key Components and Interactions

### System architecture Diagram

Here is the system architecture diagram, and the UML Class diagram.


![system_archiecture_diagram_4800 (1)](https://github.com/user-attachments/assets/fcd4b7d3-ef9f-4717-bd4a-320ff333ee74)

![UMLclass4800 drawio](https://github.com/user-attachments/assets/215bfe61-670c-4a6a-82c1-ceccd6c64ad1)



### Major Files (Aligned with SRS)
- **`./app/auth/**`: Implements SRS FR 1.0-1.4 (registration, verification, role assignment).
  - `login/page.tsx`, `signup/page.tsx`: Email/Google auth (Firebase Auth).
  - `authenticate-person/page.tsx`: Uploads ID docs to Storage, calls Cloud Functions for verification.
- **`./app/communities/**`: Reflects SRS FR 1.3, FR 2.0-2.6 (community joining, content management).
  - `[id]/page.tsx`: Displays community posts with tag filtering (SRS FR 2.2.2).
  - `[id]/new-post/page.tsx`: Creates posts with tags/photos (SRS FR 2.1).
  - `[id]/posts/[postId]/page.tsx`: Shows post details, comments, and voting (SRS FR 2.4).
- **`./components/**`: UI elements like `main-navbar.tsx` (community switching, theme toggle) align with SRS 5.1.0-5.2.
- **`./lib/firebase-client.ts`**: Centralizes Firebase setup (Auth, Firestore, Storage, Functions).
- **`./functions/src/index.ts`**: Placeholder for Cloud Functions (e.g., verification), per SRS FR 4.2.

### Data Structure (Adapted from SRS 7.0)
The SRS outlines a NoSQL structure for Firestore:
- **Users**: Stores verified identity, community memberships, and roles (e.g., badges for officials).
- **Posts**: Includes tags, geographic data, and voting stats.
- **Comments**: Supports threading, upvotes/downvotes.
- **Notifications**: Tracks emergency alerts and user preferences.

The current codebase aligns with this, integrated with Firestore. 

The follwing is the image of the ER diagram. 
![ER_DIagram4800 drawio](https://github.com/user-attachments/assets/ca91ffc3-760a-4c6f-8b81-1e03c2c48a5b)

### User Flow (SRS 5.2)

The following is an image for user flow. 
<img width="669" alt="Screenshot 2025-03-17 at 2 50 36 PM" src="https://github.com/user-attachments/assets/0e195d2c-5bb3-4f0e-9d40-c8c4e587856a" />

## Technologies and Services

| Technology/Service      | Purpose                              | SRS Reference            | Current Use                  |
|--------------------------|--------------------------------------|--------------------------|------------------------------|
| **Next.js**             | Front-end framework                  | N/A (Replaced React)     | `./app/`, `./components/`    |
| **Firebase Auth**       | User authentication                  | FR 4.2.2                 | `./lib/firebase-client.ts`   |
| **Firestore**           | Real-time NoSQL database             | FR 4.2.1 (Adapted)       | Service files                |
| **Firebase Storage**    | File storage                         | FR 4.2.1 (Adapted)       | Pages/components             |
| **Cloud Functions**     | Serverless logic                     | FR 4.2 (Adapted)         | `./functions/`               |
| **Tailwind CSS**        | Styling (navy blue theme)            | FR 5.1.0                 | Throughout UI                |
| **Lucide React**        | Icons (e.g., house, bell)            | FR 5.2                   | `./components/`              |
| **Radix UI**            | Accessible UI primitives             | N/A                      | `./components/ui/`           |


## Getting Started

### Prerequisites
- Node.js (v18+)
- npm/yarn/pnpm/bun
- Firebase project (Auth, Firestore, Storage, Functions enabled)

### Setup
1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd town-hall
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Configure Firebase**:
   - Update `./lib/firebase-client.ts` with your Firebase config.
   - Set up Security Rules for Firestore/Storage.
   - Deploy Cloud Functions: `cd functions && npm install && firebase deploy --only functions`.
4. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Visit [http://localhost:3000](http://localhost:3000).
5. **Build and Deploy**:
   - Build: `npm run build`
   - Deploy: We deploying using `firebase deploy --only hosting`. You must have the firebase CLI

## Implementation Plan (SRS 8.0)
The SRS outlines a 3-month timeline:
- **Phase 1 (3 weeks)**: Planning, SRS completed (Feb 2025).
- **Phase 2 (3 weeks)**: Design (Figma) and Firebase setup.
- **Phase 3 (6 weeks)**: Core features (auth, posts, communities).
- **Phase 4 (4 weeks)**: Testing, pilot launch (e.g., Cal Poly Pomona).

## Differences from SRS
- **Tech Stack**: Next.js/Firebase replaces React/PostgreSQL for serverless efficiency.
- **Mobile App**: Not yet implemented (SRS FR 4.1.2).
- **Verification**: Uses internal system; ID.me/Onfido deferred due to cost (SRS FR 4.2.2).
- **UI**: Navy blue theme and Arial font implemented (SRS 5.1.0).

## Learn More
- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Vercel Platform](https://vercel.com)
