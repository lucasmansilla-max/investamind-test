import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
}

interface MarketNews {
  id: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  source: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  category: string;
}

interface MarketIndices {
  name: string;
  symbol: string;
  value: number;
  change: number;
  changePercent: number;
}

// Demo market data - in production, this would come from a financial API
const demoMarketData: MarketData[] = [
  {
    symbol: "AAPL",
    price: 182.52,
    change: 2.45,
    changePercent: 1.36,
    volume: 45892000,
    marketCap: 2840000000000
  },
  {
    symbol: "MSFT", 
    price: 374.58,
    change: -1.23,
    changePercent: -0.33,
    volume: 23451000,
    marketCap: 2780000000000
  },
  {
    symbol: "GOOGL",
    price: 139.69,
    change: 3.21,
    changePercent: 2.35,
    volume: 18934000,
    marketCap: 1750000000000
  },
  {
    symbol: "TSLA",
    price: 248.42,
    change: -5.67,
    changePercent: -2.23,
    volume: 67234000,
    marketCap: 789000000000
  }
];

const demoMarketNews: MarketNews[] = [
  {
    id: "1",
    title: "Federal Reserve Signals Potential Rate Cut in Q2 2025",
    summary: "The Federal Reserve indicated a possible interest rate reduction in the second quarter, citing cooling inflation and stable employment data.",
    url: "#",
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    source: "Financial Times",
    sentiment: "positive",
    category: "Monetary Policy"
  },
  {
    id: "2", 
    title: "Tech Stocks Rally on AI Infrastructure Investments",
    summary: "Major technology companies announced significant investments in AI infrastructure, driving sector-wide gains in after-hours trading.",
    url: "#",
    publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    source: "Reuters",
    sentiment: "positive",
    category: "Technology"
  },
  {
    id: "3",
    title: "Energy Sector Volatility Continues Amid Geopolitical Tensions",
    summary: "Oil prices fluctuated throughout the session as investors weighed supply concerns against demand forecasts for the coming quarter.",
    url: "#",
    publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    source: "Bloomberg",
    sentiment: "neutral",
    category: "Energy"
  },
  {
    id: "4",
    title: "Healthcare Innovation Drives Biotech Sector Growth",
    summary: "Breakthrough medical research announcements sparked investor interest in biotechnology companies, with several stocks hitting 52-week highs.",
    url: "#",
    publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    source: "MarketWatch",
    sentiment: "positive",
    category: "Healthcare"
  }
];

const demoMarketIndices: MarketIndices[] = [
  {
    name: "S&P 500",
    symbol: "SPX",
    value: 4756.50,
    change: 28.45,
    changePercent: 0.60
  },
  {
    name: "NASDAQ",
    symbol: "IXIC", 
    value: 14834.23,
    change: 89.67,
    changePercent: 0.61
  },
  {
    name: "Dow Jones",
    symbol: "DJI",
    value: 37234.12,
    change: 156.78,
    changePercent: 0.42
  }
];

export function useMarketData() {
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const { data: marketData, isLoading: isLoadingMarket } = useQuery({
    queryKey: ["marketData", lastUpdate],
    queryFn: async () => {
      // Simulate small price changes for demo
      return demoMarketData.map(stock => ({
        ...stock,
        price: stock.price + (Math.random() - 0.5) * 2, // Random change ±$1
        change: stock.change + (Math.random() - 0.5) * 0.5,
        changePercent: stock.changePercent + (Math.random() - 0.5) * 0.2
      }));
    },
    staleTime: 30000,
    refetchInterval: 30000
  });

  const { data: marketNews, isLoading: isLoadingNews } = useQuery({
    queryKey: ["marketNews"],
    queryFn: async () => {
      return demoMarketNews;
    },
    staleTime: 300000, // 5 minutes
    refetchInterval: 300000
  });

  const { data: marketIndices, isLoading: isLoadingIndices } = useQuery({
    queryKey: ["marketIndices", lastUpdate],
    queryFn: async () => {
      // Simulate small index changes
      return demoMarketIndices.map(index => ({
        ...index,
        value: index.value + (Math.random() - 0.5) * 10,
        change: index.change + (Math.random() - 0.5) * 5,
        changePercent: index.changePercent + (Math.random() - 0.5) * 0.1
      }));
    },
    staleTime: 30000,
    refetchInterval: 30000
  });

  const getMarketSentiment = () => {
    if (!marketIndices || marketIndices.length === 0) return 'neutral';
    
    const positiveCount = marketIndices.filter(index => index.change > 0).length;
    const totalCount = marketIndices.length;
    
    if (positiveCount >= totalCount * 0.67) return 'bullish';
    if (positiveCount <= totalCount * 0.33) return 'bearish';
    return 'neutral';
  };

  return {
    marketData: marketData || [],
    marketNews: marketNews || [],
    marketIndices: marketIndices || [],
    marketSentiment: getMarketSentiment(),
    isLoading: isLoadingMarket || isLoadingNews || isLoadingIndices,
    lastUpdate
  };
}

export function useStockPrice(symbol: string) {
  const { marketData } = useMarketData();
  
  return marketData.find(stock => stock.symbol === symbol);
}

export function useMarketSentiment() {
  const { marketSentiment, marketIndices } = useMarketData();
  
  const getSentimentColor = () => {
    switch (marketSentiment) {
      case 'bullish': return 'text-green-600';
      case 'bearish': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };
  
  const getSentimentIcon = () => {
    switch (marketSentiment) {
      case 'bullish': return '📈';
      case 'bearish': return '📉'; 
      default: return '⚖️';
    }
  };

  return {
    sentiment: marketSentiment,
    color: getSentimentColor(),
    icon: getSentimentIcon(),
    indices: marketIndices
  };
}