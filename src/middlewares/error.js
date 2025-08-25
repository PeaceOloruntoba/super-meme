import { validationResult } from "express-validator";

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const first = errors.array()[0];
    return res.status(422).json({
      success: false,
      status: "Validation Error",
      status_code: 422,
      message: first?.msg || "Validation Error",
      code: "VALIDATION_ERROR",
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      path: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
  }
  next();
};

export const errorMiddleware = (err, req, res, next) => {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  let status_code = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let status = err.status || "Error";
  let code = err.code; // optional logical code from ApiError
  let details = err.errors; // optional array/object of field errors

  // Mongo duplicate key error
  if (err?.code === 11000) {
    status_code = 409;
    status = "Conflict";
    const keys = Object.keys(err.keyValue || {});
    const field = keys[0];
    message = field
      ? `${field} already exists`
      : "Duplicate key error";
    code = "DUPLICATE_KEY";
    details = keys.length ? keys.map((k) => ({ field: k, message: `${k} already exists` })) : undefined;
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    status_code = 422;
    status = "Validation Error";
    message = "Validation Error";
    const validationErrors = Object.keys(err.errors || {}).map((field) => ({
      field,
      message: err.errors[field].message,
    }));
    return res.status(status_code).json({
      success: false,
      status,
      status_code,
      message,
      code: code || "VALIDATION_ERROR",
      errors: validationErrors,
      path: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString(),
      stack: process.env.NODE_ENV === "production" ? null : err.stack,
    });
  }

  // Mongoose cast error (e.g., invalid ObjectId)
  if (err.name === "CastError") {
    status_code = 400;
    status = "Bad Request";
    message = `Invalid value for ${err.path}`;
    code = "CAST_ERROR";
  }

  // Body parser JSON syntax error
  if (err instanceof SyntaxError && "body" in err) {
    status_code = 400;
    status = "Bad Request";
    message = "Invalid JSON payload";
    code = "INVALID_JSON";
  }

  return res.status(status_code).json({
    success: false,
    status,
    status_code,
    message,
    code,
    errors: details,
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};
