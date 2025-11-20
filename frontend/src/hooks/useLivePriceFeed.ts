import { useEffect, useMemo } from "react";
import { socket, connectSocket } from "../lib/socketClient";
import { usePortfolioStore } from "../stores/usePortfolioStore";

export const useLivePriceFeed = (symbols: string[]) => {
  const { updateLivePrice } = usePortfolioStore();
  const normalizedSymbols = useMemo(
    () => symbols.map((symbol) => symbol.toUpperCase()),
    [symbols]
  );
  const symbolKey = normalizedSymbols.join(",");

  useEffect(() => {
    if (!normalizedSymbols.length) return;
    const subscriptionList = normalizedSymbols;
    connectSocket();
    socket.emit("subscribe", subscriptionList);
    const handler = (payload: { symbol: string; price: number; timeStamp: string }) => {
      if (subscriptionList.includes(payload.symbol.toUpperCase())) {
        updateLivePrice(payload.symbol, payload.price, payload.timeStamp);
      }
    };
    socket.on("price-update", handler);
    return () => {
      socket.emit("unsubscribe", subscriptionList);
      socket.off("price-update", handler);
    };
  }, [symbolKey, updateLivePrice]);
};
