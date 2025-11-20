import { Request, Response } from "express";
import prisma from "../services/prismaService.js";

export const updateUser = async (req: Request, res: Response) => {
  const userId = (req as any).userId as number | undefined;
  const { name, email } = req.body as { name?: string; email?: string };

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!name && !email) {
    return res.status(400).json({ error: "Nothing to update" });
  }

  try {
    if (email) {
      const existing = await prisma.user.findUnique({
        where: { email },
      });
      if (existing && existing.id !== userId) {
        return res.status(400).json({ error: "Email already in use" });
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name?.trim() || undefined,
        email: email?.trim() || undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    return res.status(200).json({ message: "Profile updated", user: updated });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
