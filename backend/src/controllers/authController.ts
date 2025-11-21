import { Request, Response } from "express";
import prisma from "../services/prismaService.js";
const passwordPolicy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&])[A-Za-z\d@$!%*?#&]{8,}$/;
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET;

export const registerUser = async (req: Request, res:Response) => {
    const {email, name, password} = req.body;
    try{
        const existing = await prisma.user.findUnique({
            where: {
                email:email
            }
        });
        if(existing){
            return res.status(400).json({error:"User already exists"});
        }
        if(!passwordPolicy.test(password)){
            return res.status(400).json({error:"Password does not meet requirements"});
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                email: email,
                name: name,
                password: hashedPassword
            }
        });
        return res.status(201).json({
                message: "User created successfully",
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                },
                });

    }catch(error){
        console.error("registerUser failed:", error);
        return res.status(500).json({error:"Internal server error"});
    }

};

export const loginUser = async (req: Request, res:Response) => {
    const {email, password} = req.body;
    if(!email || !password){
        return res.status(400).json({error:"Email and password are required"});
    }
    try{
        const user = await prisma.user.findUnique({
            where: {
                email:email
            }
        });
        if(!user){
            return res.status(404).json({error:"User not found"});
        }
        const valid = await bcrypt.compare(password, user.password);
        if(!valid){
            return res.status(401).json({error:"Invalid credentials"});
        }
        const token = jwt.sign({userId:user.id}, JWT_SECRET as string, {expiresIn:"1h"});
        res.status(200).json({
            message: "Login successful",
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
            token: token,
        });
    }catch(error){
        console.error("loginUser failed:", error);
        return res.status(500).json({error:"Internal server error"});
    }
}

export const getCurrentUser = async (req: Request, res: Response) => {
    const userId = (req as any).userId as number | undefined;
    if(!userId){
        return res.status(401).json({error:"Unauthorized"});
    }
    try{
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
            }
        });
        if(!user){
            return res.status(404).json({error:"User not found"});
        }
        return res.status(200).json({
            user
        });
    }catch(error){
        return res.status(500).json({error:"Internal server error"});
    }
};

export const changePassword = async (req: Request, res: Response) => {
    const userId = (req as any).userId as number | undefined;
    const { currentPassword, newPassword } = req.body;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current and new password are required" });
    }
    if (!passwordPolicy.test(newPassword)) {
        return res.status(400).json({ error: "Password does not meet requirements" });
    }
    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid) {
            return res.status(401).json({ error: "Current password is incorrect" });
        }
        const hashed = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashed },
        });
        return res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
