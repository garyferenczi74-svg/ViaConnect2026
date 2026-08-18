"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { subdivisionLabelForCountry } from "@/lib/location/labels";
import type { LocationOption, StructuredLocation } from "@/lib/location/types";
import { getCircuitBreaker, isCircuitBreakerError } from "@/lib/utils/circuit-breaker";
import { safeLog } from "@/lib/utils/safe-log";
import { isTimeoutError, withAbortTimeout } from "@/lib/utils/with-timeout";
import {
  TypeaheadCombobox,
  type TypeaheadSelection,
} from "./TypeaheadCombobox";

const QUERY_DEBOUNCE_MS = 300;
const SEARCH_TIMEOUT_MS = 2000;
const SEARCH_OP = "location.selector.search";

type SearchKind = "country" | "subdivision" | "city";

type SearchJson = {
  ok?: boolean;
  items?: LocationOption[];
  failOpen?: boolean;
};

type LocationSelectorProps = {
  value: StructuredLocation | null;
  onChange: (next: StructuredLocation | null) => void;
  disabled?: boolean;
  failOpen?: boolean;
  onSubdivisionOptionalChange?: (optional: boolean) => void;
};

function valueKey(loc: StructuredLocation | null): string {
  if (!loc) {
    return "";
  }
  return [
    loc.countryCode,
    loc.countryName,
    loc.subdivisionCode ?? "",
    loc.subdivisionName ?? "",
    loc.city,
    loc.isFreeEntry ? "1" : "0",
  ].join("|");
}

async function searchLocations(input: {
  kind: SearchKind;
  q: string;
  country?: string;
  subdivision?: string;
}): Promise<{ items: LocationOption[]; failOpen: boolean }> {
  const params = new URLSearchParams();
  params.set("kind", input.kind);
  params.set("q", input.q);
  if (input.country) {
    params.set("country", input.country);
  }
  if (input.subdivision) {
    params.set("subdivision", input.subdivision);
  }

  const breaker = getCircuitBreaker(SEARCH_OP);
  try {
    const res = await breaker.execute(() =>
      withAbortTimeout(
        (signal) => fetch(`/api/location/search?${params.toString()}`, { signal }),
        SEARCH_TIMEOUT_MS,
        SEARCH_OP,
      ),
    );

    if (!res.ok) {
      safeLog.warn(SEARCH_OP, "fail_open", {
        reason: "http_error",
        kind: input.kind,
        failOpen: true,
      });
      return { items: [], failOpen: true };
    }

    let body: SearchJson;
    try {
      body = (await res.json()) as SearchJson;
    } catch {
      safeLog.warn(SEARCH_OP, "fail_open", {
        reason: "parse_error",
        kind: input.kind,
        failOpen: true,
      });
      return { items: [], failOpen: true };
    }

    const opened = body.failOpen === true;
    if (opened) {
      safeLog.warn(SEARCH_OP, "fail_open", {
        reason: "response",
        kind: input.kind,
        failOpen: true,
      });
      return { items: [], failOpen: true };
    }

    return {
      items: Array.isArray(body.items) ? body.items : [],
      failOpen: false,
    };
  } catch (err) {
    const timedOut = isTimeoutError(err);
    const reason = timedOut
      ? "timeout"
      : isCircuitBreakerError(err)
        ? "circuit_open"
        : "exception";
    safeLog.warn(SEARCH_OP, "fail_open", {
      reason,
      kind: input.kind,
      timedOut,
      failOpen: true,
    });
    return { items: [], failOpen: true };
  }
}

