# Pharmaceutical Management System

A complete pharmaceutical warehouse management system with Node.js backend and modern frontend.

## Features

- ✅ User Authentication (Login, Registration) with JWT
- ✅ Password Hashing with bcrypt
- ✅ Dashboard with real-time statistics
- ✅ Inventory Management
- ✅ Order Management
- ✅ Medicine Management
- ✅ Supplier Management
- ✅ Database Integration (SQL Server)

## Prerequisites

- Node.js (v14 or higher)
- SQL Server (with the database created from `database/SQL.sql`)
- npm or yarn

## Setup Instructions

### 1. Database Setup

1. Run the SQL script in `database/SQL.sql` to create the database and tables:
   ```sql
   -- The script creates CancerPharmacyDB database
   -- Make sure SQL Server is running and accessible
   ```

2. Update database credentials in `backend/db.js` or create a `.env` file:
   ```
   DB_USER=sa
   DB_PASSWORD=your_password
   DB_SERVER=localhost
   DB_NAME=CancerPharmacyDB
   DB_PORT=1433
   ```

### 2. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file (optional, defaults are in `db.js`):
   ```
   DB_USER=sa
   DB_PASSWORD=test1234
   DB_SERVER=localhost
   DB_NAME=CancerPharmacyDB
   DB_PORT=1433
   PORT=3001
   JWT_SECRET=your-secret-key-change-in-production
   ```

4. Start the server:
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

The server will run on `http://localhost:3001`

### 3. Frontend Setup

The frontend is served statically by the backend server. No separate setup needed!

Just open your browser and navigate to:
- `http://localhost:3001` - Home page
- `http://localhost:3001/login.html` - Login/Register page
- `http://localhost:3001/dashboard.html` - Dashboard (requires login)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info

### Medicines
- `GET /api/medicines` - Get all medicines
- `GET /api/medicines/:id` - Get single medicine
- `POST /api/medicines` - Add new medicine
- `DELETE /api/medicines/:id` - Delete medicine

### Inventory
- `GET /api/inventory` - Get inventory with batch details

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

### Orders
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create new order

### Suppliers
- `GET /api/suppliers` - Get all suppliers

### Companies
- `GET /api/companies` - Get all companies

## Project Structure

```
Pharmaceutical/
├── backend/
│   ├── routes/
│   │   ├── auth.js          # Authentication routes
│   │   ├── apiRoutes.js     # Main API routes
│   │   └── users.js         # User routes (legacy)
│   ├── middleware/
│   │   └── auth.js          # JWT authentication middleware
│   ├── db.js                # Database connection
│   ├── server.js            # Express server
│   └── package.json
├── frontend/
│   ├── assets/
│   │   └── js/
│   │       ├── api.js       # API utility functions
│   │       └── auth.js      # Authentication frontend logic
│   ├── index.html           # Home page
│   ├── login.html           # Login/Register page
│   ├── dashboard.html       # Dashboard
│   ├── inventory.html       # Inventory management
│   └── orders.html          # Order management
└── database/
    └── SQL.sql              # Database schema
```

## Authentication

The system uses JWT (JSON Web Tokens) for authentication. After successful login/registration, a token is stored in localStorage and sent with each API request.

## Database Schema

The database includes the following main tables:
- `Users` - User accounts
- `Medicines` - Medicine catalog
- `Companies` - Pharmaceutical companies
- `Suppliers` - Medicine suppliers
- `MedicineBatches` - Batch tracking
- `Inventory` - Inventory levels
- `Orders` - Order records
- `Invoices` - Invoice records
- `MedicineAlerts` - Low stock alerts

## Development Notes

- All API routes (except auth) require authentication via JWT token
- Passwords are hashed using bcrypt with 10 salt rounds
- Frontend uses fetch API to communicate with backend
- CORS is enabled for cross-origin requests
- Error handling is implemented throughout

## Troubleshooting

1. **Database Connection Error**: 
   - Check SQL Server is running
   - Verify database credentials in `db.js` or `.env`
   - Ensure database `CancerPharmacyDB` exists

2. **Authentication Issues**:
   - Clear browser localStorage
   - Check JWT_SECRET is set
   - Verify token is being sent in Authorization header

3. **API Errors**:
   - Check browser console for error messages
   - Verify backend server is running
   - Check network tab for failed requests

## Next Steps

To complete the implementation, you may want to:
- Add more validation and error handling
- Implement payment processing
- Add more detailed reporting
- Implement user roles and permissions
- Add email notifications
- Add file uploads for documents

## License

This project is for educational/demonstration purposes.
