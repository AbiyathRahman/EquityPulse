import { useCallback } from "react";
import { socket, connectSocket } from "../lib/socketClient";
import { usePortfolioStore } from "../stores/usePortfolioStore";

export const useLivePortfolioFeed = (portfolioId?: number | null) => {
  const { applyPortfolioUpdate, removeOrder, prependTransaction } =
    usePortfolioStore();

  const connect = useCallback(() => {
    if (!portfolioId) return;
    connectSocket();
    socket.emit("subscribe-portfolio", portfolioId);
    socket.on("portfolio-update", (payload) => {
      if (payload.portfolioId === portfolioId) {
        applyPortfolioUpdate(payload);
      }
    });
    socket.on("order-filled", (payload) => {
      if (payload.portfolioId === portfolioId) {
        removeOrder(payload.orderId);
        if (payload.transaction) {
          prependTransaction(payload.transaction);
        }
      }
    });
  }, [portfolioId, applyPortfolioUpdate, removeOrder, prependTransaction]);

  const disconnect = useCallback(() => {
    if (!portfolioId) return;
    socket.emit("unsubscribe-portfolio", portfolioId);
    socket.off("portfolio-update");
    socket.off("order-filled");
  }, [portfolioId]);

  return { connect, disconnect };
};
