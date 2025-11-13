import { io } from "../server.js";
import { getLastTrade } from "./polygonService.js";
const socketSubscriptions = new Map();
const symbolSubscribers = new Map();
export const handleSocketEvents = () => {
    io.on("connection", (socket) => {
        console.log("Client connected", socket.id);
        socket.on("subscribe", (symbols) => {
            if (!Array.isArray(symbols))
                return;
            const normalizedSymbols = symbols
                .map((symbol) => symbol?.toUpperCase()?.trim())
                .filter((symbol) => Boolean(symbol));
            if (!normalizedSymbols.length)
                return;
            const socketSet = socketSubscriptions.get(socket.id) ?? new Set();
            normalizedSymbols.forEach((symbol) => {
                socketSet.add(symbol);
                const subscribers = symbolSubscribers.get(symbol) ?? new Set();
                subscribers.add(socket.id);
                symbolSubscribers.set(symbol, subscribers);
                console.log(`Socket ${socket.id} subscribed to ${symbol}`);
            });
            socketSubscriptions.set(socket.id, socketSet);
        });
        socket.on("unsubscribe", (symbols) => {
            if (!Array.isArray(symbols))
                return;
            const normalizedSymbols = symbols
                .map((symbol) => symbol?.toUpperCase()?.trim())
                .filter((symbol) => Boolean(symbol));
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
            }
            else {
                socketSubscriptions.set(socket.id, socketSet);
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
                            timeStamp: priceData.timeStamp,
                        });
                    });
                }
            }
        }
        catch (error) {
            console.error("Error emitting price updates", error);
        }
        finally {
            isFetching = false;
        }
    }, 3500);
};
//# sourceMappingURL=livePriceService.js.map