// Naturopath shop hub — re-exports the practitioner shop hub. The page body
// is portal-agnostic; it reads portalType from PractitionerContext (which the
// naturopath layout wraps with portalType='naturopath') and adapts UI accents
// + text accordingly.

export { default } from '@/app/(app)/practitioner/shop/page';
