import { useEffect } from "react";
import { getJson } from "../utils/api";
import { usePortfolioStore } from "../stores/usePortfolioStore";
import type {
  HoldingRow,
  PortfolioAnalytics,
  PortfolioSummary,
  TransactionRow,
} from "../stores/usePortfolioStore";
import {
  getDefaultPortfolioId,
  setDefaultPortfolioId,
} from "../utils/portfolioPrefs";

type PortfolioListResponse = {
  portfolios: Array<{
    id: number;
    name: string;
    balance: number;
    createdAt?: string;
  }>;
};

type HoldingsResponse = {
  holdings: HoldingRow[];
};

type TransactionsResponse = {
  transactions: TransactionRow[];
};

type HistoryResponse = {
  points?: { timeStamp: string; totalValue: number }[];
  snapshots?: { createdAt: string; totalValue: number }[];
};

type PortfolioDetailResponse = {
  id: number;
  name: string;
  balance: number;
  ownerName?: string | null;
  ownerEmail?: string | null;
  createdAt?: string;
};

export const usePortfolioData = (preferredPortfolioId?: number | null) => {
  useEffect(() => {
    const {
      setLoading,
      setError,
      setPortfolioList,
      setPortfolio,
      setAnalytics,
      setHoldings,
      setTransactions,
      setOrders,
      setIntradaySeries,
    } = usePortfolioStore.getState();

    let ignore = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const listResponse = await getJson<PortfolioListResponse>(
          "/portfolio/get"
        );
        if (ignore) return;
        const portfolios = listResponse.portfolios ?? [];
        const summaries: PortfolioSummary[] = portfolios.map((item) => ({
          id: item.id,
          name: item.name,
          balance: item.balance,
          ownerName: null,
          ownerEmail: null,
        }));
        setPortfolioList(summaries);

        const preferredId =
          preferredPortfolioId ??
          getDefaultPortfolioId() ??
          undefined;
        const active =
          (preferredId
            ? portfolios.find((p) => p.id === preferredId)
            : undefined) ?? portfolios[0];

        if (!active) {
          setPortfolio(null);
          setAnalytics(null);
          setHoldings([]);
          setTransactions([]);
          setOrders([]);
          setIntradaySeries([]);
          setError(null);
          setLoading(false);
          return;
        }

        const portfolioId = active.id;
        setDefaultPortfolioId(portfolioId);
        const [
          analyticsRes,
          holdingsRes,
          transactionsRes,
          intradayRes,
          portfolioDetail,
        ] = await Promise.all([
          getJson<PortfolioAnalytics>(`/analytics/get/${portfolioId}`),
          getJson<HoldingsResponse>(`/portfolio/holdings/${portfolioId}`),
          getJson<TransactionsResponse>(`/transaction/get/${portfolioId}`),
          getJson<HistoryResponse>(`/portfolio/history/${portfolioId}`),
          getJson<PortfolioDetailResponse>(`/portfolio/${portfolioId}`),
        ]);
        if (ignore) return;
        const portfolioSummary: PortfolioSummary = {
          id: active.id,
          name: active.name,
          balance: active.balance,
          ownerName: portfolioDetail?.ownerName ?? null,
          ownerEmail: portfolioDetail?.ownerEmail ?? null,
        };
        setPortfolio(portfolioSummary);
        setAnalytics(
          analyticsRes
            ? {
                ...analyticsRes,
                lastUpdated:
                  analyticsRes.lastUpdated ?? new Date().toISOString(),
              }
            : null
        );
        setHoldings(holdingsRes.holdings ?? []);
        setTransactions(
          transactionsRes.transactions?.slice(0, 5) ?? []
        );
        setOrders([]); // No backend endpoint for open orders yet
        const historyPoints =
          intradayRes.points ??
          intradayRes.snapshots?.map((snapshot) => ({
            timeStamp: snapshot.createdAt,
            totalValue: snapshot.totalValue,
          })) ??
          [];
        setIntradaySeries(historyPoints);
        setError(null);
      } catch (error) {
        if (!ignore) {
          setError(
            error instanceof Error
              ? error.message
              : "Unable to load portfolio data"
          );
          setPortfolio(null);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchData();
    return () => {
      ignore = true;
    };
  }, [preferredPortfolioId]);
};
