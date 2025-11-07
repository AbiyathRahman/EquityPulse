import { Request, Response } from "express";
import prisma from "../services/prismaService.js";

export const createPortfolio = async (req: Request, res: Response) => {
    const {name, balance = 0} = req.body;
    const userId = (req as any).userId;
    try{
        const portfolio = await prisma.portfolio.create({
            data: {
                name,
                balance,
                userId
            }
        });
        return res.status(201).json({message: "Portfolio created successfully", portfolio});
    }catch(error){
        console.error(error);
        return res.status(500).json({error:"Internal server error"});
    }
};

export const getPortfolios = async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    try{
        const portfolios = await prisma.portfolio.findMany({
            where: {
                userId
            }
        });
        return res.status(200).json({portfolios});
    }catch(error){
        console.error(error);
        return res.status(500).json({error:"Internal server error"});
    }
};
