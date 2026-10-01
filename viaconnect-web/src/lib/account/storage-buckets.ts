// Per-user storage prefixes found in application code. Listing is always
// `${userId}/` (or the corpus hash). Catalog objects in supplement-photos
// are not stored under a user id prefix and are not removed.
//
// body-progress-photos          src/lib/scan/persist.ts, src/app/api/scan/*
// body-tracker-scans            src/components/body-tracker/manual-input/ScanPhotoUpload.tsx
// nutrivision-meals             src/app/api/nutrition/photo/analyze/route.ts
//                               and hash paths in src/lib/nutrition/corpus/photo-contribution.ts
// supplement-photos             product catalog bucket; user prefix only
// user-supplement-label-photos  src/app/api/supplements/label-photo/upload/route.ts
// nutrition-photos              src/lib/nutrition/nutritionPhotoPath.ts
// nutrition-test-uploads        src/components/nutrition/genetics/UploadNutritionTestTab.tsx
// apple-health-imports          src/components/body-tracker/connected-sources/useHealthXmlImport.ts
// body-scan-pdfs                src/app/api/formavision/scan-report/route.ts
// genex-uploads                 src/app/api/genex/upload/route.ts

export const USER_STORAGE_BUCKETS = [
  'body-progress-photos',
  'body-tracker-scans',
  'nutrivision-meals',
  'supplement-photos',
  'user-supplement-label-photos',
  'nutrition-photos',
  'nutrition-test-uploads',
  'apple-health-imports',
  'body-scan-pdfs',
  'genex-uploads',
] as const;

export type UserStorageBucket = (typeof USER_STORAGE_BUCKETS)[number];
