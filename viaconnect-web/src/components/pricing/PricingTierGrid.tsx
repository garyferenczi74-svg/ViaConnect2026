'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { PricingCatalogBody } from '@/components/pricing/PricingCatalogBody';
import {
  PRICING_CATALOG_TIMEOUT_MS,
  parsePricingCatalog,
  readCatalogErrorMessage,
  isPricingCatalogError,
  buildPricingPlanCards,
  type PricingCatalogLoadState,
  type PricingPlanCardModel,
} from '@/lib/pricing/catalog';
import { withAbortTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { trackPractitionerPricingExpanded } from '@/lib/analytics';

interface PricingTierGridProps {
  className?: string;
}

export function PricingTierGrid({ className = '' }: PricingTierGridProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  // Brief 45: SSR / first paint must not ship an infinite spinner.
  // Empty copy is "Plans load from the catalog" until the live catalog arrives
  // or the existing timeout bound expires.
  const [loadState, setLoadState] = useState<PricingCatalogLoadState>({ status: 'empty' });
  const [retryToken, setRetryToken] = useState(0);
  const [currentTierId, setCurrentTierId] = useState<string | null>(null);
  const [showFamilyConfig, setShowFamilyConfig] = useState(false);
  const [selectedFamilyPlan, setSelectedFamilyPlan] = useState<PricingPlanCardModel | null>(null);
  const [isPractitionerOpen, setIsPractitionerOpen] = useState(false);

  const toggleId = useId();
  const regionId = `${toggleId}-region`;

  const handlePractitionerToggle = () => {
    const next = !isPractitionerOpen;
    setIsPractitionerOpen(next);
    if (next) {
      trackPractitionerPricingExpanded();
      requestAnimationFrame(() => {
        const region = document.getElementById(regionId);
        if (region) {
          const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          region.scrollIntoView({
            behavior: prefersReducedMotion ? 'auto' : 'smooth',
            block: 'nearest',
          });
        }
      });
    }
  };

  useEffect(() => {
    let mounted = true;
    setLoadState({ status: 'loading' });

    const failSafe = window.setTimeout(() => {
      if (!mounted) return;
      setLoadState((current) => (current.status === 'loading' ? { status: 'empty' } : current));
    }, PRICING_CATALOG_TIMEOUT_MS);

    (async () => {
      try {
        const catalog = await withAbortTimeout(
          async (signal) => {
            const response = await fetch('/api/pricing/catalog', {
              signal,
              headers: { Accept: 'application/json' },
              cache: 'no-store',
            });
            const body: unknown = await response.json().catch(() => null);
            if (!response.ok) {
              throw new Error(
                readCatalogErrorMessage(
                  body,
                  'We could not load live membership prices. Please try again.',
                ),
              );
            }
            return parsePricingCatalog(body);
          },
          PRICING_CATALOG_TIMEOUT_MS,
          'pricing.catalog.client',
        );
        if (!mounted) return;
        if (catalog.tiers.length === 0) {
          setLoadState({ status: 'empty' });
          return;
        }
        setLoadState({ status: 'ready', catalog });
      } catch (error) {
        if (!mounted) return;
        const timedOut =
          (error instanceof DOMException && error.name === 'AbortError') || isTimeoutError(error);
        if (timedOut) {
          setLoadState({ status: 'empty' });
          return;
        }
        const message = isPricingCatalogError(error)
          ? error.message
          : error instanceof Error
            ? error.message
            : 'We could not load live membership prices. Please try again.';
        setLoadState({ status: 'error', message });
      }
    })();

    return () => {
      mounted = false;
      window.clearTimeout(failSafe);
    };
  }, [retryToken]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const result = await withAbortTimeout(
          async (signal) => {
            const response = await fetch('/api/pricing/tier', { signal, cache: 'no-store' });
            const body: unknown = await response.json().catch(() => null);
            return body;
          },
          PRICING_CATALOG_TIMEOUT_MS,
          'pricing.catalog.current-tier',
        );
        if (!mounted || result === null || typeof result !== 'object') return;
        const tierId = 'tierId' in result ? result.tierId : null;
        if (typeof tierId === 'string' && tierId.length > 0) {
          setCurrentTierId(tierId);
        }
      } catch {
        // Current-tier highlight is optional. Plan cards still render from the catalog.
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSelect = useCallback((plan: PricingPlanCardModel) => {
    if (plan.isFamilyTier) {
      setSelectedFamilyPlan(plan);
      setShowFamilyConfig(true);
      return;
    }
    window.location.href = `/checkout?tier=${encodeURIComponent(plan.id)}&cycle=${billingCycle}`;
  }, [billingCycle]);

  const familyPlan =
    selectedFamilyPlan ??
    (loadState.status === 'ready'
      ? (buildPricingPlanCards(loadState.catalog).find((plan) => plan.isFamilyTier) ?? null)
      : null);

  return (
    <div className={className}>
      <PricingCatalogBody
        loadState={loadState}
        billingCycle={billingCycle}
        onBillingCycleChange={setBillingCycle}
        currentTierId={currentTierId}
        onSelectPlan={handleSelect}
        onRetry={() => setRetryToken((value) => value + 1)}
        showFamilyConfig={showFamilyConfig}
        familyPlan={familyPlan}
        practitionerToggleId={toggleId}
        practitionerRegionId={regionId}
        isPractitionerOpen={isPractitionerOpen}
        onPractitionerToggle={handlePractitionerToggle}
      />
    </div>
  );
}
