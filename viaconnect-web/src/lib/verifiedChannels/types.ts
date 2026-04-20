// Prompt #102 Workstream A — verified channel types.

export type ChannelType =
  | 'own_website'
  | 'amazon_storefront'
  | 'etsy_shop'
  | 'shopify_store'
  | 'tiktok_shop'
  | 'physical_clinic_pos'
  | 'wholesale_partner_storefront'
  | 'pop_up_event';

export type ChannelState =
  | 'pending_verification'
  | 'verified'
  | 'verification_lapsed'
  | 'verification_failed'
  | 'volume_flagged'
  | 'suspended';

export type VerificationMethod =
  | 'domain_meta_tag'
  | 'dns_txt_record'
  | 'marketplace_oauth'
  | 'manual_document_upload'
  | 'email_from_domain';

export interface VerifiedChannelRow {
  channelId: string;
  practitionerId: string;
  channelType: ChannelType;
  channelUrl: string;
  channelDisplayName: string;
  state: ChannelState;
  verificationMethod: VerificationMethod | null;
  verifiedAt: string | null;
  reVerifyDueAt: string | null;
}

/** Per-channel-type list of verification methods the UI should offer. */
export const VERIFICATION_METHODS_BY_CHANNEL_TYPE: Record<ChannelType, readonly VerificationMethod[]> = {
  own_website: ['domain_meta_tag', 'dns_txt_record'],
  amazon_storefront: ['marketplace_oauth'],
  etsy_shop: ['marketplace_oauth'],
  shopify_store: ['marketplace_oauth', 'domain_meta_tag'],
  tiktok_shop: ['marketplace_oauth'],
  physical_clinic_pos: ['manual_document_upload'],
  wholesale_partner_storefront: ['manual_document_upload'],
  pop_up_event: ['manual_document_upload'],
};

export const RE_VERIFY_INTERVAL_DAYS = 90;
export const VERIFICATION_TOKEN_TTL_DAYS = 7;
export const DNS_PROPAGATION_RETRY_WINDOW_HOURS = 48;

/** Which states grant VIP coverage to MAP monitoring. Only `verified`. */
export function channelGrantsVIPCoverage(state: ChannelState): boolean {
  return state === 'verified';
}
