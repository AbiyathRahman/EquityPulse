import prisma from "./prismaService.js";
import { getLastTrade } from "./polygonService.js";

export type TradeSide = "buy" | "sell";

interface ExecuteTradeInput {
  portfolioId: number;
  symbol: string;
  side: TradeSide;
  quantity: number; // shares
  price?: number;   // optional: if not provided, we fetch live price
}

export const executeTrade = async ({
  portfolioId,
  symbol,
  side,
  quantity,
  price,
}: ExecuteTradeInput) => {
  // 1) Fetch portfolio + holdings
  const portfolio = await prisma.portfolio.findUnique({
    where: { id: portfolioId },
    include: { Holding: true },
  });

  if (!portfolio) {
    throw new Error("Portfolio not found");
  }

  // 2) Get live price if not provided
  let tradePrice = price;
  if (!tradePrice) {
    const live = await getLastTrade(symbol);
    if (!live?.price) throw new Error("Failed to fetch live price");
    tradePrice = live.price;
  }

  const totalCost = quantity * (tradePrice??0);

  // 3) Validate balance / holdings
  if (side === "buy" && portfolio.balance < totalCost) {
    throw new Error("Insufficient balance");
  }

  const existingHolding = portfolio.Holding.find(
    (h) => h.symbol === symbol
  );

  if (side === "sell") {
    if (!existingHolding || existingHolding.quantity < quantity) {
      throw new Error("Not enough shares to sell");
    }
  }

  // 4) Apply updates atomically
  const result = await prisma.$transaction(async (tx) => {
    // 4a) Create transaction
    const transaction = await tx.transaction.create({
      data: {
        portfolioId,
        symbol,
        amount: quantity,      // you're currently using `amount` as quantity
        type: side,
        priceAtExecution: tradePrice, // you added this field earlier
      },
    });

    // 4b) Update portfolio balance
    const newBalance =
      side === "buy"
        ? portfolio.balance - totalCost
        : portfolio.balance + totalCost;

    const updatedPortfolio = await tx.portfolio.update({
      where: { id: portfolioId },
      data: { balance: Math.round((newBalance + Number.EPSILON) * 100) / 100 },
    });

    // 4c) Update holdings
    if (side === "buy") {
      if (existingHolding) {
        const totalCostBefore =
          existingHolding.quantity * existingHolding.avgBuyPrice;
        const totalCostAfter = totalCostBefore + totalCost;
        const totalQtyAfter = existingHolding.quantity + quantity;

        await tx.holding.update({
          where: { id: existingHolding.id },
          data: {
            quantity: totalQtyAfter,
            avgBuyPrice: totalCostAfter / totalQtyAfter,
          },
        });
      } else {
        await tx.holding.create({
          data: {
            portfolioId,
            symbol,
            quantity,
            avgBuyPrice: tradePrice,
          },
        });
      }
    } else if (side === "sell" && existingHolding) {
      const updatedQty = existingHolding.quantity - quantity;
      if (updatedQty <= 0) {
        await tx.holding.delete({
          where: { id: existingHolding.id },
        });
      } else {
        await tx.holding.update({
          where: { id: existingHolding.id },
          data: { quantity: updatedQty },
        });
      }
    }

    return { transaction, updatedPortfolio };
  });

  return { ...result, priceAtExecution: tradePrice };
};
