# Bakus TMS - Przydatne Komendy

## Docker - PostgreSQL

### Uruchomienie kontenera
```bash
docker run -d --name bakus-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=bakus_tms \
  -p 5432:5432 \
  postgres:16
```

### Zarządzanie kontenerem
```bash
docker ps | grep bakus-postgres    # Status
docker stop bakus-postgres         # Zatrzymanie
docker start bakus-postgres        # Uruchomienie
docker rm -f bakus-postgres        # Usunięcie
docker logs bakus-postgres         # Logi
docker exec -it bakus-postgres psql -U postgres -d bakus_tms  # Połączenie
```

## Prisma

```bash
npx prisma db push          # Push schema do bazy (dev)
npx prisma migrate dev      # Generowanie migracji
npx prisma migrate deploy   # Zastosowanie migracji (prod)
npx prisma db seed          # Załadowanie danych testowych
npx prisma studio           # GUI dla bazy
npx prisma generate         # Generowanie klienta
```

## Next.js

```bash
pnpm run dev    # Development
pnpm run build  # Build
pnpm run start  # Start (prod)
pnpm run lint   # Linting
```

## Rozwiązywanie problemów

### Konflikt portów PostgreSQL
```bash
brew services stop postgresql@16  # Zatrzymaj Homebrew PostgreSQL
lsof -i :5432                      # Sprawdź co używa portu
```

### Błędy Prisma/Next.js
```bash
rm -rf node_modules/.prisma && npx prisma generate  # Regeneruj klienta
rm -rf .next && pnpm run dev                        # Wyczyść cache Next.js
```

## Zmienne środowiskowe (.env)
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bakus_tms?schema=public"
NEXTAUTH_SECRET="bakus-tms-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="Bakus TMS"
```
