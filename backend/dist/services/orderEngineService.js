import prisma from "./prismaService.js";
import { executeTrade } from "./tradeService.js";
export const checkAndExecuteOrderForSymbols = async (symbol, currentPrice) => {
    const pendingOrders = await prisma.order.findMany({
        where: {
            symbol,
            status: "pending"
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
            const trade = await executeTrade({
                portfolioId: order.portfolioId,
                symbol: order.symbol,
                side: order.side,
                quantity: order.quantity,
                price: order.limitPrice ?? order.stopPrice ?? undefined,
            });
            await prisma.order.update({
                where: { id: order.id },
                data: {
                    status: "filled",
                    priceAtExecution: currentPrice,
                    executedAt: new Date(),
                },
            });
            console.log(`✅ Executed ${order.type} ${order.side} order ${order.id} at $${currentPrice}`);
        }
        catch (err) {
            console.log(`❌ Failed to execute ${order.type} ${order.side} order ${order.id} at $${currentPrice}`);
        }
    }
};
//# sourceMappingURL=orderEngineService.js.map