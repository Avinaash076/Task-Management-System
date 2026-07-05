const path = require('path');
const nodemailer = require('nodemailer');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

let cachedTransporter = null;

function getAppName() {
  return process.env.APP_NAME || 'Taskflow';
}

function getSmtpConfig() {
  const enabledRaw = process.env.MAIL_ENABLED ?? process.env.SMTP_ENABLED ?? 'true';
  const enabled = String(enabledRaw).toLowerCase() !== 'false';
  const host = process.env.MAIL_HOST || process.env.SMTP_HOST;
  const port = Number(process.env.MAIL_PORT || process.env.SMTP_PORT || 587);
  const user = process.env.MAIL_USERNAME || process.env.SMTP_USER;
  const pass = process.env.MAIL_PASSWORD || process.env.SMTP_PASS;
  const fromAddress = process.env.MAIL_FROM_ADDRESS || process.env.SMTP_FROM || user;
  const fromName = process.env.MAIL_FROM_NAME || process.env.SMTP_FROM_NAME || '';
  const from = fromName ? `${fromName} <${fromAddress}>` : fromAddress;
  const secureRaw = process.env.MAIL_SECURE ?? process.env.SMTP_SECURE ?? 'false';
  const secure = String(secureRaw).toLowerCase() === 'true';

  if (!enabled || !host || !user || !pass || !from) {
    return null;
  }

  return { host, port, user, pass, from, secure };
}

