#!/bin/bash

# Skrypt kopiowania plików z migracji do publicznego folderu uploads
# Uruchomienie: bash migration/copy-files.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SOURCE_DIR="$SCRIPT_DIR/uploads"
TARGET_DIR="$PROJECT_DIR/public/uploads/migration"

echo "📁 Kopiowanie plików migracji..."
echo "   Źródło: $SOURCE_DIR"
echo "   Cel:    $TARGET_DIR"
echo ""

# Utwórz folder docelowy
mkdir -p "$TARGET_DIR"

# Kopiuj dokumenty
if [ -d "$SOURCE_DIR/documents" ]; then
    echo "📄 Kopiuję dokumenty..."
    mkdir -p "$TARGET_DIR/documents"
    cp -r "$SOURCE_DIR/documents/"* "$TARGET_DIR/documents/" 2>/dev/null
    DOCS_COUNT=$(find "$TARGET_DIR/documents" -type f | wc -l)
    echo "   ✅ Skopiowano $DOCS_COUNT dokumentów"
fi

# Kopiuj badania medyczne
if [ -d "$SOURCE_DIR/medical_exams" ]; then
    echo "🏥 Kopiuję badania medyczne..."
    mkdir -p "$TARGET_DIR/medical_exams"
    cp -r "$SOURCE_DIR/medical_exams/"* "$TARGET_DIR/medical_exams/" 2>/dev/null
    MEDICAL_COUNT=$(find "$TARGET_DIR/medical_exams" -type f | wc -l)
    echo "   ✅ Skopiowano $MEDICAL_COUNT plików"
fi

# Kopiuj dokumenty firmowe
if [ -d "$SOURCE_DIR/company_documents" ]; then
    echo "🏢 Kopiuję dokumenty firmowe..."
    mkdir -p "$TARGET_DIR/company_documents"
    cp -r "$SOURCE_DIR/company_documents/"* "$TARGET_DIR/company_documents/" 2>/dev/null
    COMPANY_COUNT=$(find "$TARGET_DIR/company_documents" -type f | wc -l)
    echo "   ✅ Skopiowano $COMPANY_COUNT plików"
fi

# Podsumowanie
echo ""
echo "✅ Kopiowanie zakończone!"
TOTAL_SIZE=$(du -sh "$TARGET_DIR" 2>/dev/null | cut -f1)
echo "   Łączny rozmiar: $TOTAL_SIZE"
