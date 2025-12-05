const express = require('express');
const cors = require('cors');
const app = express();
const port = 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Registration endpoint
app.post('/api_register.php', (req, res) => {
    console.log('Registration request received:', req.body);

    const { username, email, password, role = 'customer' } = req.body;

    // Basic validation
    const errors = [];

    if (!username || username.length < 2) {
        errors.push('Username is required and must be at least 2 characters');
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Valid email is required');
    }

    if (!password || password.length < 8) {
        errors.push('Password is required and must be at least 8 characters');
    }

    if (errors.length > 0) {
        return res.status(422).json({ error: errors.join(', ') });
    }

    // Success response
    res.json({
        message: 'Registration successful',
        user: {
            id: 1,
            username: username,
            email: email,
            role: role
        }
    });
});

// Login endpoint
app.post('/api/login', (req, res) => {
    console.log('Login request received:', req.body);

    const { email, password } = req.body;

    // Basic validation
    const errors = [];

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Valid email is required');
    }

    if (!password || password.length < 1) {
        errors.push('Password is required');
    }

    if (errors.length > 0) {
        return res.status(422).json({ error: errors.join(', ') });
    }

    // Simple authentication - accept any email/password combination for demo
    // In a real app, you'd check against a database
    if (email && password) {
        res.json({
            message: 'Login successful',
            user: {
                id: 1,
                username: 'Demo User',
                email: email,
                role: 'customer'
            }
        });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'Server is running' });
});

app.listen(port, () => {
    console.log(`Server running at http://127.0.0.1:${port}`);
});
