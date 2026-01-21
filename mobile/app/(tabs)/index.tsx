import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useOrders } from "@/hooks/useOrders";
import { Card, StatusBadge } from "@/components/ui";
import { Order } from "@/types";
import { formatDate } from "@/utils/helpers";

function OrderCard({ order, onPress }: { order: Order; onPress: () => void }) {
  return (
    <Card onPress={onPress} style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
        <StatusBadge status={order.status} size="sm" />
      </View>

      <View style={styles.orderRoute}>
        <View style={styles.routePoint}>
          <View style={styles.routeDot} />
          <View style={styles.routeInfo}>
            <Text style={styles.routeLabel}>Załadunek</Text>
            <Text style={styles.routeAddress} numberOfLines={1}>
              {order.loadingAddress}
            </Text>
            <Text style={styles.routeDate}>
              {formatDate(order.loadingDate)}
            </Text>
          </View>
        </View>

        <View style={styles.routeLine} />

        <View style={styles.routePoint}>
          <View style={[styles.routeDot, styles.routeDotEnd]} />
          <View style={styles.routeInfo}>
            <Text style={styles.routeLabel}>Rozładunek</Text>
            <Text style={styles.routeAddress} numberOfLines={1}>
              {order.unloadingAddress}
            </Text>
            <Text style={styles.routeDate}>
              {formatDate(order.unloadingDate)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.orderFooter}>
        <View style={styles.orderDetail}>
          <Ionicons name="cube-outline" size={16} color="#6B7280" />
          <Text style={styles.orderDetailText}>{order.cargoDescription}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </View>
    </Card>
  );
}

export default function OrdersScreen() {
  const router = useRouter();
  const { data: orders, isLoading, error, refetch } = useOrders();

  const handleOrderPress = (orderId: string) => {
    router.push(`/order/${orderId}`);
  };

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>
            Nie udało się pobrać zleceń
          </Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
            <Text style={styles.retryText}>Spróbuj ponownie</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <FlatList
        data={orders || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OrderCard order={item} onPress={() => handleOrderPress(item.id)} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            colors={["#3B82F6"]}
            tintColor="#3B82F6"
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContent}>
              <Ionicons name="document-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>Brak zleceń</Text>
              <Text style={styles.emptySubtext}>
                Nowe zlecenia pojawią się tutaj
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  orderCard: {
    marginBottom: 8,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  orderRoute: {
    marginBottom: 16,
  },
  routePoint: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#3B82F6",
    marginRight: 12,
    marginTop: 4,
  },
  routeDotEnd: {
    backgroundColor: "#10B981",
  },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: "#E5E7EB",
    marginLeft: 5,
    marginVertical: 4,
  },
  routeInfo: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  routeAddress: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
  routeDate: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  orderDetail: {
    flexDirection: "row",
    alignItems: "center",
  },
  orderDetailText: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 6,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: "#374151",
    marginTop: 16,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#3B82F6",
    borderRadius: 8,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  emptyContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
});
