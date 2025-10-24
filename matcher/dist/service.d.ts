export declare class MatcherService {
    private app;
    private wss;
    private orderBook;
    private port;
    private clients;
    private connection;
    private programId;
    constructor(port?: number);
    private setupRoutes;
    private setupWebSocket;
    private validateOrder;
    private findMatches;
    private verifyPriceCompatibility;
    private simulateHomomorphicComparison;
    private calculateMatchedPrice;
    private calculateMatchedSize;
    private generateZKProof;
    private processMatch;
    private submitSettlement;
    private performBatchMatching;
    private broadcastUpdate;
    start(): void;
}
//# sourceMappingURL=service.d.ts.map