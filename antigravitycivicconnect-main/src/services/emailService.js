import emailjs from '@emailjs/browser';

/**
 * Service to handle sending emails via EmailJS
 */
class EmailService {
  constructor() {
    this.serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    this.templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    this.publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
    
    if (this.publicKey) {
      emailjs.init({
        publicKey: this.publicKey
      });
    } else {
      console.warn("EmailJS public key is missing. Emails will fail to send.");
    }
  }

  /**
   * Sends a complaint confirmation email
   * @param {Object} data - The email template variables
   * @param {number} retries - Number of retries remaining
   * @returns {Promise<boolean>} True if successful, false otherwise
   */
  async sendComplaintConfirmation(data, retries = 1) {
    if (!this.serviceId || !this.templateId || !this.publicKey) {
      console.warn("EmailJS is not fully configured. Missing Service ID, Template ID, or Public Key.");
      return false; // Fast fail if not configured
    }

    try {
      const response = await emailjs.send(
        this.serviceId,
        this.templateId,
        data
      );
      console.log('SUCCESS! Email sent.', response.status, response.text);
      return true;
    } catch (err) {
      console.error('FAILED to send email...', err);
      if (retries > 0) {
        console.log(`Retrying email send... (${retries} retries left)`);
        // Wait a short time before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.sendComplaintConfirmation(data, retries - 1);
      }
      return false;
    }
  }
}

export const emailService = new EmailService();
