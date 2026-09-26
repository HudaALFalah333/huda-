import nodemailer from 'nodemailer'
import { env } from './env.js'

// Create transporter for Gmail SMTP
let transporter = null

/**
 * Get or create a transporter for global email settings
 */
function getTransporter() {
  if (transporter) return transporter

  const emailEnabled = env.EMAIL_ENABLED === 'true' || env.EMAIL_ENABLED === true
  if (!emailEnabled) {
    console.log('[Email] Email service is disabled (EMAIL_ENABLED=false)')
    return null
  }

  const emailUser = env.EMAIL_USER
  const emailPassword = env.EMAIL_PASSWORD
  const emailFrom = env.EMAIL_FROM || emailUser

  if (!emailUser || !emailPassword) {
    console.warn('[Email] Gmail credentials not configured (EMAIL_USER, EMAIL_PASSWORD)')
    return null
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPassword
    }
  })

  return transporter
}

/**
 * Create a transporter for specific HR email credentials
 * @param {string} emailUser - HR's Gmail address
 * @param {string} emailPassword - HR's Gmail app password
 * @returns {object|null} - Nodemailer transporter or null if invalid
 */
function createHrTransporter(emailUser, emailPassword) {
  if (!emailUser || !emailPassword) {
    return null
  }

  try {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPassword
      }
    })
  } catch (error) {
    console.error('[Email] Failed to create HR transporter:', error?.message)
    return null
  }
}

/**
 * Send email notification
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - HTML email content
 * @param {object} options - Optional settings
 * @param {string} options.fromEmail - HR's email address (if using HR-specific email)
 * @param {string} options.fromName - Sender name (default: "EJO Support")
 * @param {object} options.transporter - Custom transporter (if HR-specific)
 * @returns {Promise<boolean>} - Success status
 */
export async function sendEmail({ to, subject, html, fromEmail, fromName, transporter: customTransporter }) {
  try {
    // Use custom transporter (HR-specific) if provided, otherwise use global
    const mailTransporter = customTransporter || getTransporter()
    if (!mailTransporter) {
      console.log('[Email] Skipping email (transporter not available)')
      return false
    }

    // Use HR email as sender if provided, otherwise use global
    const emailFrom = fromEmail || env.EMAIL_FROM || env.EMAIL_USER
    const senderName = fromName || 'EJO Support'

    await mailTransporter.sendMail({
      from: `"${senderName}" <${emailFrom}>`,
      to,
      subject,
      html
    })

    console.log(`[Email] Sent email to ${to} from ${emailFrom}: ${subject}`)
    return true
  } catch (error) {
    console.error('[Email] Failed to send email:', error?.message || error)
    return false
  }
}

// Export the HR transporter creation function
export { createHrTransporter }

/**
 * Generate email template for interview scheduled
 */
export function getInterviewScheduledEmailTemplate({ candidateName, jobTitle, companyName, scheduledDate, scheduledTime, durationMinutes, meetingType, meetingLink }) {
  const formattedDate = scheduledDate || 'TBD'
  const formattedTime = scheduledTime || 'TBD'
  const duration = durationMinutes || 60
  const meeting = meetingType || 'Video Call'
  const link = meetingLink || '#'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Interview Scheduled</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">EJO Support</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px;">Interview Scheduled! 🎉</h2>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear ${candidateName || 'Candidate'},
              </p>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Great news! We're excited to invite you for an interview for the position of <strong style="color: #1e3a8a;">${jobTitle || 'the position you applied for'}</strong>${companyName ? ` at ${companyName}` : ''}.
              </p>
              
              <!-- Interview Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 30px 0; border-left: 4px solid #3b82f6;">
                <tr>
                  <td>
                    <p style="color: #1e293b; font-size: 18px; font-weight: 600; margin: 0 0 15px 0;">Interview Details:</p>
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #64748b; font-size: 14px; width: 140px;"><strong>Date:</strong></td>
                        <td style="color: #1e293b; font-size: 14px;">${formattedDate}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-size: 14px;"><strong>Time:</strong></td>
                        <td style="color: #1e293b; font-size: 14px;">${formattedTime}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-size: 14px;"><strong>Duration:</strong></td>
                        <td style="color: #1e293b; font-size: 14px;">${duration} minutes</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-size: 14px;"><strong>Meeting Type:</strong></td>
                        <td style="color: #1e293b; font-size: 14px;">${meeting}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              ${meetingLink ? `
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                <strong>Meeting Link:</strong> <a href="${link}" style="color: #2563eb; text-decoration: none;">${link}</a>
              </p>
              ` : ''}
              
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
                Please make sure to be available at the scheduled time. We look forward to speaking with you!
              </p>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 30px 0 0 0;">
                Best regards,<br>
                <strong style="color: #1e3a8a;">The EJO Support Team</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} EJO Support. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * Generate email template for application accepted
 */
export function getApplicationAcceptedEmailTemplate({ candidateName, jobTitle, companyName }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Accepted</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">EJO Support</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px;">Congratulations! 🎊</h2>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear ${candidateName || 'Candidate'},
              </p>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                We are thrilled to inform you that your application for the position of <strong style="color: #059669;">${jobTitle || 'the position you applied for'}</strong>${companyName ? ` at ${companyName}` : ''} has been <strong style="color: #059669;">ACCEPTED</strong>!
              </p>
              
              <!-- Success Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ecfdf5; border-radius: 8px; padding: 20px; margin: 30px 0; border-left: 4px solid #10b981;">
                <tr>
                  <td>
                    <p style="color: #065f46; font-size: 16px; line-height: 1.6; margin: 0;">
                      <strong>Your application has been approved!</strong> Our team will be in touch with you soon regarding the next steps.
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
                We were impressed by your qualifications and believe you would be a great addition to our team. We look forward to working with you!
              </p>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 30px 0 0 0;">
                Best regards,<br>
                <strong style="color: #059669;">The EJO Support Team</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} EJO Support. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * Generate email template for application rejected
 */
export function getApplicationRejectedEmailTemplate({ candidateName, jobTitle, companyName }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Status Update</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">EJO Support</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px;">Application Status Update</h2>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear ${candidateName || 'Candidate'},
              </p>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Thank you for your interest in the position of <strong style="color: #1e3a8a;">${jobTitle || 'the position you applied for'}</strong>${companyName ? ` at ${companyName}` : ''}. We appreciate the time and effort you invested in your application.
              </p>
              
              <!-- Information Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border-radius: 8px; padding: 20px; margin: 30px 0; border-left: 4px solid #ef4444;">
                <tr>
                  <td>
                    <p style="color: #991b1b; font-size: 16px; line-height: 1.6; margin: 0;">
                      <strong>Unfortunately, we are unable to proceed with your application at this time.</strong>
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
                This decision was not easy, as we received many qualified applications. We encourage you to apply for other positions that match your skills and experience in the future.
              </p>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
                We wish you the best in your job search and thank you again for considering us.
              </p>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 30px 0 0 0;">
                Best regards,<br>
                <strong style="color: #dc2626;">The EJO Support Team</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} EJO Support. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
