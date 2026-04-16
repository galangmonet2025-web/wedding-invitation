/**
 * Formats a phone number for use with WhatsApp Links (wa.me)
 * Especially handles Indonesian numbers (starting with 0, +62, or 62)
 * 
 * @param phone The raw phone number input
 * @returns Formatted number without '+' or leading '0' (e.g., 62812...)
 */
export const formatPhoneForWhatsApp = (phone: string): string => {
    // Remove all non-numeric characters except maybe a starting '+'
    let cleaned = phone.replace(/[^\d+]/g, '');

    // Handle +62...
    if (cleaned.startsWith('+')) {
        cleaned = cleaned.substring(1);
    }

    // Handle 08... (Indonesian local format)
    if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.substring(1);
    }

    // If it doesn't start with 62 but looks like a local number (starts with 8)
    if (cleaned.startsWith('8') && cleaned.length >= 9) {
        cleaned = '62' + cleaned;
    }

    return cleaned;
};

/**
 * Generates a WhatsApp wa.me link with a pre-filled message
 * 
 * @param phone The recipient phone number
 * @param message The message text
 * @returns The encoded WhatsApp URL
 */
export const generateWhatsAppLink = (phone: string, message: string): string => {
    const formattedPhone = formatPhoneForWhatsApp(phone);
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
};
