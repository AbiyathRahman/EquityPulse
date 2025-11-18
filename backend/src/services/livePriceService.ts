import { io } from "../server.js";
import { getLastTrade } from "./polygonService.js";
import { updatedLivePortfolioValue } from "./livePortfolioService.js";
import prisma from "./prismaService.js";
import { checkAndExecuteOrderForSymbols } from "./orderEngineService.js";

const socketSubscriptions = new Map<string, Set<string>>();
const symbolSubscribers = new Map<string, Set<string>>();
const portfolioSubscriptions = new Map<string, Set<number>>();

export const handleSocketEvents = () => {
    io.on("connection", (socket) => {
        console.log("Client connected", socket.id);
        socket.on("subscribe", (symbols: string[]) => {
            if (!Array.isArray(symbols))
                return;
            const normalizedSymbols = symbols
                .map((symbol) => symbol?.toUpperCase()?.trim())
                .filter((symbol): symbol is string => Boolean(symbol));
            if (!normalizedSymbols.length)
                return;

            const socketSet = socketSubscriptions.get(socket.id) ?? new Set<string>();
            normalizedSymbols.forEach((symbol) => {
                socketSet.add(symbol);
                const subscribers = symbolSubscribers.get(symbol) ?? new Set<string>();
                subscribers.add(socket.id);
                symbolSubscribers.set(symbol, subscribers);
                console.log(`Socket ${socket.id} subscribed to ${symbol}`);
            });
            socketSubscriptions.set(socket.id, socketSet);
        });
        socket.on("unsubscribe", (symbols: string[]) => {
            if (!Array.isArray(symbols))
                return;
            const normalizedSymbols = symbols
                .map((symbol) => symbol?.toUpperCase()?.trim())
                .filter((symbol): symbol is string => Boolean(symbol));
            if (!normalizedSymbols.length)
                return;

            const socketSet = socketSubscriptions.get(socket.id);
            if (!socketSet)
                return;

            normalizedSymbols.forEach((symbol) => {
                socketSet.delete(symbol);
                const subscribers = symbolSubscribers.get(symbol);
                subscribers?.delete(socket.id);
                if (subscribers && subscribers.size === 0) {
                    symbolSubscribers.delete(symbol);
                }
                console.log(`Socket ${socket.id} unsubscribed from ${symbol}`);
            });

            if (socketSet.size === 0) {
                socketSubscriptions.delete(socket.id);
            } else {
                socketSubscriptions.set(socket.id, socketSet);
            }
        });
        socket.on("subscribe-portfolio", (portfolioId: number) => {
            if (typeof portfolioId !== "number")
                return;
            console.log(`Client ${socket.id} subscribed to portfolio ${portfolioId}`);
            socket.join(`portfolio-${portfolioId}`);
            const portfolios = portfolioSubscriptions.get(socket.id) ?? new Set<number>();
            portfolios.add(portfolioId);
            portfolioSubscriptions.set(socket.id, portfolios);
        });
        socket.on("unsubscribe-portfolio", (portfolioId: number) => {
            if (typeof portfolioId !== "number")
                return;
            console.log(`Client ${socket.id} unsubscribed from portfolio ${portfolioId}`);
            socket.leave(`portfolio-${portfolioId}`);
            const portfolios = portfolioSubscriptions.get(socket.id);
            portfolios?.delete(portfolioId);
            if (portfolios && portfolios.size === 0) {
                portfolioSubscriptions.delete(socket.id);
            }
        });
        
        socket.on("disconnect", () => {
            console.log("Client disconnected", socket.id);
            const socketSet = socketSubscriptions.get(socket.id);
            if (!socketSet)
                return;

            socketSet.forEach((symbol) => {
                const subscribers = symbolSubscribers.get(symbol);
                subscribers?.delete(socket.id);
                if (subscribers && subscribers.size === 0) {
                    symbolSubscribers.delete(symbol);
                }
            });

            socketSubscriptions.delete(socket.id);
            const portfolios = portfolioSubscriptions.get(socket.id);
            portfolios?.forEach((portfolioId) => socket.leave(`portfolio-${portfolioId}`));
            portfolioSubscriptions.delete(socket.id);
        });
    });
};

export const startPriceFeed = () => {
    let isFetching = false;
    setInterval(async () => {
        if (isFetching)
            return;
        if (symbolSubscribers.size === 0)
            return;

        isFetching = true;
        try {
            for (const [symbol, subscribers] of symbolSubscribers.entries()) {
                if (subscribers.size === 0)
                    continue;
                const priceData = await getLastTrade(symbol);
                if (priceData?.price) {
                    subscribers.forEach((socketId) => {
                        io.to(socketId).emit("price-update", {
                            symbol,
                            price: priceData.price,
                            timeStamp: priceData.timestamp,
                        });
                        
                    });
                    await checkAndExecuteOrderForSymbols(symbol, priceData.price);
                    const portfolios = await prisma.portfolio.findMany({
                        where: {
                            Holding:{
                                some:{
                                    symbol
                                }
                            }
                        },
                        select: {
                            id: true
                        }
                    });
                    await Promise.all(
                        portfolios.map((p) => updatedLivePortfolioValue(p.id))
                    );
                }

            }
        } catch (error) {
            console.error("Error emitting price updates", error);
        } finally {
            isFetching = false;
        }
    }, 3500);
};
