# Migracja Bakus TMS 1.0 → 2.0

## Zawartość folderu

```
migration/
├── README.md              # Ta instrukcja
├── fleet.db               # Oryginalna baza SQLite (backup)
├── fleet_backup.json      # Eksport danych w formacie JSON
├── migrate.ts             # Główny skrypt migracji
├── copy-files.sh          # Skrypt kopiowania plików
├── id_mappings.json       # Mapowania starych ID na nowe (po migracji)
└── uploads/               # Pliki z serwera produkcyjnego
    ├── documents/         # Dokumenty pojazdów i kierowców
    ├── medical_exams/     # Badania lekarskie
    └── company_documents/ # Dokumenty firmowe
```

## Dane do migracji

| Tabela | Liczba rekordów |
|--------|-----------------|
| Pojazdy | 73 |
| Kierowcy | 48 |
| Dokumenty | 67 |
| Zlecenia | 19 |
| Kontrahenci | 16 |
| Użytkownicy | 9 |
| Faktury | 4 |
| Naczepy | 2 |

**Pliki:** ~113 MB

## Instrukcja migracji

### 1. Przygotowanie

Upewnij się, że baza PostgreSQL jest uruchomiona i schemat jest aktualny:

```bash
# Uruchom bazę danych
docker-compose up -d postgres

# Zastosuj schemat
npx prisma db push
```

### 2. Skopiuj pliki

```bash
# Nadaj uprawnienia do wykonania
chmod +x migration/copy-files.sh

# Uruchom kopiowanie plików
bash migration/copy-files.sh
```

### 3. Uruchom migrację

```bash
# Z głównego katalogu projektu
npx ts-node migration/migrate.ts

# lub z dotenv (jeśli .env nie jest ładowany automatycznie)
npx ts-node -r dotenv/config migration/migrate.ts
```

### 4. Zweryfikuj dane

Po migracji sprawdź dane w aplikacji:

```bash
# Uruchom aplikację
pnpm dev
```

Zaloguj się używając:
- **Email:** admin@bakuslogistics.pl (lub inny zmigrowany użytkownik)
- **Hasło:** BakusTMS2024!

## Mapowanie danych

### Typy pojazdów
| Stary | Nowy |
|-------|------|
| ciagnik | TRUCK |
| naczepa | TRAILER |
| bus | BUS |
| solowka | SOLO |
| osobowka | CAR |

### Statusy pojazdów
| Stary | Nowy |
|-------|------|
| active | ACTIVE |
| inactive | INACTIVE |
| in_service | IN_SERVICE |
| sold | SOLD |

### Statusy kierowców
| Stary | Nowy |
|-------|------|
| active | ACTIVE |
| on_leave | ON_LEAVE |
| sick | SICK |
| terminated | TERMINATED |

### Statusy zleceń
| Stary | Nowy |
|-------|------|
| planned | PLANNED |
| assigned | ASSIGNED |
| confirmed | CONFIRMED |
| loading | LOADING |
| in_transit | IN_TRANSIT |
| unloading | UNLOADING |
| completed | COMPLETED |
| cancelled | CANCELLED |

### Role użytkowników
| Stary | Nowy |
|-------|------|
| admin | ADMIN |
| management | MANAGER |
| dispatcher | DISPATCHER |
| employee | DRIVER |
| viewer | VIEWER |

## Rozwiązywanie problemów

### Błąd: "Unique constraint failed"
Jeśli migracja była już uruchomiona wcześniej, niektóre rekordy mogą już istnieć. Skrypt automatycznie pomija istniejące rekordy.

### Błąd połączenia z bazą
Sprawdź czy:
1. PostgreSQL jest uruchomiony: `docker-compose ps`
2. Zmienna `DATABASE_URL` jest poprawna w `.env`

### Brak plików po migracji
Upewnij się, że uruchomiłeś `copy-files.sh` przed migracją danych.

## Dane źródłowe

Dane zostały pobrane z serwera:
- **Host:** 192.168.88.115
- **User:** deploy
- **Aplikacja:** Flask + SQLite (Bakus TMS 1.0)
- **Baza:** fleet.db

## Uwagi

1. **Hasła** - wszystkim użytkownikom przypisano domyślne hasło `BakusTMS2024!`. Powinni je zmienić przy pierwszym logowaniu.

2. **Emaile** - stare nazwy użytkowników zostały przekonwertowane na adresy email w domenie @bakuslogistics.pl

3. **Pliki** - ścieżki do plików zostały zaktualizowane na `/uploads/migration/...`

4. **ID** - stare ID (INTEGER) zostały zamienione na nowe CUID. Mapowania znajdują się w `id_mappings.json`
