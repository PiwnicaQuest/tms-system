"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  AlertTriangle,
  Calendar,
  Truck,
  Users,
  Building2,
  ChevronRight,
  Clock,
} from "lucide-react";

// Types
type DocumentType =
  | "VEHICLE_REGISTRATION"
  | "VEHICLE_INSURANCE_OC"
  | "VEHICLE_INSURANCE_AC"
  | "VEHICLE_INSPECTION"
  | "TACHOGRAPH_CALIBRATION"
  | "DRIVER_LICENSE"
  | "DRIVER_ADR"
  | "DRIVER_MEDICAL"
  | "DRIVER_PSYCHO"
  | "DRIVER_QUALIFICATION"
  | "COMPANY_LICENSE"
  | "COMPANY_INSURANCE"
  | "COMPANY_CERTIFICATE"
  | "CMR"
  | "DELIVERY_NOTE"
  | "OTHER";

interface ExpiringDocument {
  id: string;
  type: DocumentType;
  name: string;
  expiryDate: string;
  vehicle: { id: string; registrationNumber: string } | null;
  trailer: { id: string; registrationNumber: string } | null;
  driver: { id: string; firstName: string; lastName: string } | null;
}

// Document type labels
const documentTypeLabels: Record<DocumentType, string> = {
  VEHICLE_REGISTRATION: "Dowod rejestracyjny",
  VEHICLE_INSURANCE_OC: "Ubezpieczenie OC",
  VEHICLE_INSURANCE_AC: "Ubezpieczenie AC",
  VEHICLE_INSPECTION: "Przeglad techniczny",
  TACHOGRAPH_CALIBRATION: "Kalibracja tachografu",
  DRIVER_LICENSE: "Prawo jazdy",
  DRIVER_ADR: "Zaswiadczenie ADR",
  DRIVER_MEDICAL: "Badania lekarskie",
  DRIVER_PSYCHO: "Badania psychologiczne",
  DRIVER_QUALIFICATION: "Kwalifikacja zawodowa",
  COMPANY_LICENSE: "Licencja transportowa",
  COMPANY_INSURANCE: "Ubezpieczenie firmowe",
  COMPANY_CERTIFICATE: "Certyfikat firmowy",
  CMR: "List przewozowy CMR",
  DELIVERY_NOTE: "Dokument dostawy",
  OTHER: "Inny",
};

// Mock data - will be replaced with API calls
const mockExpiringDocuments: ExpiringDocument[] = [
  {
    id: "10",
    type: "DRIVER_LICENSE",
    name: "Prawo jazdy - Jan Wisniewski",
    expiryDate: "2026-01-20",
    vehicle: null,
    trailer: null,
    driver: { id: "3", firstName: "Jan", lastName: "Wisniewski" },
  },
  {
    id: "3",
    type: "VEHICLE_INSPECTION",
    name: "Przeglad techniczny WGM1068L",
    expiryDate: "2026-01-25",
    vehicle: { id: "1", registrationNumber: "WGM1068L" },
    trailer: null,
    driver: null,
  },
  {
    id: "6",
    type: "DRIVER_ADR",
    name: "ADR - Piotr Nowak",
    expiryDate: "2026-01-28",
    vehicle: null,
    trailer: null,
    driver: { id: "2", firstName: "Piotr", lastName: "Nowak" },
  },
  {
    id: "2",
    type: "VEHICLE_INSURANCE_OC",
    name: "Polisa OC WGM1068L",
    expiryDate: "2026-02-20",
    vehicle: { id: "1", registrationNumber: "WGM1068L" },
    trailer: null,
    driver: null,
  },
];

// Helper functions
function getDaysUntilExpiry(dateString: string): number {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = date.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getEntityIcon(doc: ExpiringDocument) {
  if (doc.vehicle || doc.trailer) return Truck;
  if (doc.driver) return Users;
  return Building2;
}

function getEntityLabel(doc: ExpiringDocument): string {
  if (doc.vehicle) return doc.vehicle.registrationNumber;
  if (doc.trailer) return doc.trailer.registrationNumber;
  if (doc.driver) return `${doc.driver.firstName} ${doc.driver.lastName}`;
  return "Firma";
}

function getEntityLink(doc: ExpiringDocument): string | null {
  if (doc.vehicle) return `/vehicles/${doc.vehicle.id}`;
  if (doc.trailer) return `/trailers/${doc.trailer.id}`;
  if (doc.driver) return `/drivers/${doc.driver.id}`;
  return null;
}

interface ExpiringDocumentsProps {
  className?: string;
  limit?: number;
}

export function ExpiringDocuments({ className, limit = 5 }: ExpiringDocumentsProps) {
  // Sort by expiry date and take limit
  const sortedDocuments = [...mockExpiringDocuments]
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
    .slice(0, limit);

  const expiredCount = sortedDocuments.filter(
    (doc) => getDaysUntilExpiry(doc.expiryDate) < 0
  ).length;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Wygasajace dokumenty
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/documents?expiring=true">
            Zobacz wszystkie
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {sortedDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-12 w-12 mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              Brak dokumentow wygasajacych w ciagu 30 dni
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {expiredCount > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium text-sm">
                    {expiredCount} {expiredCount === 1 ? "dokument przeterminowany" : "dokumenty przeterminowane"}
                  </span>
                </div>
              </div>
            )}

            {sortedDocuments.map((doc) => {
              const daysUntil = getDaysUntilExpiry(doc.expiryDate);
              const isExpired = daysUntil < 0;
              const isUrgent = daysUntil >= 0 && daysUntil <= 7;
              const EntityIcon = getEntityIcon(doc);
              const entityLink = getEntityLink(doc);

              return (
                <div
                  key={doc.id}
                  className={`rounded-lg border p-3 transition-colors ${
                    isExpired
                      ? "border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20"
                      : isUrgent
                      ? "border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                          isExpired
                            ? "bg-red-100 dark:bg-red-900/30"
                            : isUrgent
                            ? "bg-amber-100 dark:bg-amber-900/30"
                            : "bg-primary/10"
                        }`}
                      >
                        <FileText
                          className={`h-5 w-5 ${
                            isExpired
                              ? "text-red-600"
                              : isUrgent
                              ? "text-amber-600"
                              : "text-primary"
                          }`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              isExpired
                                ? "border-red-300 text-red-700 dark:border-red-800 dark:text-red-400"
                                : isUrgent
                                ? "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400"
                                : ""
                            }`}
                          >
                            {documentTypeLabels[doc.type]}
                          </Badge>
                        </div>
                        <p className="font-medium text-sm mt-1 truncate">
                          {doc.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <EntityIcon className="h-3 w-3 text-muted-foreground" />
                          {entityLink ? (
                            <Link
                              href={entityLink}
                              className="text-xs text-muted-foreground hover:underline"
                            >
                              {getEntityLabel(doc)}
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {getEntityLabel(doc)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div
                        className={`flex items-center gap-1 text-sm font-medium ${
                          isExpired
                            ? "text-red-600"
                            : isUrgent
                            ? "text-amber-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {isExpired ? (
                          <AlertTriangle className="h-4 w-4" />
                        ) : (
                          <Calendar className="h-4 w-4" />
                        )}
                        <span>
                          {isExpired
                            ? `${Math.abs(daysUntil)} dni temu`
                            : daysUntil === 0
                            ? "Dzisiaj"
                            : daysUntil === 1
                            ? "Jutro"
                            : `Za ${daysUntil} dni`}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(doc.expiryDate)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
