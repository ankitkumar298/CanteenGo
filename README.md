# Fifteen Minutes, One Samosa 🥟
### Canteen Ordering and Queue Management System

A full-stack college canteen ordering and real-time queue management web application designed specifically to solve the chaotic 15-minute recess rush.

---

## 📌 Project Overview
During short 15-minute college breaks, canteens face extreme congestion, delayed food preparation, and long queues. **Fifteen Minutes, One Samosa** modernizes the college canteen experience with:
1. **Interactive 15-Minute Recess Clock & Live Rush Meter:** Shows students how much time remains in their break and indicates kitchen rush (`Low`, `Moderate`, `Peak`).
2. **Student Ordering with Fast-Break Combos:** 1-click popular student combos (e.g., Engineering Break Combo: 2 Samosas + 1 Chai), food category filters, customized cart, and demo UPI QR scanner.
3. **Authentic Canteen Token Slip:** Generates an authentic perforated coupon receipt with SVG QR code, print button, and clipboard copy.
4. **Canteen Loudspeaker Voice Announcements:** Uses native browser speech synthesis to announce: *"Attention! Token T-101, your hot samosa order is ready at the counter!"*
5. **Vendor Order & Menu Management:** Staff dashboard with live statistics, one-click cooking advancement (`Pending` → `Preparing` → `Ready` → `Completed`), menu price editing, and stock toggling.
6. **Live Digital Canteen Display:** Auto-refreshing 4-column token board with sound chimes and real food photography.

---

## 🛠️ Technology Stack
- **Frontend:** React.js with Vite (JavaScript only)
- **Backend:** Next.js App Router (JavaScript Route Handlers)
- **Database:** MongoDB with Mongoose
- **Styling:** Pure Vanilla CSS (Google Fonts: *Outfit* & *Plus Jakarta Sans*)
- **Native Browser APIs:** Web Audio API (counter bell chime), Web Speech Synthesis API (token loudspeaker callout)
- **Core React Concepts:** `useState`, `useEffect`, `props`, event handling, controlled forms, conditional rendering, and `fetch()`.

> **Note:** Strictly no TypeScript, Redux, Tailwind CSS, microservices, or complex external libraries to keep the code clear, readable, and easy to explain during a college viva examination.

---

## 🌟 Unique Project Innovations (Great for Viva Demo!)

1. **⏱️ 15-Minute Break Rush Clock:** Top ambient bar showing countdown clock and dynamic kitchen rush wait times.
2. **📢 Counter Loudspeaker Callouts:** Vendor can click "Announce" or mark an order "Ready" to trigger real voice announcements.
3. **🎟️ Authentic Token Slip:** Perforated circular notches, itemized cost slip, SVG QR scanner graphic, and print button.
4. **⚡ Fast-Break Combos:** 1-click popular college combos (e.g., 2 Samosas + 1 Chai for ₹40).
5. **📱 Interactive Demo UPI Scanner:** Modal showing scannable QR code and simulated instant payment verification with audio chime.
6. **📸 Real Canteen Food Photography:** Crisp real food pictures for samosas, cutting chai, veg patties, rolls, Maggi, coffee, and sandwiches.

---

## 📂 Project Structure

```
Next_Project/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── menu/
│   │   │   │   ├── route.js          # GET /api/menu, POST /api/menu
│   │   │   │   └── [id]/
│   │   │   │       └── route.js      # PUT /api/menu/[id], DELETE /api/menu/[id]
│   │   │   └── orders/
│   │   │       ├── route.js          # GET /api/orders, POST /api/orders
│   │   │       └── [id]/
│   │   │           └── route.js      # PUT /api/orders/[id] (status & payment)
│   │   ├── layout.js                 # Next.js root layout
│   │   └── page.js                   # Backend status page
│   ├── lib/
│   │   └── mongodb.js                # Mongoose connection with caching
│   ├── models/
│   │   ├── Menu.js                   # Menu schema (name, price, available)
│   │   └── Order.js                  # Order schema (tokenNumber, items, total, status)
│   ├── .env.local.example            # Sample MongoDB environment file
│   ├── jsconfig.json                 # Path aliases (@/*)
│   ├── next.config.js                # Next.js configuration and CORS headers
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   └── images/                   # Real food photos (samosa, chai, patty, etc.)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx            # Top navigation bar
│   │   │   ├── BreakRushBar.jsx      # 15-Minute break timer & kitchen rush meter
│   │   │   ├── TokenSlip.jsx         # Perforated coupon token slip with QR & print
│   │   │   ├── UpiModal.jsx          # Interactive demo UPI QR scanner modal
│   │   │   ├── MenuCard.jsx          # Reusable food card with real photo & zoom
│   │   │   └── StatusBadge.jsx       # Reusable pulsating status badges
│   │   ├── pages/
│   │   │   ├── HomePage.jsx          # Project landing and module navigation
│   │   │   ├── StudentPage.jsx       # Menu, fast combos, cart, token confirmation
│   │   │   ├── VendorPage.jsx        # Vendor order and menu management + voice
│   │   │   └── QueuePage.jsx         # Live canteen token queue board + voice call
│   │   ├── utils/
│   │   │   └── canteenAudio.js       # Web Audio bell chime & SpeechSynthesis
│   │   ├── App.jsx                   # Main layout and tab switching
│   │   ├── index.css                 # Standard CSS styles
│   │   └── main.jsx                  # React entry point
│   ├── index.html                    # HTML template
│   ├── vite.config.js                # Vite dev server and proxy to backend
│   └── package.json
│
└── README.md                         # Project documentation and viva guide
```

