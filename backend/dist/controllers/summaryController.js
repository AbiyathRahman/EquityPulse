import prisma from "../services/prismaService.js";
export const getSummary = async (req, res) => {
    const portfolioId = Number(req.params.id);
    const userId = req.userId;
    try {
        const portfolio = await prisma.portfolio.findFirst({
            where: {
                id: portfolioId,
                userId
            }
        });
        if (!portfolio) {
            return res.status(404).json({ error: "Portfolio not found or does not belong to this user" });
        }
        const [transactionsForTotals, recentTransactions] = await prisma.$transaction([
            prisma.transaction.findMany({
                where: { portfolioId },
                select: {
                    type: true,
                    amount: true,
                    priceAtExecution: true
                }
            }),
            prisma.transaction.findMany({
                where: { portfolioId },
                orderBy: { createdAt: "desc" },
                take: 5,
            }),
        ]);
        let totalBuys = 0;
        let totalSells = 0;
        let totalBuysValue = 0;
        let totalSellsValue = 0;
        transactionsForTotals.forEach((transaction) => {
            const price = transaction.priceAtExecution ?? 0;
            const transactionValue = (transaction.amount ?? 0) * price;
            if (transaction.type === "buy") {
                totalBuys += 1;
                totalBuysValue += transactionValue;
            }
            else if (transaction.type === "sell") {
                totalSells += 1;
                totalSellsValue += transactionValue;
            }
        });
        const roundToCents = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
        totalBuysValue = roundToCents(totalBuysValue);
        totalSellsValue = roundToCents(totalSellsValue);
        const profitLoss = roundToCents(totalSellsValue - totalBuysValue);
        return res.status(200).json({
            portfolioId,
            portfolioName: portfolio.name,
            balance: portfolio.balance,
            totalBuys,
            totalSells,
            totalBuysValue: totalBuysValue,
            totalSellsValue: totalSellsValue,
            profitLoss,
            recentTransactions
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
//# sourceMappingURL=summaryController.js.map