import { create } from "zustand";

export interface HoldingRow {
  symbol: string;
  quantity: number;
  avgCost: number;
  livePrice?: number;
  totalValue?: number;
  gainLoss?: number;
  gainLossPct?: number;
}

export interface TransactionRow {
  id: number;
  symbol: string;
  amount: number;
  type: string;
  priceAtExecution?: number;
  status?: string;
  createdAt: string;
}

export interface OrderRow {
  id: number;
  symbol: string;
  condition: string;
  triggerPrice: number;
  status: string;
}

export interface PortfolioAnalytics {
  totalValue: number;
  holdingsValue: number;
  gainLoss: number;
  gainLossPercentage: number;
  totalInvested: number;
  unrealizedGainLoss: number;
  cashBalance: number;
  dailyChangePct: number;
  riskScore?: number;
  lastUpdated?: string;
}

export interface PortfolioSummary {
  id: number;
  name: string;
  balance?: number;
  ownerName?: string | null;
  ownerEmail?: string | null;
}

interface IntradayPoint {
  timeStamp: string;
  totalValue: number;
}

interface PortfolioState {
  isLoading: boolean;
  error: string | null;
  portfolio: PortfolioSummary | null;
  portfolioList: PortfolioSummary[];
  analytics: PortfolioAnalytics | null;
  holdings: HoldingRow[];
  transactions: TransactionRow[];
  orders: OrderRow[];
  intradaySeries: IntradayPoint[];
  livePrices: Record<string, { price: number; timeStamp: string }>;
  setLoading: (value: boolean) => void;
  setError: (message: string | null) => void;
  setPortfolioList: (list: PortfolioSummary[]) => void;
  setPortfolio: (summary: PortfolioSummary | null) => void;
  setAnalytics: (data: PortfolioAnalytics | null) => void;
  setHoldings: (rows: HoldingRow[]) => void;
  setTransactions: (rows: TransactionRow[]) => void;
  setOrders: (rows: OrderRow[]) => void;
  setIntradaySeries: (points: IntradayPoint[]) => void;
  prependTransaction: (row: TransactionRow) => void;
  removeOrder: (orderId: number) => void;
  updateLivePrice: (symbol: string, price: number, timeStamp: string) => void;
  applyPortfolioUpdate: (payload: {
    totalValue: number;
    holdingsValue: number;
    gainLoss: number;
    gainLossPercentage: number;
    cashBalance?: number;
    totalInvested?: number;
    unrealizedGainLoss?: number;
    dailyChangePct?: number;
  }) => void;
}

export const usePortfolioStore = create<PortfolioState>((set) => ({
  isLoading: true,
  error: null,
  portfolio: null,
  portfolioList: [],
  analytics: null,
  holdings: [],
  transactions: [],
  orders: [],
  intradaySeries: [],
  livePrices: {},
  setLoading: (value) => set({ isLoading: value }),
  setError: (message) => set({ error: message }),
  setPortfolioList: (list) => set({ portfolioList: list }),
  setPortfolio: (summary) => set({ portfolio: summary }),
  setAnalytics: (data) =>
    set({
      analytics: data
        ? {
            ...data,
            lastUpdated: data.lastUpdated ?? new Date().toISOString(),
          }
        : null,
    }),
  setHoldings: (rows) => set({ holdings: rows }),
  setTransactions: (rows) => set({ transactions: rows }),
  setOrders: (rows) => set({ orders: rows }),
  setIntradaySeries: (points) => set({ intradaySeries: points }),
  prependTransaction: (row) =>
    set((state) => ({ transactions: [row, ...state.transactions].slice(0, 5) })),
  removeOrder: (orderId) =>
    set((state) => ({ orders: state.orders.filter((order) => order.id !== orderId) })),
  updateLivePrice: (symbol, price, timeStamp) =>
    set((state) => {
      const holdingIndex = state.holdings.findIndex(
        (holding) => holding.symbol.toUpperCase() === symbol.toUpperCase()
      );
      const updatedHoldings =
        holdingIndex === -1
          ? state.holdings
          : state.holdings.map((holding, index) =>
              index === holdingIndex
                ? {
                    ...holding,
                    livePrice: price,
                    totalValue: price * holding.quantity,
                    gainLoss: (price - holding.avgCost) * holding.quantity,
                    gainLossPct:
                      holding.avgCost === 0
                        ? 0
                        : ((price - holding.avgCost) / holding.avgCost) * 100,
                  }
                : holding
            );
      return {
        holdings: updatedHoldings,
        livePrices: {
          ...state.livePrices,
          [symbol]: { price, timeStamp },
        },
      };
    }),
  applyPortfolioUpdate: (payload) =>
    set((state) => ({
      analytics: state.analytics
        ? {
            ...state.analytics,
            totalValue: payload.totalValue,
            holdingsValue: payload.holdingsValue,
            gainLoss: payload.gainLoss,
            gainLossPercentage: payload.gainLossPercentage,
            cashBalance: payload.cashBalance ?? state.analytics.cashBalance,
            totalInvested: payload.totalInvested ?? state.analytics.totalInvested,
            unrealizedGainLoss:
              payload.unrealizedGainLoss ?? state.analytics.unrealizedGainLoss,
            dailyChangePct: payload.dailyChangePct ?? state.analytics.dailyChangePct,
            lastUpdated: new Date().toISOString(),
          }
        : null,
      intradaySeries: [
        ...state.intradaySeries,
        {
          timeStamp: new Date().toISOString(),
          totalValue: payload.totalValue,
        },
      ].slice(-390),
    })),
}));
