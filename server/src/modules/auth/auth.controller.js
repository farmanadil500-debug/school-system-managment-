import { AuthService } from "./auth.service.js";
import { env } from "../../config/env.js";

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/api/v1/auth",
};

export class AuthController {
  static async login(req, res) {
    const { identifier, password } = req.body;
    const userAgent = req.headers["user-agent"] || "";
    const ip = req.ip || req.socket.remoteAddress || "";

    const { user, accessToken, refreshToken } = await AuthService.login({
      identifier,
      password,
      userAgent,
      ip,
    });

    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      data: {
        user,
        accessToken,
      },
    });
  }

  static async refresh(req, res) {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const userAgent = req.headers["user-agent"] || "";
    const ip = req.ip || req.socket.remoteAddress || "";

    const {
      user,
      accessToken,
      refreshToken: newRefreshToken,
    } = await AuthService.refreshTokens({
      refreshToken,
      userAgent,
      ip,
    });

    res.cookie("refreshToken", newRefreshToken, REFRESH_COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      data: {
        user,
        accessToken,
      },
    });
  }

  static async logout(req, res) {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    await AuthService.logout({ refreshToken });

    res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      data: {
        message: "Logged out successfully",
      },
    });
  }

  static async getMe(req, res) {
    const user = await AuthService.getCurrentUser(req.user.userId);

    res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  }

  static async changePassword(req, res) {
    const { currentPassword, newPassword } = req.body;
    const ip = req.ip || req.socket.remoteAddress || "";

    const result = await AuthService.changePassword({
      userId: req.user.userId,
      currentPassword,
      newPassword,
      ip,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  }
}
