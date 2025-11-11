import {Request, Response} from "express";
import prisma from "../services/prismaService.js";

export const createTransaction = async (req: Request, res:Response) => {
    const {portfolioId, symbol, amount, type} = req.body;
    try{
        const portfolio = await prisma.portfolio.findFirst({
            where: {
                id: portfolioId,
                userId: (req as any).userId
            }
        });
        if(!portfolio){
            return res.status(404).json({error:"Portfolio not found"});
        }
        if(amount <= 0 || !symbol || !type){
            return res.status(400).json({error:"Invalid transaction details"});
        }
        if(!["buy", "sell"].includes(type)){
            return res.status(400).json({error:"Invalid transaction type"});
        }
        if(portfolio.balance < amount && type === "buy"){
            return res.status(400).json({error:"Insufficient balance"});
        }
        const [transaction, updatedBalance] = await prisma.$transaction([
            prisma.transaction.create({
                data: {
                    portfolioId,
                    symbol,
                    amount,
                    type
                }
            }),
            prisma.portfolio.update({
                where: {
                    id: portfolioId
                },
                data: {
                    balance: (type === "buy" ? portfolio.balance - amount : portfolio.balance + amount).toFixed(2)
                }
            })
        ])
        res.status(201).json({
      message: "Transaction successful",
      transaction,
      newBalance: updatedBalance,
    });
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
            },
            orderBy: {
                createdAt: "desc"
            }
        });
        return res.status(200).json({balance: portfolio.balance, transactions: transactions});
    }catch(error){
        console.error(error);
        return res.status(500).json({error:"Internal server error"});
    }
}