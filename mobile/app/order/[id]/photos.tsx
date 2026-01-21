import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui";
import { api } from "@/services/api";

export default function PhotosScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [photos, setPhotos] = useState<string[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const takePhoto = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      if (photo?.uri) {
        setPhotos((prev) => [...prev, photo.uri]);
        setShowCamera(false);
      }
    } catch (error) {
      Alert.alert("Błąd", "Nie udało się zrobić zdjęcia");
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
    });

    if (!result.canceled && result.assets) {
      const newPhotos = result.assets.map((asset) => asset.uri);
      setPhotos((prev) => [...prev, ...newPhotos]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async () => {
    if (photos.length === 0) {
      Alert.alert("Uwaga", "Dodaj przynajmniej jedno zdjęcie");
      return;
    }

    setIsUploading(true);
    try {
      // Create FormData for each photo
      const formData = new FormData();
      photos.forEach((uri, index) => {
        const filename = uri.split("/").pop() || `photo_${index}.jpg`;
        formData.append("photos", {
          uri,
          name: filename,
          type: "image/jpeg",
        } as never);
      });

      await api.uploadPhotos(id, formData);
      Alert.alert("Sukces", "Zdjęcia zostały przesłane", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert("Błąd", "Nie udało się przesłać zdjęć");
    } finally {
      setIsUploading(false);
    }
  };

  // Camera permission check
  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{ headerShown: true, title: "Zdjęcia", headerStyle: { backgroundColor: "#3B82F6" }, headerTintColor: "#FFFFFF" }}
        />
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color="#6B7280" />
          <Text style={styles.permissionText}>
            Potrzebujemy dostępu do aparatu, aby robić zdjęcia dokumentacji.
          </Text>
          <Button title="Zezwól na dostęp" onPress={requestPermission} />
        </View>
      </SafeAreaView>
    );
  }

  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView style={styles.camera} ref={cameraRef} facing="back">
          <View style={styles.cameraOverlay}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowCamera(false)}
            >
              <Ionicons name="close" size={32} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.cameraControls}>
              <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Zdjęcia dokumentacji",
          headerStyle: { backgroundColor: "#3B82F6" },
          headerTintColor: "#FFFFFF",
        }}
      />

      <View style={styles.content}>
        {/* Photo Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowCamera(true)}
          >
            <Ionicons name="camera" size={32} color="#3B82F6" />
            <Text style={styles.actionText}>Zrób zdjęcie</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={pickImage}>
            <Ionicons name="images" size={32} color="#3B82F6" />
            <Text style={styles.actionText}>Z galerii</Text>
          </TouchableOpacity>
        </View>

        {/* Photos Grid */}
        {photos.length > 0 ? (
          <FlatList
            data={photos}
            keyExtractor={(_, index) => index.toString()}
            numColumns={3}
            renderItem={({ item, index }) => (
              <View style={styles.photoContainer}>
                <Image source={{ uri: item }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removePhoto(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}
            contentContainerStyle={styles.photosGrid}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="image-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Brak zdjęć</Text>
            <Text style={styles.emptySubtext}>
              Zrób zdjęcia dokumentacji transportu
            </Text>
          </View>
        )}

        {/* Upload Button */}
        {photos.length > 0 && (
          <View style={styles.uploadSection}>
            <Button
              title={`Prześlij ${photos.length} zdjęć`}
              onPress={uploadPhotos}
              loading={isUploading}
              size="lg"
            />
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
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  permissionText: {
    fontSize: 16,
    color: "#374151",
    textAlign: "center",
    marginVertical: 24,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "space-between",
    padding: 20,
  },
  closeButton: {
    alignSelf: "flex-start",
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    marginTop: 40,
  },
  cameraControls: {
    alignItems: "center",
    marginBottom: 40,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 32,
    marginBottom: 24,
  },
  actionButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 12,
    width: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    fontSize: 14,
    color: "#374151",
    marginTop: 8,
    fontWeight: "500",
  },
  photosGrid: {
    paddingTop: 8,
  },
  photoContainer: {
    flex: 1 / 3,
    aspectRatio: 1,
    padding: 4,
    position: "relative",
  },
  photo: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },
  removeButton: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  uploadSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
});
