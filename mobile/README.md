# Bakus TMS - Aplikacja Mobilna dla Kierowców

Aplikacja mobilna dla kierowców systemu Bakus TMS, zbudowana w Expo (React Native).

## Funkcjonalności

- 🔐 **Logowanie** - bezpieczne logowanie kierowcy
- 📋 **Lista zleceń** - przegląd przypisanych zleceń
- 📍 **Szczegóły zlecenia** - pełne informacje o zleceniu z możliwością zmiany statusu
- 🗺️ **Nawigacja GPS** - integracja z mapami i śledzenie lokalizacji
- 📸 **Dokumentacja fotograficzna** - robienie i przesyłanie zdjęć
- ✍️ **Podpis cyfrowy (POD)** - elektroniczne potwierdzenie dostawy
- 🔔 **Push notifications** - powiadomienia o nowych zleceniach

## Struktura projektu

```
mobile/
├── app/                    # Ekrany aplikacji (expo-router)
│   ├── (auth)/            # Ekrany logowania
│   ├── (tabs)/            # Główne zakładki
│   └── order/             # Szczegóły zlecenia
├── src/
│   ├── components/        # Komponenty UI
│   ├── hooks/             # Custom hooks
│   ├── services/          # API client
│   ├── stores/            # Zustand stores
│   ├── types/             # TypeScript types
│   └── utils/             # Utility functions
└── assets/                # Obrazy i ikony
```

## Wymagania

- Node.js >= 20.x
- Expo CLI
- iOS Simulator lub Android Emulator (lub fizyczne urządzenie)

## Instalacja

```bash
cd mobile
npm install
```

## Uruchomienie

```bash
# Development
npx expo start

# iOS
npx expo start --ios

# Android
npx expo start --android
```

## Konfiguracja

1. Skopiuj `.env.example` do `.env`:
```bash
cp .env.example .env
```

2. Ustaw adres API backendu:
```
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

3. Dla push notifications (opcjonalnie):
   - Skonfiguruj projekt w [Expo](https://expo.dev)
   - Zaktualizuj `projectId` w `app.json`

## Budowanie

```bash
# EAS Build (wymaga konta Expo)
npx eas build --platform ios
npx eas build --platform android
```

## API Endpointy

Aplikacja komunikuje się z backendem przez następujące endpointy:

| Endpoint | Metoda | Opis |
|----------|--------|------|
| `/api/driver/auth/login` | POST | Logowanie |
| `/api/driver/auth/me` | GET | Dane użytkownika |
| `/api/driver/orders` | GET | Lista zleceń |
| `/api/driver/orders/:id` | GET | Szczegóły zlecenia |
| `/api/driver/orders/:id` | PATCH | Aktualizacja statusu |
| `/api/driver/orders/:id/photos` | POST | Upload zdjęć |
| `/api/driver/orders/:id/signature` | POST | Zapis podpisu |
| `/api/driver/orders/:id/location` | POST | Aktualizacja GPS |
| `/api/driver/push-token` | POST | Rejestracja push token |

## Statusy zlecenia

```
NEW → ACCEPTED → LOADING → IN_TRANSIT → UNLOADING → DELIVERED → COMPLETED
```

- **NEW** - Nowe zlecenie do akceptacji
- **ACCEPTED** - Kierowca zaakceptował zlecenie
- **LOADING** - Trwa załadunek
- **IN_TRANSIT** - Pojazd w trasie
- **UNLOADING** - Trwa rozładunek
- **DELIVERED** - Dostawa potwierdzona (podpis POD)
- **COMPLETED** - Zlecenie zakończone
