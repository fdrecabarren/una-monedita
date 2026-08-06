import { z } from "zod";

export const CurrencySchema = z.enum(["ARS", "USD", "EUR", "BTC", "ETH", "USDT"]);
export type Currency = z.infer<typeof CurrencySchema>;

export const TransactionTypeSchema = z.enum(["Ingreso", "Gasto", "Transferencia"]);
export type TransactionType = z.infer<typeof TransactionTypeSchema>;

export const CategoryKindSchema = z.enum(["Ingreso", "Gasto", "Transferencia"]);
export type CategoryKind = z.infer<typeof CategoryKindSchema>;

// ─── Category ──────────────────────────────────────────────────────────────
export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: CategoryKindSchema.nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  archived: z.boolean(),
});
export type Category = z.infer<typeof CategorySchema>;

// ─── Account ───────────────────────────────────────────────────────────────
export const AccountTypeSchema = z.enum([
  "Banco", "Efectivo", "Tarjeta crédito", "Wallet virtual", "Cripto",
]);
export type AccountType = z.infer<typeof AccountTypeSchema>;

export const AccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: AccountTypeSchema.nullable(),
  currency: CurrencySchema.nullable(),
  initialBalance: z.number().default(0),
  color: z.string().nullable(),
  icon: z.string().nullable(),
  archived: z.boolean(),
});
export type Account = z.infer<typeof AccountSchema>;

// ─── Transaction ───────────────────────────────────────────────────────────
export const TransactionSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: TransactionTypeSchema.nullable(),
  amount: z.number(),
  currency: CurrencySchema.nullable(),
  amountBase: z.number().nullable(),
  fxRate: z.number().nullable(),
  date: z.string().nullable(),
  notes: z.string().nullable(),
  accountId: z.string().nullable(),
  accountToId: z.string().nullable(),
  categoryId: z.string().nullable(),
  subscriptionId: z.string().nullable(),
  createdAt: z.string(),
});
export type Transaction = z.infer<typeof TransactionSchema>;

// ─── Subscription ──────────────────────────────────────────────────────────
export const FrequencySchema = z.enum([
  "Diaria", "Semanal", "Mensual", "Bimestral",
  "Trimestral", "Semestral", "Anual", "Personalizada",
]);
export type Frequency = z.infer<typeof FrequencySchema>;

export const SubscriptionStatusSchema = z.enum(["Activa", "Pausada", "Cancelada"]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const SubscriptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["Gasto", "Ingreso"]).nullable(),
  amount: z.number(),
  currency: CurrencySchema.nullable(),
  frequency: FrequencySchema.nullable(),
  customIntervalDays: z.number().nullable(),
  dueDay: z.number().nullable(),
  startDate: z.string().nullable(),
  nextChargeDate: z.string().nullable(),
  lastChargedDate: z.string().nullable(),
  endDate: z.string().nullable(),
  alertDaysBefore: z.number().default(3),
  autoCreate: z.boolean().default(false),
  status: SubscriptionStatusSchema.nullable(),
  notes: z.string().nullable(),
  accountId: z.string().nullable(),
  categoryId: z.string().nullable(),
});
export type Subscription = z.infer<typeof SubscriptionSchema>;

// ─── Budget ────────────────────────────────────────────────────────────────
export const BudgetSchema = z.object({
  id: z.string(),
  name: z.string(),
  limit: z.number(),
  currency: z.enum(["ARS", "USD", "EUR"]).nullable(),
  month: z.string().nullable(),
  recurring: z.boolean(),
  alertAt80: z.boolean(),
  categoryId: z.string().nullable(),
});
export type Budget = z.infer<typeof BudgetSchema>;

// ─── FxRate ────────────────────────────────────────────────────────────────
export const FxRateSchema = z.object({
  id: z.string(),
  pair: z.string(),
  rate: z.number(),
  date: z.string().nullable(),
  source: z.enum(["exchangerate.host", "CoinGecko", "manual"]).nullable(),
});
export type FxRate = z.infer<typeof FxRateSchema>;
