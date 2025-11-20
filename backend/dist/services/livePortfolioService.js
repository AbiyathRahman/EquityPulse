import prisma from "./prismaService.js";
import { io } from "../server.js";
import { getLastTrade } from "./polygonService.js";
export const updatedLivePortfolioValue = async (portfolioId) => {
    const portfolio = await prisma.portfolio.findFirst({ where: { id: portfolioId }, include: { Holding: true } });
    if (!portfolio)
        return;
    let holdingsValue = 0;
    for (const h of portfolio.Holding) {
        const live = await getLastTrade(h.symbol).catch(() => null);
        const price = live?.price ?? h.avgBuyPrice;
        holdingsValue += h.quantity * price;
    }
    const total = holdingsValue + portfolio.balance;
    const invested = portfolio.Holding.reduce((sum, h) => sum + h.avgBuyPrice * h.quantity, 0);
    const gainLoss = total - invested;
    const gainLossPercentage = invested > 0 ? (gainLoss / invested) * 100 : 0;
    io.to(`portfolio-${portfolioId}`).emit("portfolio-update", {
        portfolioId,
        totalValue: total,
        holdingsValue,
        gainLoss,
        gainLossPercentage,
        cashBalance: portfolio.balance,
    });
};
//# sourceMappingURL=livePortfolioService.js.map