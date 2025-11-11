import prisma from "../services/prismaService.js";
import { getPreviousClose } from "../services/polygonService.js";
export const getAnalytics = async (req, res) => {
    const portfolioId = Number(req.params.id);
    const userId = req.userId;
    try {
        const portfolio = await prisma.portfolio.findFirst({
            where: {
                id: portfolioId,
                userId
            },
            include: {
                Holding: true
            }
        });
        if (!portfolio) {
            return res.status(404).json({ error: "Portfolio not found or does not belong to this user" });
        }
        const holdings = portfolio.Holding;
        if (holdings.length === 0) {
            return res.status(404).json({ error: "No holdings found for this portfolio" });
        }
        let totalInvested = 0;
        let totalCurrentValue = 0;
        const enriched = await Promise.all(holdings.map(async (holding) => {
            const data = await getPreviousClose(holding.symbol).catch(() => null);
            const currentPrice = data?.close ?? holding.avgBuyPrice;
            const investedValue = holding.quantity * holding.avgBuyPrice;
            const currentValue = holding.quantity * currentPrice;
            const gainLoss = currentValue - investedValue;
            const gainLossPercent = (gainLoss / investedValue) * 100;
            totalInvested += investedValue;
            totalCurrentValue += currentValue;
            return {
                symbol: holding.symbol,
                quantity: holding.quantity,
                avgBuyPrice: holding.avgBuyPrice.toFixed(2),
                currentPrice: currentPrice.toFixed(2),
                investedValue: investedValue.toFixed(2),
                currentValue: currentValue.toFixed(2),
                gainLoss: gainLoss.toFixed(2),
                gainLossPercent: gainLossPercent.toFixed(2)
            };
        }));
        const netProfitLoss = totalCurrentValue - totalInvested;
        const netProfitLossPercent = (netProfitLoss / totalInvested) * 100;
        const topPerformers = enriched.sort((a, b) => parseFloat(b.gainLoss) - parseFloat(a.gainLoss)).slice(0, 3);
        return res.status(200).json({
            portfolioId: portfolio.id,
            portfolioName: portfolio.name,
            totalInvested: totalInvested.toFixed(2),
            currentValue: totalCurrentValue.toFixed(2),
            netProfitLoss: netProfitLoss.toFixed(2),
            netProfitLossPercent: netProfitLossPercent.toFixed(2),
            topPerformers,
            holdings: enriched,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
//# sourceMappingURL=analyticsController.js.map