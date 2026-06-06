import type { Server as HttpServer } from "http";
import { Server, type Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "./env";
import type { UserRole } from "@prisma/client";

export type SocketAuth = { userId: string; role: UserRole; email: string };

let io: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(","),
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token =
        (socket.handshake.auth?.token as string | undefined) ||
        (socket.handshake.headers.authorization?.replace("Bearer ", "") as string | undefined);
      if (!token) {
        return next(new Error("Unauthorized"));
      }
      const payload = jwt.verify(token, env.JWT_SECRET) as SocketAuth & { sub: string };
      (socket as Socket & { user: SocketAuth }).user = {
        userId: payload.sub,
        role: payload.role,
        email: payload.email,
      };
      void socket.join(`user:${payload.sub}`);
      return next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket: Socket & { user?: SocketAuth }) => {
    socket.emit("connected", { userId: socket.user?.userId });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  try {
    getIO().to(`user:${userId}`).emit(event, payload);
  } catch {
    // IO not ready
  }
}

export function emitBroadcast(event: string, payload: unknown): void {
  try {
    getIO().emit(event, payload);
  } catch {
    // IO not ready
  }
}
