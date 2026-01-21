import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { api } from '../services/api';
import type { LocationData } from '../types';

interface UseLocationOptions {
  enableBackgroundTracking?: boolean;
  trackingInterval?: number;
  orderId?: string;
}

export function useLocation(options: UseLocationOptions = {}) {
  const {
    enableBackgroundTracking = false,
    trackingInterval = 30000,
    orderId
  } = options;

  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  const requestPermissions = useCallback(async () => {
    const { status: foregroundStatus } =
      await Location.requestForegroundPermissionsAsync();

    if (foregroundStatus !== 'granted') {
      setError('Brak uprawnień do lokalizacji');
      return false;
    }

    if (enableBackgroundTracking) {
      const { status: backgroundStatus } =
        await Location.requestBackgroundPermissionsAsync();

      if (backgroundStatus !== 'granted') {
        console.warn('Brak uprawnień do śledzenia w tle');
      }
    }

    return true;
  }, [enableBackgroundTracking]);

  const getCurrentLocation = useCallback(async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return null;

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const locationData: LocationData = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        timestamp: currentLocation.timestamp,
        speed: currentLocation.coords.speed ?? undefined,
        heading: currentLocation.coords.heading ?? undefined,
      };

      setLocation(locationData);
      return locationData;
    } catch (err) {
      setError('Nie udało się pobrać lokalizacji');
      return null;
    }
  }, [requestPermissions]);

  const startTracking = useCallback(async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    setIsTracking(true);

    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: trackingInterval,
        distanceInterval: 50, // meters
      },
      async (newLocation) => {
        const locationData: LocationData = {
          latitude: newLocation.coords.latitude,
          longitude: newLocation.coords.longitude,
          timestamp: newLocation.timestamp,
          speed: newLocation.coords.speed ?? undefined,
          heading: newLocation.coords.heading ?? undefined,
        };

        setLocation(locationData);

        // Send location to server
        if (orderId) {
          try {
            await api.post(`/driver/location`, {
              ...locationData,
              orderId,
            });
          } catch (err) {
            console.error('Failed to send location:', err);
          }
        }
      }
    );

    return () => {
      subscription.remove();
      setIsTracking(false);
    };
  }, [requestPermissions, trackingInterval, orderId]);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
  }, []);

  return {
    location,
    error,
    isTracking,
    getCurrentLocation,
    startTracking,
    stopTracking,
  };
}
