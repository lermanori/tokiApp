/**
 * Parse API errors into a consistent format for display in ErrorModal
 */

export type ParsedError = {
  title: string;
  message: string;
  details?: string[];
  statusCode?: number;
};

/**
 * Parse an error from API calls into a user-friendly format
 * @param err - The error object (from catch block)
 * @param context - Optional context ('create' or 'edit') for better error titles
 * @returns ParsedError object with title, message, optional details and status code
 */
export function parseApiError(err: unknown, context?: 'create' | 'edit'): ParsedError {
  // Default fallback
  let title = 'Something went wrong';
  let message = 'An unexpected error occurred. Please try again.';
  let details: string[] | undefined;
  let statusCode: number | undefined;

  // Extract error information
  if (err && typeof err === 'object') {
    const error = err as any;
    
    // Get status code if available
    statusCode = error.status || error.statusCode;
    
    // Get message from error object
    if (error.message) {
      message = error.message;
    }
    
    // Map status codes to appropriate titles
    if (statusCode) {
      switch (statusCode) {
        case 400:
          title = context === 'create' 
            ? "Can't create Toki" 
            : context === 'edit'
            ? "Can't update Toki"
            : "Invalid request";
          break;
        case 401:
          title = "Authentication required";
          message = "Please log in to continue.";
          break;
        case 403:
          title = "You don't have permission";
          message = context === 'edit'
            ? "You can only update Tokis you host."
            : "You don't have permission to perform this action.";
          break;
        case 404:
          title = "Not found";
          message = context === 'edit'
            ? "The Toki you're trying to update doesn't exist."
            : "The requested resource was not found.";
          break;
        case 409:
          title = "Conflict";
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          title = "Server error";
          message = "Something went wrong on our end. Please try again later.";
          break;
        default:
          if (context === 'create') {
            title = "Can't create Toki";
          } else if (context === 'edit') {
            title = "Can't update Toki";
          }
      }
    } else {
      // No status code, use context for title
      if (context === 'create') {
        title = "Can't create Toki";
      } else if (context === 'edit') {
        title = "Can't update Toki";
      }
    }
    
    // Extract details array if present (for validation errors)
    if (error.details && Array.isArray(error.details)) {
      details = error.details;
    }
  } else if (typeof err === 'string') {
    message = err;
    if (context === 'create') {
      title = "Can't create Toki";
    } else if (context === 'edit') {
      title = "Can't update Toki";
    }
  }

  return {
    title,
    message,
    details,
    statusCode,
  };
}

