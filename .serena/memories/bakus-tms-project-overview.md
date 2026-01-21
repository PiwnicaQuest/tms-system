# Bakus TMS 2.0 - Przegląd Projektu

## Informacje podstawowe
- **Nazwa:** Bakus TMS (Transport Management System)
- **Wersja:** 2.0
- **Ścieżka:** `/Users/mateuszmatula/Projects/bakus-tms`
- **Firma:** Bakus Logistics

## Stack technologiczny
- **Framework:** Next.js 16.1.2 (App Router, Turbopack)
- **React:** 19.2.3
- **Baza danych:** PostgreSQL 16 (Docker)
- **ORM:** Prisma 5.22.0
- **Autentykacja:** NextAuth 5 (beta) z Credentials provider
- **Styling:** TailwindCSS 4, shadcn/ui v4
- **Język:** TypeScript 5
- **Package manager:** pnpm

## Uruchomienie projektu

### 1. Baza danych (Docker)
```bash
docker run -d --name bakus-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=bakus_tms \
  -p 5432:5432 \
  postgres:16
```

### 2. Migracje i seed
```bash
npx prisma db push
npx prisma db seed
```

### 3. Serwer deweloperski
```bash
pnpm run dev
```

### 4. Build produkcyjny
```bash
pnpm run build
```

## Dane logowania (testowe)
- **Admin:** admin@bakus.pl / Admin123!
- **Dyspozytor:** dyspozytor@bakus.pl / Dyspozytor123!

## Struktura modułów

### Flota (`/vehicles`, `/drivers`, `/trailers`)
- Lista pojazdów z filtrowaniem i paginacją
- Szczegóły pojazdu, edycja
- Lista kierowców, szczegóły
- Lista naczep

### Zlecenia (`/orders`)
- Lista zleceń transportowych
- Statusy: PLANNED, ASSIGNED, CONFIRMED, LOADING, IN_TRANSIT, UNLOADING, COMPLETED, CANCELLED, PROBLEM
- Filtrowanie po statusie, kierowcy, pojeździe, datach
- Tworzenie nowych zleceń

### Finanse (`/invoices`, `/costs`, `/contractors`)
- Faktury sprzedażowe (DRAFT, ISSUED, SENT, PAID, OVERDUE, CANCELLED)
- Koszty pojazdów i kierowców
- Kontrahenci (CLIENT, CARRIER, BOTH)

### Dokumenty (`/documents`)
- Zarządzanie dokumentami
- Typy: CMR, INVOICE, CONTRACT, LICENSE, INSURANCE, OTHER

### Alokacja kosztów (Cost Allocation)
- DailyWorkRecord - dzienny zapis pracy kierowcy
- DriverMonthlyReport - miesięczny raport kierowcy
- VehicleMonthlyReport - miesięczny raport pojazdu

### Ustawienia (`/settings`)
- Konfiguracja aplikacji
- Zarządzanie użytkownikami

## API Routes
- `/api/vehicles` - CRUD pojazdów
- `/api/drivers` - CRUD kierowców
- `/api/trailers` - CRUD naczep
- `/api/orders` - CRUD zleceń
- `/api/invoices` - CRUD faktur
- `/api/contractors` - CRUD kontrahentów
- `/api/costs` - koszty
- `/api/costs/daily-records` - dzienne zapisy pracy
- `/api/costs/reports/drivers` - raporty kierowców
- `/api/costs/reports/vehicles` - raporty pojazdów
- `/api/documents` - dokumenty
- `/api/settings` - ustawienia
- `/api/users` - użytkownicy
- `/api/auth/[...nextauth]` - autentykacja

## Multi-tenancy
Aplikacja obsługuje multi-tenancy:
- Każdy użytkownik należy do tenanta
- Dane są izolowane per tenant
- Middleware sprawdza sesję i tenant

## Kluczowe pliki
- `prisma/schema.prisma` - schemat bazy danych
- `prisma/seed.ts` - dane testowe
- `src/lib/auth/config.ts` - konfiguracja NextAuth
- `src/lib/db/prisma.ts` - klient Prisma
- `src/middleware.ts` - middleware autentykacji
- `src/components/layout/sidebar.tsx` - nawigacja

## Rozwiązane problemy

### Suspense dla useSearchParams (Next.js 16)
Strony używające `useSearchParams()` wymagają Suspense boundary:
```tsx
function PageContent() {
  const searchParams = useSearchParams();
  // ...
}

export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <PageContent />
    </Suspense>
  );
}
```

Naprawione strony:
- `/contractors/page.tsx`
- `/invoices/page.tsx`
- `/orders/page.tsx`
- `/login/page.tsx`

### Konflikt portów PostgreSQL
Jeśli lokalny PostgreSQL (Homebrew) blokuje port 5432:
```bash
brew services stop postgresql@16
```

## Do zrobienia w przyszłości
- [ ] Eksport PDF faktur
- [ ] Integracja z GPS pojazdów
- [ ] Powiadomienia email/push
- [ ] Raporty i dashboard analytics
- [ ] Import/export danych CSV
- [ ] Integracja z systemami księgowymi
- [ ] Aplikacja mobilna dla kierowców
