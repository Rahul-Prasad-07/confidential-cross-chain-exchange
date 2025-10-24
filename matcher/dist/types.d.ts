export interface EncryptedOrder {
    id: string;
    side: 'buy' | 'sell';
    price: Uint8Array;
    size: Uint8Array;
    expiry: Uint8Array;
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
    proof: Uint8Array;
    publicInputs: Uint8Array[];
}
//# sourceMappingURL=types.d.ts.map