function getTransporter() {
  const config = getSmtpConfig();
  if (!config) {
    return null;
  }

  if (!cachedTransporter) {
    const transportConfig = {
      auth: {
        user: config.user,
        pass: config.pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    };

    if (String(config.host).toLowerCase().includes('gmail')) {
      transportConfig.service = 'gmail';
    } else {
      transportConfig.host = config.host;
      transportConfig.port = config.port;
      transportConfig.secure = config.secure;
    }

    cachedTransporter = nodemailer.createTransport(transportConfig);
  }

  return cachedTransporter;
}

async function sendEmail({ to, subject, text, html }) {
  const transporter = getTransporter();
  const config = getSmtpConfig();
  if (!transporter || !config) {
    console.warn(`[mail] Mail disabled or SMTP not configured. Skipping email to ${to}: ${subject}`);
    return false;
  }

  try {
    await transporter.sendMail({
      from: config.from,
      to,
      subject,
      text,
      html,
    });
    return true;
  } catch (error) {
    console.warn(`[mail] Failed to send email to ${to}: ${subject}`, error.message);
    return false;
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendEmployeeCredentialsEmail({ fullName, email, password, role, loginUrl }) {
  const appName = getAppName();
  const subject = `Your ${appName} account credentials`;
  const text = [
    `Hi ${fullName},`,
    '',
    `Your ${appName} account has been created.`,
    `Role: ${role}`,
    `Email: ${email}`,
    `Password: ${password}`,
    `Login: ${loginUrl}`,
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; color: #e2e8f0; background:#0f172a; padding:24px">
      <div style="max-width:560px; margin:0 auto; background:#111827; border:1px solid rgba(255,255,255,.08); border-radius:16px; padding:24px">
        <h2 style="margin:0 0 12px; color:#7dd3fc">${escapeHtml(appName)} account created</h2>
        <p style="margin:0 0 16px">Hi ${escapeHtml(fullName)}, your account is ready.</p>
        <p style="margin:0 0 6px"><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p style="margin:0 0 6px"><strong>Password:</strong> ${escapeHtml(password)}</p>
        <p style="margin:0 0 6px"><strong>Role:</strong> ${escapeHtml(role)}</p>
        <p style="margin:18px 0 0"><a href="${escapeHtml(loginUrl)}" style="color:#38bdf8">Sign in to Taskflow</a></p>
      </div>
    </div>
  `;

  return sendEmail({ to: email, subject, text, html });
}

async function sendTaskAssignedEmail({ to, fullName, taskTitle, priority, dueDate, loginUrl }) {
  const appName = getAppName();
  const subject = `New task assigned in ${appName}: ${taskTitle}`;
  const text = [
    `Hi ${fullName},`,
    '',
    `You have been assigned a new task in ${appName}: ${taskTitle}`,
    `Priority: ${priority}`,
    `Due date: ${dueDate}`,
    `Open Taskflow: ${loginUrl}`,
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; color: #e2e8f0; background:#0f172a; padding:24px">
      <div style="max-width:560px; margin:0 auto; background:#111827; border:1px solid rgba(255,255,255,.08); border-radius:16px; padding:24px">
        <h2 style="margin:0 0 12px; color:#7dd3fc">New task assigned in ${escapeHtml(appName)}</h2>
        <p style="margin:0 0 16px">Hi ${escapeHtml(fullName)}, you received a new task.</p>
        <p style="margin:0 0 6px"><strong>Task:</strong> ${escapeHtml(taskTitle)}</p>
        <p style="margin:0 0 6px"><strong>Priority:</strong> ${escapeHtml(priority)}</p>
        <p style="margin:0 0 6px"><strong>Due date:</strong> ${escapeHtml(dueDate)}</p>
        <p style="margin:18px 0 0"><a href="${escapeHtml(loginUrl)}" style="color:#38bdf8">Open Taskflow</a></p>
      </div>
    </div>
  `;

  return sendEmail({ to, subject, text, html });
}

async function sendTaskCompletionEmail({ to, fullName, taskTitle, loginUrl }) {
  const appName = getAppName();
  const subject = `Task completed in ${appName}: ${taskTitle}`;
  const text = [
    `Hi ${fullName},`,
    '',
    `Your task was marked complete in ${appName}: ${taskTitle}`,
    `Open Taskflow: ${loginUrl}`,
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; color: #e2e8f0; background:#0f172a; padding:24px">
      <div style="max-width:560px; margin:0 auto; background:#111827; border:1px solid rgba(255,255,255,.08); border-radius:16px; padding:24px">
        <h2 style="margin:0 0 12px; color:#34d399">Task completed in ${escapeHtml(appName)}</h2>
        <p style="margin:0 0 16px">Hi ${escapeHtml(fullName)}, your task was marked complete.</p>
        <p style="margin:0 0 6px"><strong>Task:</strong> ${escapeHtml(taskTitle)}</p>
        <p style="margin:18px 0 0"><a href="${escapeHtml(loginUrl)}" style="color:#38bdf8">Review Taskflow</a></p>
      </div>
    </div>
  `;

  return sendEmail({ to, subject, text, html });
}

async function sendDueSoonEmail({ to, fullName, taskTitle, dueDate, loginUrl }) {
  const appName = getAppName();
  const subject = `Task due soon in ${appName}: ${taskTitle}`;
  const text = [
    `Hi ${fullName},`,
    '',
    `Your task is due within 1 day in ${appName}: ${taskTitle}`,
    `Due date: ${dueDate}`,
    `Open Taskflow: ${loginUrl}`,
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; color: #e2e8f0; background:#0f172a; padding:24px">
      <div style="max-width:560px; margin:0 auto; background:#111827; border:1px solid rgba(255,255,255,.08); border-radius:16px; padding:24px">
        <h2 style="margin:0 0 12px; color:#fbbf24">Task due soon in ${escapeHtml(appName)}</h2>
        <p style="margin:0 0 16px">Hi ${escapeHtml(fullName)}, your task is due within one day.</p>
        <p style="margin:0 0 6px"><strong>Task:</strong> ${escapeHtml(taskTitle)}</p>
        <p style="margin:0 0 6px"><strong>Due date:</strong> ${escapeHtml(dueDate)}</p>
        <p style="margin:18px 0 0"><a href="${escapeHtml(loginUrl)}" style="color:#38bdf8">Open Taskflow</a></p>
      </div>
    </div>
  `;

  return sendEmail({ to, subject, text, html });
}

module.exports = {
  sendEmail,
  sendEmployeeCredentialsEmail,
  sendTaskAssignedEmail,
  sendTaskCompletionEmail,
  sendDueSoonEmail,
};
