/**
 * Same glass tokens as WearableTileCard rest / selected.
 * Duplicated here so /plugins does not mount wearable tiles.
 */

export const PLUGIN_TILE_RESTING_CHROME =
  'relative rounded-[24px] border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.07)] p-4 backdrop-blur-md';

export const PLUGIN_TILE_ACTIVATED_CHROME =
  'relative rounded-[24px] border border-[rgba(74,144,217,0.25)] bg-[rgba(74,144,217,0.10)] p-4 pl-6 backdrop-blur-[16px]';

export const PLUGIN_TILE_ACTIVATED_RAIL =
  'absolute inset-y-3 left-0 w-1 rounded-full bg-teal/60';

export const PLUGIN_TILE_FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/60';

export const PLUGIN_TILE_OUTLINE_BTN =
  'inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-lg border border-teal bg-transparent px-3 text-center text-xs font-semibold text-teal hover:bg-teal/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/50 disabled:opacity-50';

export const PLUGIN_PANEL_GLASS =
  'relative flex h-full flex-col rounded-[24px] border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.07)] p-4 backdrop-blur-md sm:p-5';

export function pluginTileCardChrome(selected: boolean): string {
  return selected ? PLUGIN_TILE_ACTIVATED_CHROME : PLUGIN_TILE_RESTING_CHROME;
}

export function pluginTileTitleClassName(selected: boolean): string {
  return selected
    ? 'text-sm font-bold leading-snug text-teal whitespace-normal break-words'
    : 'text-sm font-semibold leading-snug text-white whitespace-normal break-words';
}
