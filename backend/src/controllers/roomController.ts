import type { Request, Response } from "express";
import mongoose from "mongoose";
import Room from "../models/roomModel.js";
import type { IRoom } from "../models/roomModel.js";
import { io } from "../server.js";
import logger from "../utils/logger.js";

// Extend Express Request with userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

// ---------------------- Create Room ----------------------
export const createRoom = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const userId = req.userId;

    if (!name) return res.status(400).json({ message: "Room name is required" });
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const existingRoom = await Room.findOne({ name });
    if (existingRoom)
      return res.status(400).json({ message: "Room with this name already exists" });

    const room: IRoom = new Room({
      name,
      members: [userId],
      host: userId,
      isActive: true,
    });

    await room.save();

    io.emit("room-created", { roomId: room._id.toString(), name: room.name });
    logger.info(`Room created: ${room.name} by user ${userId}`);
    res.status(201).json(room);
  } catch (error: any) {
    console.error("Create room error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ---------------------- List Rooms ----------------------
export const listRooms = async (_req: Request, res: Response) => {
  try {
    const rooms = await Room.find({ isActive: true }).populate("members", "username email");
    res.json(rooms);
  } catch (error: any) {
    logger.error("List rooms error", { error });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ---------------------- Join Room ----------------------
export const joinRoom = async (req: Request, res: Response) => {
  try {
    const roomIdOrName = req.params.roomIdOrName;
    const userId = req.userId;

    if (!roomIdOrName)
      return res.status(400).json({ message: "Room name or ID is required" });
    if (!userId) return res.status(401).json({ message: "Unauthorized - Missing userId" });

    let room = await Room.findOne({ name: roomIdOrName });
    if (!room && mongoose.Types.ObjectId.isValid(roomIdOrName)) {
      room = await Room.findById(roomIdOrName);
    }

    if (!room) return res.status(404).json({ message: "Room not found" });

    const userObjId = new mongoose.Types.ObjectId(userId);
    if (!room.members.some(m => m.equals(userObjId))) {
      room.members.push(userObjId);
      await room.save();
    }

    const updatedRoom = await Room.findById(room._id).populate("members", "username email");

    const roomIdStr = room._id.toString();
    io.to(roomIdStr).emit("user-joined", { userId, roomId: roomIdStr });
    io.to(roomIdStr).emit("update-members", updatedRoom?.members || []);

    logger.info(`User ${userId} joined room ${roomIdStr}`);
    res.json(updatedRoom);
  } catch (error: any) {
    console.error("Join room error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ---------------------- Leave Room ----------------------
export const leaveRoom = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId;

    if (!roomId) return res.status(400).json({ message: "Missing room ID" });
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const wasMember = room.members.some(m => m.toString() === userId);
    if (!wasMember)
      return res.status(400).json({ message: "You are not a member of this room" });

    room.members = room.members.filter(m => m.toString() !== userId);
    await room.save();

    io.to(roomId).emit("user-left", { userId, roomId });
    const updatedRoom = await Room.findById(roomId).populate("members", "username email");
    io.to(roomId).emit("update-members", updatedRoom?.members || []);

    if (room.members.length === 0) {
      room.isActive = false;
      await room.save();
      io.to(roomId).emit("room-ended", { roomId, reason: "empty" });
      io.socketsLeave(roomId);
    }

    logger.info(`User ${userId} left room ${roomId}`);
    res.json({ message: "Left room successfully" });
  } catch (error: any) {
    console.error("Leave room error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ---------------------- End Room (Host Only) ----------------------
export const endRoom = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId;

    if (!roomId) return res.status(400).json({ message: "Missing room ID" });
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (room.host.toString() !== userId)
      return res.status(403).json({ message: "Only the host can end the room" });

    room.isActive = false;
    await room.save();

    io.to(roomId).emit("room-ended", { roomId, endedBy: userId });
    io.socketsLeave(roomId);

    logger.info(`Room ${roomId} ended by host ${userId}`);
    res.json({ message: "Room ended successfully" });
  } catch (error: any) {
    console.error("End room error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
