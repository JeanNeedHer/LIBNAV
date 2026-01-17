const nodemailer = require('nodemailer');

export default async function handler(req, res) {
    // Enable CORS just in case
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Handle OPTIONS request (browser pre-flight check)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { name, email, message } = req.body;

    // Check if environment variables are actually loaded
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error("Missing Environment Variables");
        return res.status(500).json({ message: 'Server Configuration Error: Missing Env Vars' });
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    try {
        await transporter.sendMail({
            from: `"LibNav Feedback" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            replyTo: email,
            subject: `New Feedback from ${name || 'Anonymous'}`,
            text: `Name: ${name || 'Anonymous'}\nEmail: ${email || 'Not provided'}\n\nMessage:\n${message}`,
        });

        return res.status(200).json({ message: 'Sent successfully' });
    } catch (error) {
        console.error('Nodemailer Error:', error);
        // Send the actual error message back to frontend for debugging (remove this in production)
        return res.status(500).json({ message: error.message || 'Failed to send email' });
    }
                                    }