---

## 🚀 Setup and Installation Instructions

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [MongoDB](https://www.mongodb.com/) (Local MongoDB running on `mongodb://127.0.0.1:27017` or MongoDB Atlas URI)

---

### Step 1: Configure Environment Variables

Navigate to the `backend` folder and copy `.env.local.example` to `.env.local`:

```powershell
cd backend
cp .env.local.example .env.local
```

Inside `backend/.env.local`, specify your MongoDB connection string:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/fifteen_minutes_one_samosa
```

---

### Step 2: Start the Next.js Backend

Open your first terminal:

```powershell
cd backend
npm install
npm run dev
```

The Next.js App Router API server will start on:
👉 **`http://localhost:5000`**

---

### Step 3: Start the React Frontend

Open your second terminal:

```powershell
cd frontend
npm install
npm run dev
```

The Vite React application will start on:
👉 **`http://localhost:5173`**

Open **`http://localhost:5173`** in your browser to interact with the application.

---

## 📡 REST API Documentation

| Method | Endpoint | Description | Request Body Example |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/menu` | Fetch all menu items (auto-seeds defaults if empty) | None |
| `POST` | `/api/menu` | Add a new food item | `{"name": "Bread Pakora", "price": 20, "available": true}` |
| `PUT` | `/api/menu/[id]` | Update food price or availability | `{"price": 25, "available": false}` |
| `DELETE` | `/api/menu/[id]` | Remove a food item from menu | None |
| `GET` | `/api/orders` | Fetch all student orders (newest first) | None |
| `POST` | `/api/orders` | Place order, calculate price on DB, generate unique token | `{"studentName": "Rahul", "paymentMethod": "UPI", "items": [{"menuItemId": "...", "quantity": 2}]}` |
| `PUT` | `/api/orders/[id]` | Update order status or payment status | `{"orderStatus": "Preparing", "paymentStatus": "Paid"}` |

### 🔒 Backend Security & Integrity
- **Server-Side Price Calculation:** The frontend does NOT send the total price. The backend fetches each menu item from MongoDB, verifies availability, and calculates the exact sum to prevent price manipulation.
- **Safe Token Generation:** Generates sequential tokens (`T-101`, `T-102`, etc.) and verifies uniqueness against MongoDB to prevent duplicate token numbers.

---

## 🎓 Syllabus Alignment (B.Tech CSE)

| Syllabus Unit | Concepts Used in Project | Implementation in Code |
| :--- | :--- | :--- |
| **Unit I: Next.js Fundamentals** | App Router, file-based routing, project layout | `backend/app/layout.js`, `backend/app/page.js`, folder-based route structure |
| **Unit II: React & Component Architecture** | Client-side rendering, hooks, state, props, forms | `useState`, `useEffect`, controlled inputs (`value`/`onChange`), `Navbar.jsx`, `StatusBadge.jsx`, `MenuCard.jsx`, `TokenSlip.jsx` |
| **Unit III: Route Handlers & REST APIs** | HTTP Methods, JSON handling, input validation | `GET`, `POST`, `PUT`, `DELETE` in `route.js`, `request.json()`, `Response.json()`, HTTP status codes (`200`, `201`, `400`, `404`, `500`) |
| **Unit IV: Database & Mongoose ODM** | MongoDB connection, Schemas, Models, CRUD | `backend/lib/mongodb.js`, `models/Menu.js`, `models/Order.js`, `.env.local` environment variable |