export function LocationSelector({
  value,
  onChange,
  disabled = false,
  failOpen = false,
  onSubdivisionOptionalChange,
}: LocationSelectorProps) {
  const [country, setCountry] = useState<LocationOption | null>(
    value
      ? { value: value.countryCode, label: value.countryName }
      : null,
  );
  const [subdivision, setSubdivision] = useState<LocationOption | null>(
    value?.subdivisionName || value?.subdivisionCode
      ? {
          value: value.subdivisionCode ?? value.subdivisionName ?? "",
          label: value.subdivisionName ?? value.subdivisionCode ?? "",
        }
      : null,
  );
  const [city, setCity] = useState(value?.city ?? "");

  const [countryQuery, setCountryQuery] = useState(value?.countryName ?? "");
  const [subdivisionQuery, setSubdivisionQuery] = useState(
    value?.subdivisionName ?? "",
  );
  const [cityQuery, setCityQuery] = useState(value?.city ?? "");

  const [countryItems, setCountryItems] = useState<LocationOption[]>([]);
  const [subdivisionItems, setSubdivisionItems] = useState<LocationOption[]>([]);
  const [cityItems, setCityItems] = useState<LocationOption[]>([]);

  const [countryFailOpen, setCountryFailOpen] = useState(false);
  const [subdivisionFailOpen, setSubdivisionFailOpen] = useState(false);
  const [hideSubdivision, setHideSubdivision] = useState(false);

  const [countryIsFree, setCountryIsFree] = useState(false);
  const [subdivisionIsFree, setSubdivisionIsFree] = useState(false);
  const [cityIsFree, setCityIsFree] = useState(value?.isFreeEntry ?? false);

  const lastSynced = useRef(valueKey(value));
  const onSubdivisionOptionalChangeRef = useRef(onSubdivisionOptionalChange);
  onSubdivisionOptionalChangeRef.current = onSubdivisionOptionalChange;
  const debouncedCountryQ = useDebounce(countryQuery, QUERY_DEBOUNCE_MS);
  const debouncedSubdivisionQ = useDebounce(subdivisionQuery, QUERY_DEBOUNCE_MS);
  const debouncedCityQ = useDebounce(cityQuery, QUERY_DEBOUNCE_MS);

  const forcedFailOpen = failOpen || countryFailOpen;
  const countryAllowsFree = failOpen || countryFailOpen;
  const subdivisionAllowsFree =
    failOpen || subdivisionFailOpen || countryFailOpen;
  const cityAllowsFree = true;

  const countryCode = country?.value ?? "";
  const subdivisionLabel = useMemo(
    () => subdivisionLabelForCountry(countryCode),
    [countryCode],
  );

  const showSubdivision =
    (country !== null || forcedFailOpen) &&
    (forcedFailOpen || subdivisionFailOpen || !hideSubdivision);
  const subdivisionOptional = hideSubdivision || forcedFailOpen;

  useEffect(() => {
    onSubdivisionOptionalChangeRef.current?.(subdivisionOptional);
  }, [subdivisionOptional]);

  function emit(next: {
    country: LocationOption | null;
    subdivision: LocationOption | null;
    city: string;
    countryIsFree: boolean;
    subdivisionIsFree: boolean;
    cityIsFree: boolean;
    hideSub: boolean;
  }) {
    if (!next.country) {
      lastSynced.current = "";
      onChange(null);
      return;
    }

    const hidden = next.hideSub && !next.subdivisionIsFree && !failOpen;
    const payload: StructuredLocation = {
      city: next.city,
      subdivisionName: hidden ? null : next.subdivision?.label ?? null,
      subdivisionCode:
        hidden || next.subdivisionIsFree
          ? null
          : next.subdivision?.value ?? null,
      countryName: next.country.label,
      countryCode: next.countryIsFree ? next.country.label : next.country.value,
      isFreeEntry: next.countryIsFree || next.subdivisionIsFree || next.cityIsFree,
    };
    lastSynced.current = valueKey(payload);
    onChange(payload);
  }

  useEffect(() => {
    const key = valueKey(value);
    if (key === lastSynced.current) {
      return;
    }
    lastSynced.current = key;
    if (!value) {
      setCountry(null);
      setCountryQuery("");
      setCountryIsFree(false);
      setCountryItems([]);
      setSubdivision(null);
      setSubdivisionQuery("");
      setSubdivisionIsFree(false);
      setSubdivisionItems([]);
      setHideSubdivision(false);
      setCity("");
      setCityQuery("");
      setCityIsFree(false);
      setCityItems([]);
      return;
    }
    setCountry({ value: value.countryCode, label: value.countryName });
    setCountryQuery(value.countryName);
    setCountryIsFree(false);
    if (value.subdivisionName || value.subdivisionCode) {
      setSubdivision({
        value: value.subdivisionCode ?? value.subdivisionName ?? "",
        label: value.subdivisionName ?? value.subdivisionCode ?? "",
      });
      setSubdivisionQuery(value.subdivisionName ?? "");
    } else {
      setSubdivision(null);
      setSubdivisionQuery("");
    }
    setCity(value.city);
    setCityQuery(value.city);
    setCityIsFree(value.isFreeEntry);
  }, [value]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await searchLocations({
        kind: "country",
        q: debouncedCountryQ,
      });
      if (cancelled) {
        return;
      }
      setCountryItems(result.items);
      setCountryFailOpen(result.failOpen);
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedCountryQ]);

  useEffect(() => {
    if (!country && !forcedFailOpen) {
      setSubdivisionItems([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const result = await searchLocations({
        kind: "subdivision",
        q: debouncedSubdivisionQ,
        country: country?.value ?? "",
      });
      if (cancelled) {
        return;
      }
      setSubdivisionItems(result.items);
      setSubdivisionFailOpen(result.failOpen);
      if (!result.failOpen && debouncedSubdivisionQ.trim() === "") {
        setHideSubdivision(result.items.length === 0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [country, debouncedSubdivisionQ, forcedFailOpen]);

  useEffect(() => {
    if (!country || debouncedCityQ.trim() === "") {
      setCityItems([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const result = await searchLocations({
        kind: "city",
        q: debouncedCityQ,
        country: country.value,
        subdivision: hideSubdivision ? "" : (subdivision?.value ?? ""),
      });
      if (cancelled) {
        return;
      }
      setCityItems(result.items);
    })();
    return () => {
      cancelled = true;
    };
  }, [country, debouncedCityQ, hideSubdivision, subdivision?.value]);

  function clearSubdivisionAndCity() {
    setSubdivision(null);
    setSubdivisionQuery("");
    setSubdivisionItems([]);
    setSubdivisionIsFree(false);
    setHideSubdivision(false);
    setCity("");
    setCityQuery("");
    setCityItems([]);
    setCityIsFree(false);
  }

  function handleCountryQuery(q: string) {
    setCountryQuery(q);
    if (country && q !== country.label) {
      setCountry(null);
      setCountryIsFree(false);
      clearSubdivisionAndCity();
      lastSynced.current = "";
      onChange(null);
    }
  }

  function handleCountryChange(next: TypeaheadSelection) {
    const selected = { value: next.value, label: next.label };
    if (
      country &&
      country.value === selected.value &&
      country.label === selected.label
    ) {
      setCountryQuery(next.label);
      return;
    }
    setCountry(selected);
    setCountryQuery(next.label);
    setCountryIsFree(next.isFreeEntry);
    clearSubdivisionAndCity();
    const payload: StructuredLocation = {
      city: "",
      subdivisionName: null,
      subdivisionCode: null,
      countryName: next.label,
      countryCode: next.isFreeEntry ? next.label : next.value,
      isFreeEntry: next.isFreeEntry,
    };
    lastSynced.current = valueKey(payload);
    onChange(payload);
  }

  function handleSubdivisionQuery(q: string) {
    setSubdivisionQuery(q);
    if (subdivision && q !== subdivision.label) {
      setSubdivision(null);
      setSubdivisionIsFree(false);
      setCity("");
      setCityQuery("");
      setCityItems([]);
      setCityIsFree(false);
      emit({
        country,
        subdivision: null,
        city: "",
        countryIsFree,
        subdivisionIsFree: false,
        cityIsFree: false,
        hideSub: hideSubdivision,
      });
    }
  }

  function handleSubdivisionChange(next: TypeaheadSelection) {
    const selected = { value: next.value, label: next.label };
    if (
      subdivision &&
      subdivision.value === selected.value &&
      subdivision.label === selected.label
    ) {
      setSubdivisionQuery(next.label);
      return;
    }
    setSubdivision(selected);
    setSubdivisionQuery(next.label);
    setSubdivisionIsFree(next.isFreeEntry);
    setCity("");
    setCityQuery("");
    setCityItems([]);
    setCityIsFree(false);
    emit({
      country,
      subdivision: selected,
      city: "",
      countryIsFree,
      subdivisionIsFree: next.isFreeEntry,
      cityIsFree: false,
      hideSub: false,
    });
  }

  function handleCityQuery(q: string) {
    setCityQuery(q);
    if (city && q !== city) {
      setCity("");
      setCityIsFree(false);
      emit({
        country,
        subdivision,
        city: "",
        countryIsFree,
        subdivisionIsFree,
        cityIsFree: false,
        hideSub: hideSubdivision,
      });
    }
  }

  function handleCityChange(next: TypeaheadSelection) {
    setCity(next.value);
    setCityQuery(next.label);
    setCityIsFree(next.isFreeEntry);
    emit({
      country,
      subdivision,
      city: next.value,
      countryIsFree,
      subdivisionIsFree,
      cityIsFree: next.isFreeEntry,
      hideSub: hideSubdivision,
    });
  }

  const dependentsEnabled =
    !disabled && (country !== null || forcedFailOpen);
  const cityEnabled =
    dependentsEnabled &&
    (!showSubdivision || subdivision !== null || subdivisionAllowsFree);

  return (
    <div className="flex w-full flex-col gap-5">
      <TypeaheadCombobox
        id="location-country"
        label="Country"
        placeholder="Start typing a country"
        value={countryQuery}
        onChange={handleCountryChange}
        items={countryItems}
        onQuery={handleCountryQuery}
        disabled={disabled}
        required
        allowFreeEntry={countryAllowsFree}
      />
      {showSubdivision ? (
        <TypeaheadCombobox
          id="location-subdivision"
          label={subdivisionLabel}
          placeholder={`Start typing a ${subdivisionLabel.toLowerCase()}`}
          value={subdivisionQuery}
          onChange={handleSubdivisionChange}
          items={subdivisionItems}
          onQuery={handleSubdivisionQuery}
          disabled={!dependentsEnabled}
          required={!hideSubdivision && !subdivisionAllowsFree}
          allowFreeEntry={subdivisionAllowsFree}
        />
      ) : null}
      <TypeaheadCombobox
        id="location-city"
        label="City"
        placeholder="Start typing a city"
        value={cityQuery}
        onChange={handleCityChange}
        items={cityItems}
        onQuery={handleCityQuery}
        disabled={!cityEnabled}
        required
        allowFreeEntry={cityAllowsFree}
      />
    </div>
  );
}
