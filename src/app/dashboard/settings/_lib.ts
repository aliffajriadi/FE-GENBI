
export type Period = { id: string; name: string; startDate: string; endDate: string; isActive: boolean };
export type Role = { id: string; key: string; name: string; permissions: string[] };
export type Perm = { key: string; label: string };
export type IgStatus = { appId: string; configId: string; hasSecret: boolean; redirectUri: string; webhookUrl: string; webhookVerifyToken: string; connected: boolean; username: string | null; expiresAt: string | null; connectedAt: string | null; feedAt: string | null };

export type Site = { heroImage: string | null; heroAlt?: string; headline: string; subheadline?: string };
