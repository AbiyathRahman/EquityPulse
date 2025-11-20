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

export const getPortfolioById = async (req: Request, res: Response) => {
    const portfolioId = Number(req.params.id);
    const userId = (req as any).userId;
    if(Number.isNaN(portfolioId)){
        return res.status(400).json({error:"Invalid portfolio id"});
    }
    try{
        const portfolio = await prisma.portfolio.findFirst({
            where: {
                id: portfolioId,
                userId
            },
            include:{
                user:{
                    select:{
                        name: true,
                        email: true
                    }
                }
            }
        });
        if(!portfolio){
            return res.status(404).json({error:"Portfolio not found or does not belong to this user"});
        }
        return res.status(200).json({
            id: portfolio.id,
            name: portfolio.name,
            balance: portfolio.balance,
            ownerName: portfolio.user?.name ?? null,
            ownerEmail: portfolio.user?.email ?? null,
            createdAt: portfolio.createdAt,
        });
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
        const enriched = await Promise.all(
            holdings.map(async (holding) => {
                const previousClose = await getPreviousClose(holding.symbol).catch(() => null);
                const livePrice = Number(previousClose?.close ?? holding.avgBuyPrice);
                const totalValue = livePrice * holding.quantity;
                const investedValue = holding.avgBuyPrice * holding.quantity;
                const gainLoss = totalValue - investedValue;
                const gainLossPct = investedValue === 0 ? 0 : (gainLoss / investedValue) * 100;
                return{
                    symbol: holding.symbol,
                    quantity: holding.quantity,
                    avgCost: holding.avgBuyPrice,
                    livePrice,
                    totalValue,
                    gainLoss,
                    gainLossPct,
                };
            })
        );
        return res.status(200).json({
            portfolioId,
            portfolioName: portfolio.name,
            balance: portfolio.balance,
            holdings: enriched,
        });
    }catch(error){
        console.error(error);
        return res.status(500).json({error:"Internal server error"});
    }
};


export const getPortfolioHistory = async (req: Request, res: Response) => {
    const portfolioId = Number(req.params.id);
    const userId = (req as any).userId;
    const { range } = req.query;
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
        let filtered = snapshots;
        if(range && typeof range === "string" && range.toUpperCase() !== "MAX"){
            const now = new Date();
            let start: Date | null = null;
            const upper = range.toUpperCase();
            if(upper === "1D"){
                start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            }else if(upper === "1W"){
                start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            }else if(upper === "1M"){
                start = new Date(now);
                start.setMonth(start.getMonth() - 1);
            }else if(upper === "6M"){
                start = new Date(now);
                start.setMonth(start.getMonth() - 6);
            }else if(upper === "1Y"){
                start = new Date(now);
                start.setFullYear(start.getFullYear() - 1);
            }
            if(start){
                filtered = snapshots.filter((snapshot) => snapshot.createdAt >= start!);
            }
        }
        const points = filtered.map((snapshot) => ({
            timeStamp: snapshot.createdAt.toISOString(),
            totalValue: snapshot.totalValue,
        }));
        return res.status(200).json({points});
    }catch(error){
        console.error(error);
        return res.status(500).json({error:"Internal server error"});
    }
};

export const updatePortfolioName = async (req: Request, res: Response) => {
    const portfolioId = Number(req.params.id);
    const userId = (req as any).userId;
    const { name } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ error: "Portfolio name is required" });
    }
    if (Number.isNaN(portfolioId)) {
        return res.status(400).json({ error: "Invalid portfolio id" });
    }
    try {
        const portfolio = await prisma.portfolio.findFirst({
            where: { id: portfolioId, userId },
        });
        if (!portfolio) {
            return res.status(404).json({ error: "Portfolio not found or does not belong to this user" });
        }
        const updated = await prisma.portfolio.update({
            where: { id: portfolioId },
            data: { name: name.trim() },
        });
        return res.status(200).json({ message: "Portfolio renamed successfully", portfolio: updated });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const deletePortfolio = async (req: Request, res: Response) => {
    const portfolioId = Number(req.params.id);
    const userId = (req as any).userId;
    if (Number.isNaN(portfolioId)) {
        return res.status(400).json({ error: "Invalid portfolio id" });
    }
    try {
        const portfolio = await prisma.portfolio.findFirst({
            where: { id: portfolioId, userId },
            include: { Holding: true },
        });
        if (!portfolio) {
            return res.status(404).json({ error: "Portfolio not found or does not belong to this user" });
        }
        if (portfolio.Holding.length > 0) {
            return res.status(400).json({
                error: "This portfolio still contains holdings. Sell assets before deleting.",
                holdingsCount: portfolio.Holding.length,
            });
        }

        await prisma.$transaction([
            prisma.order.deleteMany({ where: { portfolioId } }),
            prisma.transaction.deleteMany({ where: { portfolioId } }),
            prisma.portfolioSnapshot.deleteMany({ where: { portfolioId } }),
            prisma.portfolio.delete({ where: { id: portfolioId } }),
        ]);

        return res.status(200).json({ message: "Portfolio deleted successfully" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
