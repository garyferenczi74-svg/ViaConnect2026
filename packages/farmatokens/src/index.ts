export type TokenTransaction = {
  id: string;
  userId: string;
  amount: number;
  type: 'earn' | 'spend' | 'transfer' | 'expire';
  description: string;
  createdAt: Date;
};

export type TokenBalance = {
  userId: string;
  available: number;
  pending: number;
  lifetime: number;
};

export function calculateBalance(_transactions: TokenTransaction[]): TokenBalance {
  // Placeholder
  return {
    userId: '',
    available: 0,
    pending: 0,
    lifetime: 0,
  };
}
