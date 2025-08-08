import fs from "fs";
import path from "path";
import handlebars from "handlebars";
import OTP from "../models/otp.model.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { formatDate, generateOTP } from "../../lib/utils.js";
import { sendEmail } from "../../lib/nodemailer.config.js";
import ApiError from "../../utils/apiError.js"; // Make sure to import ApiError

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const templatesDir = path.join(__dirname, "..", "..", "templates");

const templatePaths = {
  otpTemplate: path.join(templatesDir, "OTPTemplate.html"),
  clientStatusUpdateTemplate: path.join(templatesDir, "ClientStatusUpdateTemplate.html"), // NEW: Add a new template path
};

const templates = Object.fromEntries(
  Object.entries(templatePaths).map(([key, filePath]) => [
    key,
    handlebars.compile(fs.readFileSync(filePath, "utf8")),
  ])
);

/**
 * Sends a templated email.
 * @param {string} to - Recipient's email address.
 * @param {string} subject - Email subject.
 * @param {string} templateId - The ID of the email template to use (e.g., 'otpTemplate').
 * @param {object} context - Data to be injected into the template.
 * @returns {Promise<object>} The email information object.
 */
export async function sendTemplateEmail(to, subject, templateId, context) {
  try {
    const template = templates[templateId];

    if (!template) {
      throw ApiError.internalServerError(`Email template not found: ${templateId}`);
    }

    // You may want to create a plain text version for email clients that don't support HTML
    const emailText = `Hello ${context.userName || ''},\n\n${subject}`;
    const html = template(context);

    return sendEmail({ to, subject, text: emailText, html });
  } catch (error) {
    console.error(`Error sending templated email (${templateId}):`, error);
    throw ApiError.internalServerError("Failed to send email");
  }
}

/**
 * Sends a one-time password email.
 * @param {string} email - Recipient's email address.
 * @param {string} userName - The name of the user.
 * @returns {Promise<object>} The email information object.
 */
export async function sendOTPEmail(email, userName) {
  try {
    await OTP.findOneAndDelete({ email });
    const otp = generateOTP();
    await OTP.create({ email, otp });

    const subject = "OTP Request";
    const date = formatDate(new Date());

    const context = { userName, otp, date };

    // Use the new generic function to send the email
    return sendTemplateEmail(email, subject, 'otpTemplate', context);
  } catch (error) {
    console.error("Error sending OTP:", error);
    throw ApiError.internalServerError("Failed to send OTP email");
  }
}

// Export the generic function and any other specific senders
export default { sendOTPEmail, sendTemplateEmail };
