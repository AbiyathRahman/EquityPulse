import { Request, Response } from "express";
import prisma from "../services/prismaService.js";

export const getSummary = async (req: Request, res: Response) => {
    const portfolioId = Number(req.params.id);
    const userId = (req as any).userId;
    try{
        const portfolio = await prisma.portfolio.findFirst({
            where: {
                id: portfolioId,
                userId
            }
        });
        if(!portfolio){
            return res.status(404).json({error:"Portfolio not found or does not belong to this user"});
        }
        const totalBuys = await prisma.transaction.count({
            where: {
                portfolioId,
                type: "buy"
            }
        });
        const totalBuysValue = await prisma.transaction.aggregate({
            where: {
                portfolioId,
                type: "buy"
            },
            _sum: {
                amount: true
            }
        });
        const totalSellsValue = await prisma.transaction.aggregate({
            where: {
                portfolioId,
                type: "sell"
            },
            _sum: {
                amount: true
            }
        })
        const totalSells = await prisma.transaction.count({
            where: {
                portfolioId,
                type: "sell"
            }
        });

        const totalBuysAmount = totalBuysValue._sum.amount ?? 0;
        const totalSellsAmount = totalSellsValue._sum.amount ?? 0;
        
        return res.status(200).json({
            totalBuys,
            totalSells,
            totalBuysValue: totalBuysAmount,
            totalSellsValue: totalSellsAmount,
            profitLoss: totalSellsAmount - totalBuysAmount
        });
    }catch(error){
        console.error(error);
        return res.status(500).json({error:"Internal server error"});
    }

};

