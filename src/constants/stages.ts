export const STAGES = [
  "Payment Confirmed",
  "Discovery & Onboarding",
  "Design Phase",
  "Development Phase",
  "Review & Feedback",
  "Final Testing",
  "Launch",
  "Post-Launch Support"
];

export const PACKAGES = [
  "Starter — ₹25,000",
  "Growth — ₹75,000",
  "Elite — ₹2,00,000"
];

export const SERVICE_TYPES = [
  "React Website",
  "Landing Page",
  "SaaS Platform",
  "E-Commerce Store",
  "Portfolio Website",
  "Mobile App UI",
  "Brand Identity + Website",
  "Custom Software",
  "Full Rebrand"
];

/** Deadline in calendar days per package tier */
export const PACKAGE_DEADLINES: Record<string, number> = {
  "Starter":     7,
  "Growth":     31,
  "Elite":      90,
};

/** Extract tier label (e.g. "Starter") from packageTier string */
export function getTierLabel(packageTier: string): string {
  for (const key of Object.keys(PACKAGE_DEADLINES)) {
    if (packageTier.toLowerCase().includes(key.toLowerCase())) return key;
  }
  return "Starter";
}

/** Get deadline days for a given packageTier string */
export function getDeadlineDays(packageTier: string): number {
  const label = getTierLabel(packageTier);
  return PACKAGE_DEADLINES[label] ?? 7;
}
