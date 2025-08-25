class ApiError extends Error {
  constructor(statusCode, message, code = undefined, errors = undefined) {
    super(message);
    this.name = `ApiError [Status ${statusCode}]`;
    this.statusCode = statusCode;
    this.status = this.getStatusMessage(statusCode);
    if (code) this.code = code;
    if (errors) this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, code, errors) {
    return new ApiError(400, message, code, errors);
  }

  static unauthorized(message, code, errors) {
    return new ApiError(401, message, code, errors);
  }

  static forbidden(message, code, errors) {
    return new ApiError(403, message, code, errors);
  }

  static notFound(message, code, errors) {
    return new ApiError(404, message, code, errors);
  }

  static methodNotAllowed(message, code, errors) {
    return new ApiError(405, message, code, errors);
  }

  static unprocessableEntity(message, code, errors) {
    return new ApiError(422, message, code, errors);
  }

  static internalServerError(message, code, errors) {
    return new ApiError(500, message, code, errors);
  }

  static serviceUnavailable(message, code, errors) {
    return new ApiError(503, message, code, errors);
  }

  getStatusMessage(statusCode) {
    const statuses = {
      400: "Bad Request",
      401: "Unauthorized",
      403: "Forbidden",
      404: "Not Found",
      405: "Method Not Allowed",
      422: "Unprocessable Entity",
      500: "Internal Server Error",
      503: "Service Unavailable",
    };
    return statuses[statusCode] || "Error";
  }
}

export default ApiError;
