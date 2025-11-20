import prisma from "../services/prismaService.js";
import { executeTrade } from "../services/tradeService.js";
import { io } from "../server.js";
import { getLastTradeSafe, getPreviousClose } from "../services/polygonService.js";
export const placeOrder = async (req, res) => {
    const userId = req.userId;
    const { portfolioId, symbol, side, type, quantity, limitPrice, stopPrice, } = req.body;
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
        if (!["buy", "sell"].includes(side)) {
            return res.status(400).json({ error: "Invalid order side" });
        }
        if (!["market", "limit", "stop"].includes(type)) {
            return res.status(400).json({ error: "Invalid order type" });
        }
        if (!symbol || quantity <= 0) {
            return res.status(400).json({ error: "Invalid order details" });
        }
        if (type === "market") {
            const live = await getLastTradeSafe(symbol).catch(() => null);
            const fallback = await getPreviousClose(symbol).catch(() => null);
            const price = live?.price ?? live?.p ?? fallback?.close ?? null;
            if (!price) {
                return res.status(500).json({ error: "Failed to fetch live price" });
            }
            const order = await prisma.order.create({
                data: {
                    portfolioId,
                    symbol,
                    side,
                    type,
                    quantity,
                    priceAtExecution: price,
                    status: "filled",
                    executedAt: new Date()
                }
            });
            const tradeResult = await executeTrade({
                portfolioId,
                symbol,
                side,
                quantity,
                price
            });
            io.to(`portfolio-${portfolioId}`).emit("order-filled", {
                orderId: order.id,
                portfolioId,
                symbol,
                side,
                type,
                price,
                quantity,
                executedAt: order.executedAt,
            });
            return res.status(201).json({ message: "Order placed successfully", order, tradeResult });
        }
        if (type === "limit" && typeof limitPrice !== "number") {
            return res.status(400).json({ error: "Invalid limit price" });
        }
        const order = await prisma.order.create({
            data: {
                portfolioId,
                symbol,
                side,
                type,
                quantity,
                limitPrice,
                stopPrice,
                status: "pending",
            }
        });
        io.to(`portfolio-${portfolioId}`).emit("order-updated", order);
        return res.status(201).json({ message: "Order placed successfully", order });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
export const getPendingOrders = async (req, res) => {
    const portfolioId = Number(req.params.portfolioId ?? req.params.id);
    const userId = req.userId;
    if (Number.isNaN(portfolioId)) {
        return res.status(400).json({ error: "Invalid portfolio id" });
    }
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
        const orders = await prisma.order.findMany({
            where: {
                portfolioId,
                status: "pending"
            },
            orderBy: {
                createdAt: "desc"
            }
        });
        return res.status(200).json({ orders });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
export const cancelOrder = async (req, res) => {
    const orderId = Number(req.params.id);
    const userId = req.userId;
    if (Number.isNaN(orderId)) {
        return res.status(400).json({ error: "Invalid order id" });
    }
    try {
        const order = await prisma.order.findFirst({
            where: { id: orderId, status: "pending" },
            include: { portfolio: true },
        });
        if (!order || order.portfolio.userId !== userId) {
            return res.status(404).json({ error: "Order not found or not cancellable" });
        }
        const updated = await prisma.order.update({
            where: { id: orderId },
            data: { status: "cancelled" },
        });
        io.to(`portfolio-${order.portfolioId}`).emit("order-updated", updated);
        return res.status(200).json({ message: "Order cancelled", order: updated });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
export const getOrderHistory = async (req, res) => {
    const portfolioId = Number(req.params.portfolioId ?? req.params.id);
    const userId = req.userId;
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
        const orders = await prisma.order.findMany({
            where: {
                portfolioId,
                status: { in: ["filled", "cancelled"] },
            },
            orderBy: { executedAt: "desc" },
        });
        return res.status(200).json({ orders });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
//# sourceMappingURL=orderController.js.map