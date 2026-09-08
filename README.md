# SQUADLY - Multi-Sided Sports Marketplace Platform

A comprehensive full-stack sports marketplace application built with **Node.js/Express** backend and **React/TypeScript** frontend.

## 🏗️ Project Structure

```
SQUADLY-App/
├── backend/                 # Express.js server
│   ├── src/
│   │   ├── index.js         # Main server entry point
│   │   ├── routes/          # API route handlers
│   │   ├── services/        # Business logic services
│   │   ├── utils/           # Utility functions
│   │   └── db/              # Database schema and seeding
│   ├── package.json
│   ├── .env                 # Environment variables
│   └── data/                # SQLite database (auto-created)
│
└── frontend/                # React TypeScript app
    ├── src/
    │   ├── pages/           # Page components
    │   ├── components/      # Reusable components
    │   ├── store/           # Zustand state management
    │   ├── api/             # API client
    │   ├── App.tsx          # Main app component
    │   └── main.tsx         # Entry point
    ├── package.json
    ├── vite.config.ts       # Vite configuration
    └── index.html           # HTML template
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **npm** or **yarn**

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file (.env):**
   - Already created with default values
   - Update `JWT_SECRET` for production
   - Configure external services (Twilio, Razorpay, AWS S3)

4. **Initialize database with seed data:**
   ```bash
   npm run seed
   ```

5. **Start the server:**
   ```bash
   npm run dev
   ```

   Server runs on `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file (.env.local):**
   ```bash
   VITE_API_URL=http://localhost:5000/api/v1
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

   App runs on `http://localhost:3000`

## 🔐 Authentication

### Test Credentials (from seed data)

| Role   | Phone         | Password   |
|--------|---------------|-----------|
| Player | +966501234567 | password123 |
| Owner  | +966503456789 | password123 |
| Admin  | +966505678901 | admin123   |

### Authentication Flow

1. User registers or logs in
2. Backend returns JWT token
3. Token stored in localStorage
4. Token included in API requests via Authorization header
5. Frontend protects routes with authentication checks

## 📚 API Endpoints

### Authentication Routes (`/api/v1/auth`)

- `POST /register` - Register new user
- `POST /login` - Login with phone/password
- `GET /me` - Get current user profile
- `PUT /me` - Update user profile
- `POST /verify-phone` - Verify phone OTP
- `POST /refresh` - Refresh access token

### Other Routes

- `/bookings` - Manage game bookings
- `/equipment` - Sports equipment marketplace
- `/forum` - Community forum
- `/gaming` - Gaming features
- `/golf` - Golf-specific features
- `/notifications` - User notifications
- `/providers` - Service providers
- `/services` - Sports services
- `/tournaments` - Tournament management
- `/venues` - Venue management
- `/wallet` - Wallet & payments
- `/chat` - Real-time chat

## 🏗️ Architecture

### Backend

- **Framework:** Express.js
- **Database:** SQLite (better-sqlite3)
- **Authentication:** JWT with bcrypt
- **Validation:** express-validator
- **WebSocket:** ws (for real-time features)
- **Security:** Helmet, CORS

### Frontend

- **Framework:** React 18
- **Language:** TypeScript
- **Routing:** React Router v6
- **State Management:** Zustand
- **HTTP Client:** Axios
- **UI Components:** Lucide React icons
- **Notifications:** React Hot Toast
- **Build Tool:** Vite

## 📋 Feature Roadmap

### Core Features (Implemented)
- ✅ User authentication (phone/password)
- ✅ User profiles (player/owner)
- ✅ Database schema for all entities
- ✅ JWT-based authorization
- ✅ Responsive UI

### Features (Coming Soon)
- 🔜 Venue booking system
- 🔜 Real-time chat & notifications
- 🔜 Tournament management
- 🔜 Payment integration
- 🔜 Equipment marketplace
- 🔜 Gaming features
- 🔜 Community forum
- 🔜 User ratings & reviews

## 🔧 Development Scripts

### Backend
```bash
npm run start      # Production server
npm run dev        # Development with auto-reload
npm run seed       # Populate database with test data
```

### Frontend
```bash
npm run dev        # Start dev server
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Run linter
```

## 🗄️ Database Schema

### Tables
- `users` - User accounts (players, owners, admins)
- `player_profiles` - Player-specific data
- `venues` - Sports facilities
- `bookings` - Game/facility bookings
- `wallets` - User payment wallets
- `reviews` - Venue/player reviews
- `tournaments` - Tournament management
- `chat_conversations` - Chat rooms
- `messages` - Chat messages
- `notifications` - User notifications

## 🔐 Security Features

- **JWT Authentication** - Secure token-based auth
- **Password Hashing** - bcryptjs with salt rounds
- **CORS Protection** - Configured origin whitelist
- **Helmet.js** - HTTP headers security
- **Input Validation** - express-validator
- **SQL Injection Prevention** - Parameterized queries

## 🚦 Error Handling

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not found
- `409` - Conflict (duplicate user)
- `500` - Server error

## 📱 Responsive Design

Frontend is fully responsive with breakpoints for:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (< 768px)

## 🌐 Environment Variables

### Backend (.env)
```
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
RAZORPAY_KEY_ID=your_key
AWS_S3_BUCKET=your_bucket
```

### Frontend (.env.local)
```
VITE_API_URL=http://localhost:5000/api/v1
```

## 📦 Dependencies

### Backend
- express, cors, helmet
- bcryptjs, jsonwebtoken
- better-sqlite3
- express-validator
- dotenv, nanoid

### Frontend
- react, react-dom, react-router-dom
- axios, zustand
- react-hot-toast
- lucide-react
- vite, typescript

## 🤝 Contributing

1. Create feature branch (`git checkout -b feature/amazing-feature`)
2. Commit changes (`git commit -m 'Add amazing feature'`)
3. Push to branch (`git push origin feature/amazing-feature`)
4. Open Pull Request

## 📄 License

This project is proprietary and confidential.

## 👥 Support

For issues or questions, please contact the development team.

---

**Last Updated:** August 28, 2024
**Version:** 1.0.0
