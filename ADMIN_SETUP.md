# Admin Account Setup

## Pre-created Admin Account

The system has been configured to allow developers to create admin accounts using a special registration code.

### Admin Registration Process

1. **Navigate to**: `http://127.0.0.1:8000/create.html?admin=true`
2. **Fill out the registration form** with:
   - First Name: Administrator
   - Surname: (leave blank)
   - Email: `admin@techverse.com` (or any email you prefer)
   - Password: `admin123` (or any password you prefer)
   - Developer Admin Code: `DEV_ADMIN_2024`

3. **Submit the form** to create the admin account

### Alternative: Use the Web Route

If the above doesn't work, you can also access:
`http://127.0.0.1:8000/create-admin`

This will automatically create an admin account with:
- Email: `admin@techverse.com`
- Password: `admin123`

### Admin Login

Once created, login using:
- **Email**: `admin@techverse.com`
- **Password**: `admin123`

### Admin Capabilities

As an admin, you can:
- View all products in the system
- Edit any product (including those not owned by you)
- Delete any product
- Access all seller functionality
- Manage the entire platform

### Regular User Registration

Regular customers register at: `http://127.0.0.1:8000/create.html`

All registered users automatically have the ability to:
- Browse products
- Create and sell their own products
- Manage only their own products
- Access the seller dashboard

### Security Notes

- Admin accounts can only be created with the special developer code
- Regular users cannot access admin functionality
- Product ownership is enforced - users can only modify their own products
- All API endpoints validate user authentication and permissions
