// Naturopath recommendations — re-exports the practitioner recommendations
// page. Same data source (practitioner_recommendations WHERE practitioner_id
// = current user) — the practitioner_role column on each row records whether
// the row was created from the practitioner or naturopath portal.

export { default } from '@/app/(app)/practitioner/shop/recommendations/page';
