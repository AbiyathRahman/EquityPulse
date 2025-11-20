import { useCallback, useRef } from "react";
import { socket, connectSocket } from "../lib/socketClient";
import { usePortfolioStore } from "../stores/usePortfolioStore";

export const useLivePortfolioFeed = (portfolioId?: number | null) => {
  const applyPortfolioUpdate = usePortfolioStore(
    (state) => state.applyPortfolioUpdate
  );
  const removeOrder = usePortfolioStore((state) => state.removeOrder);
  const prependTransaction = usePortfolioStore(
    (state) => state.prependTransaction
  );
  const subscribedRef = useRef(false);

  const connect = useCallback(() => {
    if (!portfolioId) return;
    if (subscribedRef.current) return;
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
    subscribedRef.current = true;
  }, [portfolioId, applyPortfolioUpdate, removeOrder, prependTransaction]);

  const disconnect = useCallback(() => {
    if (!portfolioId) return;
    subscribedRef.current = false;
    socket.emit("unsubscribe-portfolio", portfolioId);
    socket.off("portfolio-update");
    socket.off("order-filled");
  }, [portfolioId]);

  return { connect, disconnect };
};
