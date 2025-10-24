export interface EncryptedOrder {
  id: string;
  side: 'buy' | 'sell';
  price: Uint8Array; // encrypted
  size: Uint8Array; // encrypted
  expiry: Uint8Array; // encrypted
  owner: string;
  timestamp: number;
  chain: string;
}

export interface Match {
  id: string;
  buyOrder: EncryptedOrder;
  sellOrder: EncryptedOrder;
  matchedPrice: Uint8Array;
  matchedSize: Uint8Array;
  zkProof: Uint8Array;
  timestamp: number;
}

export interface SettlementProof {
  match: Match;
  proof: Uint8Array; // ZK proof
  publicInputs: Uint8Array[];
}