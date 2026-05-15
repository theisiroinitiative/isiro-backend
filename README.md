# Isiro (Haggle Proof Ledger) Backend

Isiro is an intelligent, WhatsApp-based business management system designed for the Nigerian informal economy. It allows traders to manage inventory, record sales, track expenses, calculate credit scores, and manage their finances entirely via natural language on WhatsApp.

## 🚀 Key Features

*   **WhatsApp AI Assistant**: Powered by Google Gemini 2.5 Flash, the system understands Pidgin, detects intent from text, audio (voice notes), and images (receipts).
*   **Virtual Account & Wallet Management**: Secure virtual accounts and fund withdrawals using the SquadCo Transfer API.
*   **Inventory & Sales Tracking**: Create products, update stock, and automatically calculate profits.
*   **SME Trust Algorithm**: Dynamically calculates user credit scores based on verified cash inflow, inventory turnover, and business discipline.
*   **Pending Interaction State Management**: Maintains context across multi-message conversations (e.g., waiting for PIN confirmation) with background cron jobs to clean up stale sessions.

## 📂 Project Architecture

```
whatsapp-trading-backend
├── src
│   ├── api
│   │   ├── controllers        # REST handlers (Accounts, Users, Sales, Inventory)
│   │   ├── middleware         # JWT & RBAC Auth Middleware
│   │   └── routes             # Express Route Definitions
│   ├── config                 # Tokens, DB configurations
│   ├── jobs                   # Background jobs (cronJobs.js for timeout cleanups)
│   ├── models                 # Sequelize ORM definitions (PostgreSQL)
│   ├── services
│   │   ├── ai                 # Gemini AI integrators, intent detectors, credit scoring
│   │   ├── dbServices         # Database abstraction layer (User, Account, Inventory, OTPs)
│   │   └── squad              # SquadCo API integration
│   ├── utils                  # Helpers (OTP Generator, Email Sender)
│   └── whatsapp-agent         # Baileys WebSockets WhatsApp Client
├── api-docs                   # Swagger YAML documentation
├── package.json               # Dependencies
└── app.js                     # Express entry point
```

## 🛠 Prerequisites

*   Node.js v18+
*   PostgreSQL
*   Redis (for OTP rate limiting and session management)

## 🔐 Environment Variables

Create a `.env` file in the root directory. **Never commit this file to version control.**

```env
# Database
DATABASE_URL=postgresql://user:password@host/db
REDIS_URL=redis://localhost:6379

# JWT & Security
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret

# AI & APIs
GEMINI_API_KEY=your_gemini_key
RESEND_API_KEY=your_resend_email_key
BOT_PHONE_NUMBER=2348000000000

# SquadCo API (Virtual Accounts & Transfers)
SQUAD_SECRET_KEY=sandbox_sk_...
SQUAD_BASE_URL=https://sandbox-api-d.squadco.com
SQUAD_MERCHANT_ID=...
```

## 💻 Installation & Usage

1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Start development server**:
    ```bash
    npm run dev
    ```
3.  **View API Docs**:
    Navigate to `http://localhost:3050/api-docs` (Default credentials: admin / password)

## 🛡 Security & Reliability
*   **OTP Protection**: Requests are rate-limited to 60 seconds via Redis to prevent email bombing.
*   **Webhook HMAC Security**: All SquadCo webhooks are validated using a cryptographic HMAC signature verified against the `rawBody` buffer to prevent tampering.
*   **Atomic Transactions**: Balance and inventory updates use atomic database operations (`.increment`/`.decrement`) to prevent race conditions during high concurrency.
*   **Withdrawal Integrity**: The system follows a "Debit-First" protocol for withdrawals, ensuring funds are reserved locally before initiating external transfers, with automated rollbacks on failure.
*   **Media Validation**: The WhatsApp agent strictly filters MIME types to prevent crashes from unsupported media (videos, documents).
*   **Account Hijacking Protection**: Only WhatsApp numbers that match a registered user and have completed the in-app verification can interact with the bot.

## 🤝 Contributing
Feel free to submit issues or pull requests for improvements or bug fixes.

## 📄 License
MIT License.
