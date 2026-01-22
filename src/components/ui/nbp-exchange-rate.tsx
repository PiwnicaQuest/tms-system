"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, AlertCircle, TrendingUp, Info } from "lucide-react";

interface NbpRateData {
  currency: string;
  code: string;
  rate: number;
  date: string;
  table: string;
  tableNumber: string;
}

interface NbpExchangeRateProps {
  currency: string;
  amount: number;
  saleDate?: string;
  issueDate?: string;
  onRateChange?: (rateData: {
    rate: number;
    date: string;
    table: string;
    amountInPLN: number;
  } | null) => void;
}

// Format amount helper
const formatAmount = (value: number, currency: string = "PLN") => {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Format rate with 4 decimal places
const formatRate = (rate: number) => {
  return new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(rate);
};

/**
 * Calculate the default rate date based on sale date or issue date
 * According to Polish VAT regulations, the rate should be from the last business day
 * before the tax obligation date (usually sale date or issue date)
 */
function getDefaultRateDate(saleDate?: string, issueDate?: string): string {
  // Use sale date if available, otherwise use issue date
  const baseDate = saleDate || issueDate;
  
  if (!baseDate) {
    // Default to yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split("T")[0];
  }
  
  // Go back one day from the base date
  const date = new Date(baseDate);
  date.setDate(date.getDate() - 1);
  
  return date.toISOString().split("T")[0];
}

export function NbpExchangeRate({
  currency,
  amount,
  saleDate,
  issueDate,
  onRateChange,
}: NbpExchangeRateProps) {
  const [rateDate, setRateDate] = useState<string>(
    getDefaultRateDate(saleDate, issueDate)
  );
  const [rateData, setRateData] = useState<NbpRateData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update rate date when sale date or issue date changes
  useEffect(() => {
    const newDefaultDate = getDefaultRateDate(saleDate, issueDate);
    setRateDate(newDefaultDate);
  }, [saleDate, issueDate]);

  // Fetch rate from API
  const fetchRate = useCallback(async () => {
    if (!currency || currency === "PLN" || !rateDate) {
      setRateData(null);
      onRateChange?.(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        currency,
        date: rateDate,
        findPrevious: "true",
      });

      const response = await fetch(`/api/nbp/rates?${params.toString()}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || data.error || "Nie udalo sie pobrac kursu");
      }

      const data: NbpRateData = await response.json();
      setRateData(data);
      
      // Calculate amount in PLN and notify parent
      const amountInPLN = amount * data.rate;
      onRateChange?.({
        rate: data.rate,
        date: data.date,
        table: data.tableNumber,
        amountInPLN,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Wystapil blad";
      setError(message);
      setRateData(null);
      onRateChange?.(null);
    } finally {
      setLoading(false);
    }
  }, [currency, rateDate, amount, onRateChange]);

  // Fetch rate when dependencies change
  useEffect(() => {
    fetchRate();
  }, [fetchRate]);

  // Don't render for PLN
  if (!currency || currency === "PLN") {
    return null;
  }

  const amountInPLN = rateData ? amount * rateData.rate : 0;

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Przelicznik walut NBP
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Kurs sredni NBP z ostatniego dnia roboczego poprzedzajacego dzien powstania obowiazku podatkowego
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date picker */}
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-2">
            <Label htmlFor="rateDate">Data kursu</Label>
            <Input
              id="rateDate"
              type="date"
              value={rateDate}
              onChange={(e) => setRateDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={fetchRate}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Error state */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading state */}
        {loading && !rateData && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-2 text-sm text-muted-foreground">
              Pobieranie kursu NBP...
            </span>
          </div>
        )}

        {/* Rate display */}
        {rateData && !loading && (
          <div className="space-y-3">
            {/* Rate info */}
            <div className="grid grid-cols-2 gap-4 p-3 bg-white rounded-md border">
              <div>
                <p className="text-xs text-muted-foreground">Kurs {rateData.code}</p>
                <p className="text-lg font-bold text-blue-700">
                  {formatRate(rateData.rate)} PLN
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tabela NBP</p>
                <p className="text-sm font-medium">{rateData.tableNumber}</p>
                <p className="text-xs text-muted-foreground">
                  z dnia {new Date(rateData.date).toLocaleDateString("pl-PL")}
                </p>
              </div>
            </div>

            {/* Conversion result */}
            <div className="p-3 bg-white rounded-md border">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">
                  Wartosc brutto:
                </span>
                <span className="font-medium">
                  {formatAmount(amount, currency)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-medium">
                  Rownowartość w PLN:
                </span>
                <Badge variant="secondary" className="text-base font-bold">
                  {formatAmount(amountInPLN, "PLN")}
                </Badge>
              </div>
            </div>

            {/* Info about actual rate date */}
            {rateData.date !== rateDate && (
              <p className="text-xs text-muted-foreground">
                * Kurs z dnia {new Date(rateData.date).toLocaleDateString("pl-PL")} 
                {" "}(ostatni dostepny przed wybrana data)
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
