const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const escapeHtml = (value: unknown): string => {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

const isValidEmail = (value: unknown): boolean => {
    return typeof value === 'string' && EMAIL_REGEX.test(value);
};

// Returns a trimmed string when the value is a non-empty string within maxLength,
// otherwise null. Used to validate required text fields on form submissions.
const validateText = (value: unknown, maxLength = 5000): string | null => {
    if (typeof value !== 'string') {
        return null;
    }
    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed.length > maxLength) {
        return null;
    }
    return trimmed;
};

export { escapeHtml, isValidEmail, validateText };
