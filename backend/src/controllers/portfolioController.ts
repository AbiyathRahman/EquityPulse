import { Request, Response } from "express";
import prisma from "../services/prismaService.js";
import { getPreviousClose } from "../services/polygonService.js";
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

export const getHoldings = async (req: Request, res: Response) => {
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
        const holdings = await prisma.holding.findMany({
            where: {
                portfolioId
            },
            orderBy: {
                symbol: "asc"
            }
        });
        const enriched = (await Promise.all(holdings.map(async (holding) => {
            const previousClose = await getPreviousClose(holding.symbol).catch(() => null);
            if(!previousClose) return null;
            const currentValue = holding.quantity * previousClose.close;
            const gainLoss = (previousClose.close - holding.avgBuyPrice) * holding.quantity;
            return{
                ...holding,
                currentPrice: previousClose.close,
                currentValue,
                gainLoss
            };
        }))).filter((holding) => holding !== null);
        return res.status(200).json({portfolioId, portfolioName:portfolio.name, portfolioBalance: portfolio.balance, holdings: enriched});
    }catch(error){
        console.error(error);
        return res.status(500).json({error:"Internal server error"});
    }
};


export const getPortfolioHistory = async (req: Request, res: Response) => {
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
        const snapshots = await prisma.portfolioSnapshot.findMany({
            where: {
                portfolioId
            },
            orderBy: {
                createdAt: "asc"
            }
        });
        return res.status(200).json({snapshots});
    }catch(error){
        console.error(error);
        return res.status(500).json({error:"Internal server error"});
    }
}