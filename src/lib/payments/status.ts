export function isMembershipActive(until: string) {
  return Date.parse(until) > Date.now();
}
