// Format date to readable string
export const formatDate = (date: any): string => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Format date with time
export const formatDateTime = (date: any): string => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Generate unique request ID
export const generateRequestId = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `REQ-${timestamp}-${random}`;
};

// Generate unique document ID
export const generateDocumentId = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DOC-${timestamp}-${random}`;
};

// Generate QR Code string
export const generateQRCode = (documentId: string): string => {
  return `QR-${documentId}-${Date.now().toString(36).toUpperCase()}`;
};

// Get Supabase auth error messages in human readable form
export const getAuthErrorMessage = (error: string): string => {
  const msg = error.toLowerCase();
  if (msg.includes('email already') || msg.includes('already registered'))
    return 'This email is already registered. Please login instead.';
  if (msg.includes('invalid email'))
    return 'Please enter a valid email address.';
  if (msg.includes('weak password') || msg.includes('at least 6'))
    return 'Password must be at least 6 characters.';
  if (msg.includes('user not found') || msg.includes('invalid login credentials'))
    return 'Invalid email or password. Please try again.';
  if (msg.includes('email not confirmed'))
    return 'Please verify your email before logging in.';
  if (msg.includes('too many requests'))
    return 'Too many failed attempts. Please try again later.';
  if (msg.includes('network'))
    return 'Network error. Please check your connection.';
  return error || 'An error occurred. Please try again.';
};

// File size formatter
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Truncate hash/UUID for display
export const truncateHash = (hash: string, start = 6, end = 4): string => {
  if (!hash) return '';
  if (hash.length <= start + end) return hash;
  return `${hash.substring(0, start)}...${hash.substring(hash.length - end)}`;
};