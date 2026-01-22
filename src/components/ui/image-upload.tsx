"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";

interface ImageUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  entityType: "vehicle" | "trailer";
  entityId?: string;
  disabled?: boolean;
  className?: string;
}

export function ImageUpload({
  value,
  onChange,
  entityType,
  entityId,
  disabled = false,
  className,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  const maxSize = 5 * 1024 * 1024; // 5MB

  const validateFile = (file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return "Dozwolone formaty: JPG, PNG, WebP";
    }
    if (file.size > maxSize) {
      return "Maksymalny rozmiar pliku to 5MB";
    }
    return null;
  };

  const uploadFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entityType", entityType);
      if (entityId) {
        formData.append("entityId", entityId);
      }

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Blad podczas uploadu");
      }

      const data = await response.json();
      onChange(data.fileUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Blad podczas uploadu");
    } finally {
      setIsUploading(false);
    }
  }, [entityType, entityId, onChange]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled || isUploading) return;

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      uploadFile(files[0]);
    }
  }, [disabled, isUploading, uploadFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      uploadFile(files[0]);
    }
    // Reset input
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [uploadFile]);

  const handleRemove = useCallback(() => {
    onChange(null);
    setError(null);
  }, [onChange]);

  const handleClick = useCallback(() => {
    if (!disabled && !isUploading) {
      inputRef.current?.click();
    }
  }, [disabled, isUploading]);

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        disabled={disabled || isUploading}
        className="hidden"
      />

      {value ? (
        <div className="relative group">
          <div className="relative w-full h-40 rounded-lg overflow-hidden border bg-muted">
            <img
              src={value}
              alt="Zdjecie pojazdu"
              className="w-full h-full object-cover"
            />
            {!disabled && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleClick}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-1" />
                      Zmien
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={handleRemove}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4 mr-1" />
                  Usun
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          onClick={handleClick}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            "relative w-full h-40 rounded-lg border-2 border-dashed transition-colors cursor-pointer",
            "flex flex-col items-center justify-center gap-2",
            dragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
            disabled && "opacity-50 cursor-not-allowed",
            isUploading && "pointer-events-none"
          )}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Przesylanie...</p>
            </>
          ) : (
            <>
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center px-4">
                Przeciagnij zdjecie lub kliknij, aby wybrac
              </p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, WebP (max 5MB)
              </p>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

// Miniaturka do tabeli
interface ImageThumbnailProps {
  src: string | null;
  alt: string;
  fallbackIcon?: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function ImageThumbnail({
  src,
  alt,
  fallbackIcon,
  className,
  size = "md",
}: ImageThumbnailProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  return (
    <div
      className={cn(
        sizeClasses[size],
        "rounded-lg overflow-hidden bg-muted flex items-center justify-center",
        className
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="text-muted-foreground">
          {fallbackIcon || <ImageIcon className="h-4 w-4" />}
        </div>
      )}
    </div>
  );
}
