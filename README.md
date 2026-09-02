
### Turn leads into relationships.
=======
# VeloraCRM

**Client Lead Management System**
A modern full-stack CRM designed to help businesses manage client leads,
track sales pipelines and stay organized with follow-ups.

---

## 🎯 Internship Project

**Program:** Future Interns — Full Stack Web Development Internship  
**Task:** Task 2 — Client Lead Management System  
**Project:** VeloraCRM  

VeloraCRM was developed to manage client leads generated through website contact forms and provide a complete workflow from lead capture to conversion.

---
Developed as part of the **Future Interns Full Stack Web Development
Internship --- Task 2**.


## ✨ Features

-   Lead creation, search and filtering
-   Sales pipeline and lead status management
-   Follow-ups, reminders and overdue tracking
-   Analytics dashboard and sales insights
-   Deal risk indicators
-   AI-powered lead assistance
-   CSV export for filtered leads
-   Secure authentication and protected APIs
-   Responsive modern dashboard

## 🛠️ Tech Stack


### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Recharts
- Lucide React
- Framer Motion
- dnd-kit

### Backend

- Next.js App Router
- Next.js API Route Handlers
- MongoDB
- Mongoose
- Zod validation

### Authentication & Security

- JWT sessions using `jose`
- bcrypt password hashing
- HTTP-only session cookies
- Protected application pages
- Protected API routes

---

## 🏗️ Architecture

```text
veloracrm/
│
├── app/
│   ├── (app)/
│   │   ├── dashboard/
│   │   ├── leads/
│   │   ├── pipeline/
│   │   ├── analytics/
│   │   ├── ai/
│   │   ├── activity/
│   │   └── settings/
│   │
│   ├── api/
│   │   ├── auth/
│   │   ├── leads/
│   │   ├── followups/
│   │   ├── analytics/
│   │   ├── activity/
│   │   ├── ai/
│   │   ├── contact/
│   │   └── settings/
│   │
│   └── contact/
│
├── components/
│   ├── dashboard/
│   ├── leads/
│   ├── ai/
│   └── ...
│
├── lib/
│   ├── ai/
│   ├── analytics/
│   ├── auth/
│   ├── db/
│   └── validation/
│
├── models/
│   └── Mongoose schemas
│
├── scripts/
│   └── seed.ts
│
└── proxy.ts
```

-   Next.js
-   TypeScript
-   MongoDB
-   Tailwind CSS
-   AI Integration
-   Vercel

## 🤖 AI Layer

VeloraCRM includes an AI assistant designed to help users understand and
manage leads more efficiently.

### AI Capabilities

-   Lead analysis and summaries
-   Lead prioritization assistance
-   Follow-up recommendations
-   Sales insights
-   Related lead suggestions
-   Natural-language questions about CRM data
-   Deterministic fallback responses when the AI provider is unavailable

### AI Reliability

The AI service includes:

-   Request timeout protection
-   Automatic retry for temporary provider errors
-   Handling for rate-limit responses
-   Handling for server-side provider failures
-   Deterministic fallback responses to keep the assistant usable even
    when the external AI service is unavailable

------------------------------------------------------------------------

## 📊 Analytics & Forecasting

The analytics dashboard provides an overview of CRM performance and
sales activity.

It includes:

-   Total leads
-   Conversion rate
-   Revenue metrics
-   Lead sources
-   Sales funnel
-   Pipeline performance
-   Follow-up activity
-   Deal risk indicators
-   Speed-to-lead metrics
-   Performance trends

------------------------------------------------------------------------

## 🗄️ MongoDB Setup

VeloraCRM uses MongoDB Atlas for persistent data storage.

Create a MongoDB Atlas cluster and configure the connection string in
your environment variables.

Example:

```env
MONGODB_URI=mongodb://username:password@host1:27017,host2:27017,host3:27017/?ssl=true&replicaSet=replicaSetName&authSource=admin&appName=VeloraCRM
```

------------------------------------------------------------------------

## 🔐 Environment Variables

Create a `.env.local` file in the project root:

```env
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret
AI_API_KEY=your_ai_api_key
AI_BASE_URL=your_ai_provider_base_url
AI_MODEL=your_ai_model
```

Never commit `.env.local` or any file containing production secrets to
GitHub.

------------------------------------------------------------------------

## 🚀 Installation

Clone the repository:

```bash
git clone https://github.com/spoorthikengol/FUTURE_FS_02.git
```

Navigate into the project:

```bash
cd FUTURE_FS_02
```

Install dependencies:

```bash
npm install
```

------------------------------------------------------------------------

## 💻 Local Development

Start the development server:

```bash
npm run dev
```

Open the application at:

```text
http://localhost:3000
```

Build the project for production:

```bash
npm run build
```

Run TypeScript validation:

```bash
npx tsc --noEmit
```

------------------------------------------------------------------------

## 👤 Demo Login

**Email:**
```text
ivan.p@example.net
```

**Password:**
```text
VeloraAdmin123!
```

------------------------------------------------------------------------

## 🔌 API Documentation

The application provides API routes for:

-   Authentication
-   Lead management
-   Lead search and filtering
-   Lead export
-   Follow-ups
-   Analytics
-   AI assistant
-   Activity tracking
-   Contact forms

All protected API routes require an authenticated session.

------------------------------------------------------------------------

## 🔄 Lead Management Workflow

**Website Contact → Lead Creation → Qualification → Pipeline Management
→ Follow-up → Conversion**

Users can:

-   Create new leads
-   Search leads globally
-   Filter leads by status, source and priority
-   Update lead information
-   Move leads through the sales pipeline
-   Add notes
-   Schedule follow-ups
-   Track overdue follow-ups
-   Mark follow-ups as completed
-   Reschedule follow-ups
-   Delete leads
-   Export filtered leads as CSV
-   Analyze lead performance

------------------------------------------------------------------------

## 🌐 Deployment

The application is deployed using Vercel.

**Production:**  
[https://veloracrm.vercel.app](https://veloracrm.vercel.app)

The project uses MongoDB Atlas for production database storage.

Environment variables must be configured separately in the Vercel
project settings.

------------------------------------------------------------------------

## 🔮 Future Improvements

Potential future enhancements include:

-   Advanced AI-powered lead scoring
-   Automated email follow-ups
-   WhatsApp integration
-   CRM email synchronization
-   Advanced sales forecasting
-   Role-based permissions
-   Team collaboration
-   Custom analytics reports
-   Notification integrations
-   Enhanced AI sales recommendations

------------------------------------------------------------------------

## 🎓 Internship Context

This project was developed as part of the **Future Interns Full Stack
Web Development Internship --- Task 2**.

The objective was to build a practical client lead management system
capable of handling lead generation, lead tracking, follow-ups,
analytics and AI-assisted CRM operations.

------------------------------------------------------------------------

## 📄 License

This project is created for educational and internship purposes.

------------------------------------------------------------------------

## 👩‍💻 Author

**Spoorthi K P**

- **GitHub:** [spoorthikengol](https://github.com/spoorthikengol/FUTURE_FS_02)
- **Project:** VeloraCRM — Future Interns Task 2
=======
GitHub: `https://github.com/spoorthikengol/FUTURE_FS_02`

Project: **VeloraCRM --- Future Interns Task 2**

