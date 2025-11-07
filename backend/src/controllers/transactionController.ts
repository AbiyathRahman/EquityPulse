import {Request, Response} from "express";
import prisma from "../services/prismaService.js";

export const createTransaction = async (req: Request, res:Response) => {
    const {portfolioId, symbol, amount, type} = req.body;
    try{
        const transaction = await prisma.transaction.create({
            data:{
                portfolioId,
                symbol,
                amount,
                type,
            }
        });
        return res.status(201).json({message: "Transaction created successfully", transaction});
    }catch(error){
        console.error(error);
        return res.status(500).json({error:"Internal server error"});
    }
}

export const getTransactions = async (req: Request, res:Response) => {
    const portfolioId = Number(req.params.id);
    const userId = (req as any).userId;
    try{
        const portfolio = await prisma.portfolio.findFirst({
        where: { id: portfolioId, userId },
    });

    if (!portfolio) {
      return res.status(404).json({
        error: "Portfolio not found or does not belong to this user",
      });
    }
        const transactions = await prisma.transaction.findMany({
            where: {
                portfolioId
            }
        });
        return res.status(200).json({transactions});
    }catch(error){
        console.error(error);
        return res.status(500).json({error:"Internal server error"});
    }
}