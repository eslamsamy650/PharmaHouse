const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true,
    message: {
        message: 'Too many login attempts. Please try again in 15 minutes.'
    }
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: {
        message: 'Too many registration attempts.'
    }
});

module.exports = { loginLimiter, registerLimiter };