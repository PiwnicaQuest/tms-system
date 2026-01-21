import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocation } from "@/hooks/useLocation";
import { useOrdersStore } from "@/stores/ordersStore";
import { Button } from "@/components/ui";

export default function MapScreen() {
  const { location, error: locationError, startTracking, stopTracking } = useLocation();
  const { activeOrder } = useOrdersStore();
  const [isTracking, setIsTracking] = useState(false);

  const toggleTracking = async () => {
    if (isTracking) {
      stopTracking();
      setIsTracking(false);
    } else {
      const success = await startTracking();
      if (success) {
        setIsTracking(true);
      }
    }
  };

  const openNavigation = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;

    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert("Błąd", "Nie można otworzyć nawigacji");
      }
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.content}>
        {/* Current Location Card */}
        <View style={styles.locationCard}>
          <View style={styles.locationHeader}>
            <Ionicons name="location" size={24} color="#3B82F6" />
            <Text style={styles.locationTitle}>Twoja lokalizacja</Text>
          </View>

          {location ? (
            <View style={styles.locationDetails}>
              <Text style={styles.coordinates}>
                {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </Text>
              <Text style={styles.accuracy}>
                Dokładność: ±{location.accuracy?.toFixed(0) || "?"} m
              </Text>
              {location.speed !== null && location.speed !== undefined && (
                <Text style={styles.speed}>
                  Prędkość: {(location.speed * 3.6).toFixed(1)} km/h
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.noLocation}>
              {locationError || "Oczekiwanie na lokalizację..."}
            </Text>
          )}

          <Button
            title={isTracking ? "Zatrzymaj śledzenie" : "Włącz śledzenie GPS"}
            onPress={toggleTracking}
            variant={isTracking ? "danger" : "primary"}
            style={styles.trackingButton}
          />
        </View>

        {/* Active Order Navigation */}
        {activeOrder && (
          <View style={styles.navigationCard}>
            <Text style={styles.navigationTitle}>Aktywne zlecenie</Text>
            <Text style={styles.orderNumber}>#{activeOrder.orderNumber}</Text>

            <TouchableOpacity
              style={styles.navButton}
              onPress={() => openNavigation(activeOrder.loadingAddress)}
            >
              <View style={styles.navButtonContent}>
                <View style={[styles.navDot, { backgroundColor: "#3B82F6" }]} />
                <View style={styles.navInfo}>
                  <Text style={styles.navLabel}>Załadunek</Text>
                  <Text style={styles.navAddress} numberOfLines={2}>
                    {activeOrder.loadingAddress}
                  </Text>
                </View>
              </View>
              <Ionicons name="navigate" size={24} color="#3B82F6" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navButton}
              onPress={() => openNavigation(activeOrder.unloadingAddress)}
            >
              <View style={styles.navButtonContent}>
                <View style={[styles.navDot, { backgroundColor: "#10B981" }]} />
                <View style={styles.navInfo}>
                  <Text style={styles.navLabel}>Rozładunek</Text>
                  <Text style={styles.navAddress} numberOfLines={2}>
                    {activeOrder.unloadingAddress}
                  </Text>
                </View>
              </View>
              <Ionicons name="navigate" size={24} color="#10B981" />
            </TouchableOpacity>
          </View>
        )}

        {!activeOrder && (
          <View style={styles.noOrderCard}>
            <Ionicons name="car-outline" size={48} color="#D1D5DB" />
            <Text style={styles.noOrderText}>Brak aktywnego zlecenia</Text>
            <Text style={styles.noOrderSubtext}>
              Wybierz zlecenie z listy, aby rozpocząć nawigację
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  locationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginLeft: 8,
  },
  locationDetails: {
    marginBottom: 16,
  },
  coordinates: {
    fontSize: 16,
    color: "#374151",
    fontFamily: "monospace",
  },
  accuracy: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  speed: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  noLocation: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
  },
  trackingButton: {
    marginTop: 8,
  },
  navigationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  navigationTitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 16,
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  navButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  navDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  navInfo: {
    flex: 1,
  },
  navLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  navAddress: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  noOrderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noOrderText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
  },
  noOrderSubtext: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
  },
});
