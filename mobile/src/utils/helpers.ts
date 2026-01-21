import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';

export function formatDate(date: string | Date, formatStr: string = 'dd.MM.yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr, { locale: pl });
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, 'dd.MM.yyyy HH:mm');
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

export function formatWeight(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(2)} t`;
  }
  return `${kg} kg`;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function openMaps(address: string): void {
  const encodedAddress = encodeURIComponent(address);
  const url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  // Use Linking from expo-linking
  import('expo-linking').then(({ openURL }) => openURL(url));
}

export function openNavigation(lat: number, lng: number): void {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  import('expo-linking').then(({ openURL }) => openURL(url));
}

export function callPhone(phone: string): void {
  import('expo-linking').then(({ openURL }) => openURL(`tel:${phone}`));
}
