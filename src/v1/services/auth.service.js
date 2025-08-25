import mongoose from "mongoose";
import { generateToken } from "../../config/token.js";
import User from "../models/user.model.js";
import OTP from "../models/otp.model.js";
import ApiError from "../../utils/apiError.js";
import { hashPassword, validatePassword } from "../../utils/validationUtils.js";
import ApiSuccess from "../../utils/apiSuccess.js";
import emailService from "./email.service.js";
import axios from "axios";
import { OAuth2Client } from "google-auth-library";

export async function findUserByEmail(email) {
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw ApiError.notFound("No user with this email");
  }
  return user;
}

export async function findUserByIdOrEmail(identifier) {
  const isObjectId = mongoose.Types.ObjectId.isValid(identifier);
  const user = await User.findOne(
    isObjectId ? { _id: identifier } : { email: identifier }
  ).select("+password");

  if (!user) {
    throw ApiError.notFound("User Not Found");
  }

  return user;
}

export async function register(userData = {}) {
  const { password } = userData;
  const hashedPassword = await hashPassword(password);
  const user = await User.create({ ...userData, password: hashedPassword });
  const token = generateToken(
    {
      email: user.email,
      userId: user._id,
      roles: user.roles,
    },
    "1h"
  );

  try {
    const emailInfo = await emailService.sendOTPEmail(
      user.email,
      user.firstName
    );

    return ApiSuccess.created(
      `Registration Successful, Email has been sent to ${emailInfo.envelope.to}`,
      { user }
    );
  } catch (error) {
    console.log("Error sending email", error);
    return ApiSuccess.created(`Registration Successful`, {
      user,
    });
  }
}

export async function login(userData = {}) {
  const { email, password } = userData;
  const user = await findUserByEmail(email);
  await validatePassword(password, user.password);

  if (!user.isEmailVerified) {
    await emailService.sendOTPEmail(user.email, user.firstName);
    throw ApiError.forbidden(
      "Email Not Verified, please check your email for the OTP"
    );
  }

  const token = generateToken({
    userId: user._id,
    email: user.email,
    roles: user.roles,
  });

  user.password = undefined;

  return ApiSuccess.ok("Login Successful", {
    user,
    token,
  });
}

export async function getUser(userId) {
  const user = await findUserByIdOrEmail(userId);
  user.password = undefined;
  return ApiSuccess.ok("User Retrieved Successfully", {
    user,
  });
}

export async function sendOTP({ email }) {
  const user = await findUserByIdOrEmail(email);
  if (user.isVerified) {
    return ApiSuccess.ok("User Already Verified");
  }

  const emailInfo = await emailService.sendOTPEmail(user.email, user.firstName);
  return ApiSuccess.ok(`OTP has been sent to ${emailInfo.envelope.to}`);
}

export async function verifyOTP({ email, otp }) {
  const user = await findUserByEmail(email);
  if (user.isEmailVerified) {
    return ApiSuccess.ok("User Already Verified");
  }

  const otpExists = await OTP.findOne({ email, otp });
  if (!otpExists || otpExists.expiresAt < Date.now()) {
    throw ApiError.badRequest("Invalid or Expired OTP");
  }

  user.isEmailVerified = true;
  await user.save();
  return ApiSuccess.ok("Email Verified");
}

export async function forgotPassword({ email }) {
  const user = await findUserByIdOrEmail(email);
  const emailInfo = await emailService.sendOTPEmail(user.email, user.firstName);
  return ApiSuccess.ok(`OTP has been sent to ${emailInfo.envelope.to}`);
}

export async function resetPassword({ email, otp, password }) {
  const user = await findUserByEmail(email);
  const otpExists = await OTP.findOne({ email, otp });
  if (!otpExists) {
    throw ApiError.badRequest("Invalid or Expired OTP");
  }

  user.password = await hashPassword(password);
  await user.save();
  return ApiSuccess.ok("Password Updated");
}

// OAuth: Google
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function oauthGoogle({ idToken }) {
  if (!idToken) throw ApiError.badRequest("Google idToken is required");

  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
  } catch (e) {
    throw ApiError.unauthorized("Invalid Google token");
  }

  const payload = ticket.getPayload();
  const email = payload?.email;
  if (!email) throw ApiError.badRequest("Google account has no email");

  const providerId = payload.sub;
  const firstName = payload.given_name || "";
  const lastName = payload.family_name || "";
  const image = payload.picture;

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      email,
      firstName,
      lastName,
      image,
      provider: "google",
      providerId,
      isEmailVerified: true,
      // no password required for social accounts
    });
  } else {
    // Ensure provider fields are set; do not override existing password account policies
    if (!user.provider) {
      user.provider = "google";
      user.providerId = providerId;
    }
    if (!user.isEmailVerified) user.isEmailVerified = true;
    await user.save();
  }

  const token = generateToken({
    userId: user._id,
    email: user.email,
    roles: user.roles,
  });

  user.password = undefined;
  return ApiSuccess.ok("Login Successful", { user, token });
}

// OAuth: Facebook
export async function oauthFacebook({ accessToken }) {
  if (!accessToken) throw ApiError.badRequest("Facebook accessToken is required");

  // Fetch basic profile
  let profileRes;
  try {
    profileRes = await axios.get(
      `https://graph.facebook.com/me`,
      {
        params: {
          fields: "id,first_name,last_name,email,picture",
          access_token: accessToken,
        },
      }
    );
  } catch (e) {
    throw ApiError.unauthorized("Invalid Facebook token");
  }

  const data = profileRes.data || {};
  const email = data.email; // might be undefined if not granted
  const providerId = data.id;
  if (!providerId) throw ApiError.badRequest("Unable to fetch Facebook profile");

  // If email is missing, synthesize a stable email-like identifier to satisfy unique constraint
  const resolvedEmail = email || `${providerId}@facebook.local`; // internal-only
  const firstName = data.first_name || "";
  const lastName = data.last_name || "";
  const image = data.picture?.data?.url;

  let user = await User.findOne({ email: resolvedEmail });
  if (!user) {
    user = await User.create({
      email: resolvedEmail,
      firstName,
      lastName,
      image,
      provider: "facebook",
      providerId,
      isEmailVerified: Boolean(email),
    });
  } else {
    if (!user.provider) {
      user.provider = "facebook";
      user.providerId = providerId;
    }
    if (email && !user.isEmailVerified) user.isEmailVerified = true;
    await user.save();
  }

  const token = generateToken({
    userId: user._id,
    email: user.email,
    roles: user.roles,
  });

  user.password = undefined;
  return ApiSuccess.ok("Login Successful", { user, token });
}

const authService = {
  findUserByEmail,
  findUserByIdOrEmail,
  getUser,
  register,
  login,
  sendOTP,
  verifyOTP,
  forgotPassword,
  resetPassword,
  oauthGoogle,
  oauthFacebook,
};

export default authService;
