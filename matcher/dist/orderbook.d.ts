import { EncryptedOrder, Match } from './types';
export declare class OrderBook {
    private buyOrders;
    private sellOrders;
    private dbPath;
    constructor(dbPath?: string);
    addOrder(order: EncryptedOrder): Promise<void>;
    removeOrder(orderId: string): Promise<void>;
    getBuyOrders(): EncryptedOrder[];
    getSellOrders(): EncryptedOrder[];
    findMatches(): Match[];
    private loadOrders;
    private saveOrders;
}
//# sourceMappingURL=orderbook.d.ts.map