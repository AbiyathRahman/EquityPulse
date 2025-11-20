import prisma from "./prismaService.js";
import { executeTrade } from "./tradeService.js";
import { io } from "../server.js";
export const checkAndExecuteOrderForSymbols = async (symbol, currentPrice) => {
    const pendingOrders = await prisma.order.findMany({
        where: {
            symbol,
            status: "pending",
        },
    });
    for (const order of pendingOrders) {
        let shouldExecute = false;
        if (order.type === "limit") {
            if (order.side === "buy" && order.limitPrice !== null) {
                shouldExecute = currentPrice <= order.limitPrice;
            }
            if (order.side === "sell" && order.limitPrice !== null) {
                shouldExecute = currentPrice >= order.limitPrice;
            }
        }
        if (order.type === "stop") {
            if (order.side === "sell" && order.stopPrice !== null) {
                shouldExecute = currentPrice <= order.stopPrice;
            }
        }
        if (!shouldExecute)
            continue;
        try {
            await executeTrade({
                portfolioId: order.portfolioId,
                symbol: order.symbol,
                side: order.side,
                quantity: order.quantity,
                price: order.limitPrice ?? order.stopPrice ?? undefined,
            });
            const updated = await prisma.order.update({
                where: { id: order.id },
                data: {
                    status: "filled",
                    priceAtExecution: currentPrice,
                    executedAt: new Date(),
                },
            });
            io.to(`portfolio-${order.portfolioId}`).emit("order-filled", {
                orderId: order.id,
                portfolioId: order.portfolioId,
                symbol: order.symbol,
                side: order.side,
                type: order.type,
                price: currentPrice,
                quantity: order.quantity,
                executedAt: updated.executedAt,
            });
        }
        catch (err) {
            console.error(`Failed to execute ${order.type} ${order.side} order ${order.id} at $${currentPrice}`, err);
        }
    }
};
//# sourceMappingURL=orderEngineService.js.map