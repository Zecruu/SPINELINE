// Utility functions for phone number formatting

/**
 * Format phone number for input fields (auto-formatting as user types)
 * @param {string} value - The input value
 * @returns {string} - Formatted phone number (e.g., "555-123-4567")
 */
export const formatPhoneNumber = (value) => {
  // Remove all non-numeric characters
  const phoneNumber = value.replace(/\D/g, '');
  
  // Format based on length
  if (phoneNumber.length === 0) return '';
  if (phoneNumber.length <= 3) return phoneNumber;
  if (phoneNumber.length <= 6) return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3)}`;
  return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
};

/**
 * Format phone number for display (handles empty/null values)
 * @param {string} phone - The phone number to format
 * @returns {string} - Formatted phone number or '-' if empty
 */
export const formatPhoneDisplay = (phone) => {
  if (!phone) return '-';
  
  // Remove all non-numeric characters
  const phoneNumber = phone.replace(/\D/g, '');
  
  // Format based on length
  if (phoneNumber.length === 0) return '-';
  if (phoneNumber.length <= 3) return phoneNumber;
  if (phoneNumber.length <= 6) return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3)}`;
  return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
};

/**
 * Clean phone number (remove all formatting, keep only digits)
 * @param {string} phone - The phone number to clean
 * @returns {string} - Clean phone number with only digits
 */
export const cleanPhoneNumber = (phone) => {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
};

/**
 * Validate phone number format
 * @param {string} phone - The phone number to validate
 * @returns {boolean} - True if valid US phone number format
 */
export const isValidPhoneNumber = (phone) => {
  const cleaned = cleanPhoneNumber(phone);
  return cleaned.length === 10;
};
