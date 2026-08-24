/** Longest matching nav href wins so /body-tracker does not steal Connections. */

export function isNavHrefActive(
  pathname: string,
  href: string,
  allHrefs: readonly string[],
  exactOnlyHrefs: readonly string[] = [],
): boolean {
  if (pathname === href) return true;
  if (exactOnlyHrefs.includes(href)) return false;
  if (!pathname.startsWith(`${href}/`)) return false;
  return !allHrefs.some(
    (other) =>
      other !== href &&
      other.startsWith(`${href}/`) &&
      (pathname === other || pathname.startsWith(`${other}/`)),
  );
}
