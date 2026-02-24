
export const whatsappService = {
  /**
   * Sends a WhatsApp message via the backend proxy.
   * Note: This uses Twilio Sandbox. Ensure the recipient has joined the sandbox.
   */
  async sendWhatsApp(to: string, body: string): Promise<boolean> {
    try {
      // Clean and format the phone number
      let cleanNumber = to.replace(/\D/g, '');
      // Assuming Indian numbers if no country code provided and length is 10
      if (cleanNumber.length === 10) {
        cleanNumber = '91' + cleanNumber;
      }
      if (!cleanNumber.startsWith('+')) {
        cleanNumber = '+' + cleanNumber;
      }

      const recipient = `whatsapp:${cleanNumber}`;

      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ to: recipient, body })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Proxy/Twilio Error:', errorData);
        return false;
      }

      console.log('WhatsApp message sent successfully via Proxy');
      return true;
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error);
      return false;
    }
  }
};
