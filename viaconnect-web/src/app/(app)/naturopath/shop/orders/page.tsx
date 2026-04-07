// Naturopath orders — re-exports the practitioner orders page. Reads
// shop_orders WHERE placed_by_practitioner_id = current user, regardless of
// the practitioner_role. The naturopath layout provides PractitionerContext
// with portalType='naturopath' for accent colors.

export { default } from '@/app/(app)/practitioner/shop/orders/page';
