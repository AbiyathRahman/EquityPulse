import { Request, Response } from "express";
import prisma from "../services/prismaService.js";
import { getPreviousClose } from "../services/polygonService.js";
export const getAnalytics = async (req: Request, res: Response) => {
    const portfolioId = Number(req.params.id);
    const userId = (req as any).userId;
    try{
        const portfolio = await prisma.portfolio.findFirst({
            where: {
                id: portfolioId,
                userId
            },
            include:{
                Holding: true
            }
        });
        if(!portfolio){
            return res.status(404).json({error:"Portfolio not found or does not belong to this user"});
        }
        const holdings = portfolio.Holding;
        if(holdings.length === 0){
            return res.status(200).json({
                portfolioId: portfolio.id,
                totalValue: portfolio.balance,
                holdingsValue: 0,
                gainLoss: 0,
                gainLossPercentage: 0,
                totalInvested: 0,
                unrealizedGainLoss: 0,
                cashBalance: portfolio.balance,
                dailyChangePct: 0,
                riskScore: 50,
                lastUpdated: new Date().toISOString()
            });
        }
        let totalInvested = 0;
        let holdingsValue = 0;

        await Promise.all(holdings.map(async (holding) => {
            const data = await getPreviousClose(holding.symbol).catch(() => null);
            const currentPrice = Number(data?.close ?? holding.avgBuyPrice);
            const investedValue = holding.quantity * holding.avgBuyPrice;
            const currentValue = holding.quantity * currentPrice;
            totalInvested += investedValue;
            holdingsValue += currentValue;
        }));

        const gainLoss = holdingsValue - totalInvested;
        const gainLossPercentage = totalInvested === 0 ? 0 : (gainLoss / totalInvested) * 100;
        const totalValue = holdingsValue + portfolio.balance;

        return res.status(200).json({
            portfolioId: portfolio.id,
            portfolioName: portfolio.name,
            totalValue,
            holdingsValue,
            gainLoss,
            gainLossPercentage,
            totalInvested,
            unrealizedGainLoss: gainLoss,
            cashBalance: portfolio.balance,
            dailyChangePct: gainLossPercentage,
            riskScore: 50,
            lastUpdated: new Date().toISOString(),
        });
    }catch(error){
        console.error(error);
        return res.status(500).json({error:"Internal server error"});
        
    }
};
