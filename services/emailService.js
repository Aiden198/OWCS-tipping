const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendNewUserAlert({ username, email }) {
  const createdAt = new Date().toLocaleString('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  await transporter.sendMail({
    from: `"OWCS Tipping" <${process.env.SMTP_USER}>`,
    to: process.env.ALERT_EMAIL,
    subject: 'New user created',
    text:
`A new user has signed up on OWCS Tipping.

Username: ${username}
Email: ${email}
Created at: ${createdAt}`
  });
}

module.exports = {
  sendNewUserAlert
};