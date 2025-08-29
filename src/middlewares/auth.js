import { verifyToken } from "../config/token.js";
import ApiError from "../utils/apiError.js";
import asyncWrapper from "./asyncWrapper.js";

const isAuth = asyncWrapper(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw ApiError.unauthorized("No Token Provided");
  }
  const token = authHeader.split(" ")[1];
  const payload = verifyToken(token);
  req.user = payload;
  next();
});

const isAdmin = asyncWrapper(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw ApiError.unauthorized("No Token Provided");
  }
  const token = authHeader.split(" ")[1];
  const payload = verifyToken(token);
  req.user = payload;

  const roles = Array.isArray(payload?.roles) ? payload.roles : [];
  if (!roles.includes("admin")) {
    throw ApiError.forbidden("Admin access required");
  }
  next();
});

export { isAuth, isAdmin };
