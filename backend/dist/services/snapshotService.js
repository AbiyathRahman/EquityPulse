import prisma from "./prismaService.js";
import { getPreviousClose } from "./polygonService.js";
export const takeDailySnapshot = async () => {
    console.log('Running daily snapshot...');
    const portfolios = await prisma.portfolio.findMany({
        include: {
            Holding: true
        }
    });
    for (const portfolio of portfolios) {
        let totalHoldingValue = 0;
        for (const holdings of portfolio.Holding) {
            const prev = await getPreviousClose(holdings.symbol).catch(() => null);
            const price = prev?.close ?? holdings.avgBuyPrice;
            totalHoldingValue += holdings.quantity * price;
        }
        const totalPortfolioValue = portfolio.balance + totalHoldingValue;
        await prisma.portfolioSnapshot.create({
            data: {
                portfolioId: portfolio.id,
                totalValue: totalPortfolioValue
            }
        });
        console.log(`Daily Snapshot saved for Portfolio ${portfolio.id}: $${totalPortfolioValue.toFixed(2)}`);
    }
    console.log('Daily snapshot completed.');
};
//# sourceMappingURL=snapshotService.js.map