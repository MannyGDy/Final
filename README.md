# Captive Portal Web App

A beautiful, responsive web application for managing captive portal authentication with RADIUS server integration. This app provides user registration, login, and admin dashboard functionality with PostgreSQL database backend.

## Features

### 🎯 Core Features
- **Captive Portal Interface** - Beautiful, mobile-responsive landing page
- **User Registration** - Collect email, full name, phone number, and company name
- **User Login** - Authenticate with email/phone and password
- **RADIUS Integration** - Seamless authentication with your existing RADIUS server
- **Admin Dashboard** - Complete user management and data export
- **Connection Tracking** - Monitor user connections and session data

### 🎨 UI/UX Features
- **Modern Design** - Clean, professional interface with Tailwind CSS
- **Mobile Responsive** - Works perfectly on all devices
- **Fast Performance** - Optimized for quick loading and smooth interactions
- **Beautiful Animations** - Subtle animations for enhanced user experience
- **Accessibility** - WCAG compliant design

### 🔧 Technical Features
- **Secure Authentication** - JWT-based authentication with bcrypt password hashing
- **Database Integration** - PostgreSQL with automatic table creation
- **API Security** - Rate limiting, CORS, and helmet security headers
- **Data Export** - CSV export for users and connection logs
- **Real-time Updates** - Live connection status and user activity

## Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **node-radius** - RADIUS client integration
- **csv-writer** - Data export functionality

### Frontend
- **React** - UI framework
- **React Router** - Client-side routing
- **Tailwind CSS** - Styling framework
- **Heroicons** - Icon library
- **Axios** - HTTP client

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL database
- RADIUS server (already configured)

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm run install-all
   ```

2. **Configure environment variables:**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your database and RADIUS server details:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=radius
   DB_USER=your_radius_user
   DB_PASSWORD=your_radius_password

   # RADIUS Server Configuration
   RADIUS_HOST=localhost
   RADIUS_PORT=1812
   RADIUS_SECRET=your_radius_secret

   # JWT Secret
   JWT_SECRET=your_super_secret_jwt_key_here

   # Server Configuration
   PORT=5000
   NODE_ENV=development
   ```

3. **Start the development servers:**
   ```bash
   npm run dev
   ```

   This will start both the backend server (port 5000) and frontend (port 3000).

### Database Setup

The application will automatically create the necessary tables on first run:

- `users` - User accounts and profiles
- `connection_logs` - Connection tracking data
- `admins` - Admin accounts

### Admin Account Setup

Create an admin account by running this SQL query:

```sql
INSERT INTO admins (email, password_hash) 
VALUES ('admin@yourcompany.com', '$2a$12$your_hashed_password_here');
```

To generate a password hash, you can use the bcrypt utility or create a simple script.

## Usage

### For Users
1. **Access the portal** at `http://localhost:3000`
2. **Choose registration** or login
3. **Fill in details** (email, name, phone, company, password)
4. **Login** with email/phone and password
5. **Get connected** to the RADIUS network

### For Admins
1. **Access admin login** at `http://localhost:3000/admin/login`
2. **Login** with admin credentials
3. **View dashboard** with user statistics
4. **Manage users** and view connection logs
5. **Export data** as CSV files

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Admin
- `POST /api/admin/login` - Admin login
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/users` - List users
- `GET /api/admin/export/users` - Export user data
- `GET /api/admin/export/connections` - Export connection logs

### Users
- `GET /api/users/connections` - User connection history
- `PUT /api/users/profile` - Update profile
- `POST /api/users/connect` - Log connection
- `POST /api/users/disconnect` - Log disconnection

## Configuration

### RADIUS Integration
The app integrates with your existing RADIUS server. Make sure your RADIUS server is configured to:
- Accept authentication requests from the app server
- Use the same secret as configured in the environment variables
- Have user accounts that match the email addresses used in registration

### Database Configuration
The app uses your existing PostgreSQL RADIUS database. It will create additional tables for user management while preserving your existing RADIUS data.

## Security Features

- **Password Hashing** - All passwords are hashed with bcrypt
- **JWT Tokens** - Secure session management
- **Rate Limiting** - Protection against brute force attacks
- **CORS Protection** - Configured for production security
- **Input Validation** - Server-side validation for all inputs
- **SQL Injection Protection** - Parameterized queries

## Production Deployment

### Environment Variables
Set `NODE_ENV=production` and configure:
- Strong JWT secret
- Production database credentials
- RADIUS server details
- CORS origins for your domain

### Build Process
```bash
# Build the React app
cd client && npm run build

# Start production server
npm start
```

### Reverse Proxy
Configure nginx or Apache to serve the React app and proxy API requests to the Node.js server.

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check PostgreSQL is running
   - Verify database credentials in `.env`
   - Ensure database exists

2. **RADIUS Authentication Failed**
   - Verify RADIUS server is running
   - Check RADIUS secret matches
   - Test RADIUS connection manually

3. **Frontend Not Loading**
   - Check if React dev server is running
   - Verify port 3000 is available
   - Check browser console for errors

### Logs
- Backend logs are displayed in the terminal
- Check browser developer tools for frontend errors
- Database logs can be found in PostgreSQL logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support and questions:
- Check the troubleshooting section
- Review the API documentation
- Open an issue on GitHub

---

**Built with ❤️ for secure, beautiful captive portal experiences**
