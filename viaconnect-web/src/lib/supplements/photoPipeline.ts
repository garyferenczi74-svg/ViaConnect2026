// Photo OCR -> Web Search -> JSONB Assembly -> Cache -> Save pipeline

import type { OCRExtractedData, IngredientBreakdownEntry, DeliveryMethod, ProcessingState } from "@/types/supplements";
import { assembleIngredientBreakdown } from "./jsonbAssembler";
import { checkCache, saveToCache } from "./cacheManager";

export interface PipelineResult {
  success: boolean;
  brand: string;
  productName: string;
  servingSize: string;
  totalCount: number | null;
  ingredientBreakdown: IngredientBreakdownEntry[];
  nonMedicinalIngredients: string[];
  allergenWarnings: string[];
  isProprietaryBlend: boolean;
  ocrConfidence: number;
  sourceUrls: string[];
  ocrData: OCRExtractedData | null;
  needsAdditionalPhoto: boolean;
  additionalPhotoSuggestion: string | null;
  error?: string;
}

export async function runPhotoOCRPipeline(
  imageBase64: string,
  mediaType: string,
  deliveryMethod: DeliveryMethod,
  onStateChange?: (state: ProcessingState) => void,
): Promise<PipelineResult> {
  try {
    // ═══ STEP 1: Vision OCR ═══
    onStateChange?.("analyzing");

    const ocrRes = await fetch("/api/ai/supplement-vision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageBase64, mediaType }),
    });
    const ocrResult = await ocrRes.json();

    if (!ocrResult.success || !ocrResult.ocrData) {
      return { success: false, brand: "", productName: "", servingSize: "", totalCount: null, ingredientBreakdown: [], nonMedicinalIngredients: [], allergenWarnings: [], isProprietaryBlend: false, ocrConfidence: 0, sourceUrls: [], ocrData: null, needsAdditionalPhoto: false, additionalPhotoSuggestion: null, error: ocrResult.error || "OCR failed" };
    }

    const ocr: OCRExtractedData = ocrResult.ocrData;
    const brand = ocr.brand || "Unknown";
    const productName = ocr.productName || "Supplement";

    // ═══ STEP 2: Cache Check ═══
    onStateChange?.("searching");

    const cached = await checkCache(brand, productName).catch(() => null);
    if (cached) {
      console.log("photoPipeline: Cache hit for", brand, productName);
      return {
        success: true,
        brand: cached.brand,
        productName: cached.product_name,
        servingSize: ocr.servingSize || "",
        totalCount: ocr.totalCount,
        ingredientBreakdown: (cached.ingredient_breakdown as IngredientBreakdownEntry[]) || [],
        nonMedicinalIngredients: (cached.non_medicinal_ingredients as string[]) || [],
        allergenWarnings: cached.allergen_warnings || [],
        isProprietaryBlend: cached.is_proprietary_blend || false,
        ocrConfidence: cached.ocr_confidence || 0,
        sourceUrls: (cached.source_urls as string[]) || [],
        ocrData: ocr,
        needsAdditionalPhoto: false,
        additionalPhotoSuggestion: null,
      };
    }

    // ═══ STEP 3: Web Search Enrichment ═══
    let enrichedIngredients = ocr.ingredients || [];
    let nonMedicinal = ocr.nonMedicinalIngredients || [];
    let allergens = ocr.allergenWarnings || [];
    let sourceUrls: string[] = [];
    let isProprietaryBlend = false;
    let proprietaryBlendDetails = null;

    try {
      const searchRes = await fetch("/api/ai/supplement-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand, productName, ocrIngredients: ocr.ingredients }),
      });

      if (searchRes.ok) {
        const enrichment = await searchRes.json();
        if (enrichment.fullIngredients?.length > 0) {
          enrichedIngredients = enrichment.fullIngredients;
        }
        nonMedicinal = enrichment.nonMedicinalIngredients || nonMedicinal;
        allergens = enrichment.allergenWarnings || allergens;
        sourceUrls = enrichment.sourceUrls || [];
        isProprietaryBlend = enrichment.isProprietaryBlend || false;
        proprietaryBlendDetails = enrichment.proprietaryBlendDetails || null;
      }
    } catch (err) {
      console.warn("photoPipeline: Web search enrichment failed, using OCR data only:", err);
    }

    // ═══ STEP 4: JSONB Assembly ═══
    onStateChange?.("assembling");

    const ingredientBreakdown = assembleIngredientBreakdown(
      enrichedIngredients,
      deliveryMethod,
      proprietaryBlendDetails
    );

    // ═══ STEP 5: Save to Cache ═══
    try {
      await saveToCache(brand, productName, {
        servingSize: ocr.servingSize,
        servingsPerContainer: ocr.servingsPerContainer,
        totalCount: ocr.totalCount,
        dosagePerServing: ocr.dosagePerServing,
        claimsText: ocr.claimsText,
        productType: ocr.productType,
      }, ingredientBreakdown, {
        nonMedicinalIngredients: nonMedicinal,
        allergenWarnings: allergens,
        isProprietaryBlend,
        proprietaryBlendTotalMg: proprietaryBlendDetails?.totalAmount || undefined,
        sourceUrls,
        ocrConfidence: ocrResult.confidence || 0,
      });
    } catch (err) {
      console.warn("photoPipeline: Cache save failed:", err);
    }

    onStateChange?.("complete");

    return {
      success: true,
      brand,
      productName,
      servingSize: ocr.servingSize || "",
      totalCount: ocr.totalCount,
      ingredientBreakdown,
      nonMedicinalIngredients: nonMedicinal,
      allergenWarnings: allergens,
      isProprietaryBlend,
      ocrConfidence: ocrResult.confidence || 0,
      sourceUrls,
      ocrData: ocr,
      needsAdditionalPhoto: ocr.needsAdditionalPhoto || false,
      additionalPhotoSuggestion: ocr.additionalPhotoSuggestion || null,
    };
  } catch (err) {
    onStateChange?.("failed");
    console.error("photoPipeline: Fatal error:", err);
    return { success: false, brand: "", productName: "", servingSize: "", totalCount: null, ingredientBreakdown: [], nonMedicinalIngredients: [], allergenWarnings: [], isProprietaryBlend: false, ocrConfidence: 0, sourceUrls: [], ocrData: null, needsAdditionalPhoto: false, additionalPhotoSuggestion: null, error: "Pipeline failed. Please try again or add manually." };
  }
}
