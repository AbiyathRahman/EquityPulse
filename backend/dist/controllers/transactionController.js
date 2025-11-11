import prisma from "../services/prismaService.js";
import { getPreviousClose } from "../services/polygonService.js";
export const createTransaction = async (req, res) => {
    const { portfolioId, symbol, amount, type } = req.body;
    try {
        const portfolio = await prisma.portfolio.findFirst({
            where: {
                id: portfolioId,
                userId: req.userId
            }
        });
        if (!portfolio) {
            return res.status(404).json({ error: "Portfolio not found" });
        }
        if (amount <= 0 || !symbol || !type) {
            return res.status(400).json({ error: "Invalid transaction details" });
        }
        if (!["buy", "sell"].includes(type)) {
            return res.status(400).json({ error: "Invalid transaction type" });
        }
        if (portfolio.balance < amount && type === "buy") {
            return res.status(400).json({ error: "Insufficient balance" });
        }
        const currentPrice = (await getPreviousClose(symbol) ?? { close: 0 }).close;
        const updatedBalanceValue = type === "buy" ? portfolio.balance - (amount * currentPrice) : portfolio.balance + (amount * currentPrice);
        const roundedBalance = Math.round((updatedBalanceValue + Number.EPSILON) * 100) / 100;
        const [transaction, updatedBalance] = await prisma.$transaction([
            prisma.transaction.create({
                data: {
                    portfolioId,
                    symbol,
                    amount,
                    type,
                    priceAtExecution: currentPrice
                }
            }),
            prisma.portfolio.update({
                where: {
                    id: portfolioId
                },
                data: {
                    balance: roundedBalance
                }
            })
        ]);
        if (type === "buy") {
            const existingHolding = await prisma.holding.findFirst({
                where: {
                    portfolioId,
                    symbol
                }
            });
            if (existingHolding) {
                const totalCostBefore = existingHolding.quantity * existingHolding.avgBuyPrice;
                const totalCostAfter = totalCostBefore + amount * currentPrice;
                const totalQuantityAfter = existingHolding.quantity + amount;
                await prisma.holding.update({
                    where: {
                        id: existingHolding.id
                    },
                    data: {
                        quantity: totalQuantityAfter,
                        avgBuyPrice: totalCostAfter / totalQuantityAfter
                    }
                });
            }
            else {
                await prisma.holding.create({
                    data: {
                        portfolioId,
                        symbol,
                        quantity: amount,
                        avgBuyPrice: currentPrice,
                        createdAt: new Date()
                    }
                });
            }
        }
        ;
        if (type === "sell") {
            const existingHolding = await prisma.holding.findFirst({
                where: {
                    portfolioId,
                    symbol
                }
            });
            if (existingHolding) {
                const updatedQuantity = existingHolding.quantity - amount;
                if (updatedQuantity <= 0) {
                    await prisma.holding.delete({
                        where: {
                            id: existingHolding.id
                        }
                    });
                }
                else {
                    await prisma.holding.update({
                        where: {
                            id: existingHolding.id
                        },
                        data: {
                            quantity: updatedQuantity
                        }
                    });
                }
            }
        }
        return res.status(201).json({
            message: "Transaction successful",
            transaction,
            newBalance: updatedBalance,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
export const getTransactions = async (req, res) => {
    const portfolioId = Number(req.params.id);
    const userId = req.userId;
    try {
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
        return res.status(200).json({ balance: portfolio.balance, transactions: transactions });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
//# sourceMappingURL=transactionController.js.map