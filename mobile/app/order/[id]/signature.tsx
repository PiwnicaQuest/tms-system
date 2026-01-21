import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Dimensions,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { Button, Input } from "@/components/ui";
import { useUpdateOrderStatus } from "@/hooks/useOrders";
import { api } from "@/services/api";

const { width } = Dimensions.get("window");
const SIGNATURE_WIDTH = width - 32;
const SIGNATURE_HEIGHT = 250;

export default function SignatureScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const updateStatus = useUpdateOrderStatus();

  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [recipientName, setRecipientName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath(`M ${locationX} ${locationY}`);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath((prev) => `${prev} L ${locationX} ${locationY}`);
      },
      onPanResponderRelease: () => {
        if (currentPath) {
          setPaths((prev) => [...prev, currentPath]);
          setCurrentPath("");
        }
      },
    })
  ).current;

  const clearSignature = () => {
    setPaths([]);
    setCurrentPath("");
  };

  const handleSubmit = async () => {
    if (paths.length === 0) {
      Alert.alert("Uwaga", "Proszę złożyć podpis");
      return;
    }

    if (!recipientName.trim()) {
      Alert.alert("Uwaga", "Proszę podać imię i nazwisko odbiorcy");
      return;
    }

    setIsSubmitting(true);
    try {
      // Convert SVG paths to base64 image
      const signatureData = {
        paths,
        width: SIGNATURE_WIDTH,
        height: SIGNATURE_HEIGHT,
        recipientName,
      };

      // Upload signature
      await api.uploadSignature(id, signatureData);

      // Update order status to DELIVERED
      await updateStatus.mutateAsync({ orderId: id, status: "DELIVERED" });

      Alert.alert(
        "Sukces",
        "Dostawa została potwierdzona",
        [{ text: "OK", onPress: () => router.replace("/(tabs)") }]
      );
    } catch (error) {
      Alert.alert("Błąd", "Nie udało się zapisać podpisu");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Potwierdzenie dostawy",
          headerStyle: { backgroundColor: "#3B82F6" },
          headerTintColor: "#FFFFFF",
        }}
      />

      <View style={styles.content}>
        <Text style={styles.title}>Podpis odbiorcy</Text>
        <Text style={styles.subtitle}>
          Poproś odbiorcę o złożenie podpisu na ekranie
        </Text>

        {/* Recipient Name Input */}
        <Input
          label="Imię i nazwisko odbiorcy"
          placeholder="Jan Kowalski"
          value={recipientName}
          onChangeText={setRecipientName}
        />

        {/* Signature Canvas */}
        <View style={styles.signatureContainer}>
          <View style={styles.signatureBox} {...panResponder.panHandlers}>
            <Svg
              width={SIGNATURE_WIDTH}
              height={SIGNATURE_HEIGHT}
              style={styles.svg}
            >
              {paths.map((path, index) => (
                <Path
                  key={index}
                  d={path}
                  stroke="#111827"
                  strokeWidth={3}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {currentPath && (
                <Path
                  d={currentPath}
                  stroke="#111827"
                  strokeWidth={3}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </Svg>
            {paths.length === 0 && !currentPath && (
              <Text style={styles.placeholder}>Podpisz tutaj</Text>
            )}
          </View>

          <View style={styles.signatureLine} />
          <Text style={styles.signatureLabel}>Czytelny podpis</Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Wyczyść"
            onPress={clearSignature}
            variant="outline"
            style={styles.clearButton}
          />
          <Button
            title="Potwierdź dostawę"
            onPress={handleSubmit}
            loading={isSubmitting}
            style={styles.submitButton}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
  },
  signatureContainer: {
    marginTop: 16,
  },
  signatureBox: {
    width: SIGNATURE_WIDTH,
    height: SIGNATURE_HEIGHT,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  svg: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  placeholder: {
    fontSize: 18,
    color: "#D1D5DB",
    fontStyle: "italic",
  },
  signatureLine: {
    height: 2,
    backgroundColor: "#374151",
    marginTop: -40,
    marginHorizontal: 20,
  },
  signatureLabel: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
  },
  actions: {
    flexDirection: "row",
    marginTop: 32,
    gap: 12,
  },
  clearButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
});
