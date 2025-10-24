use arcis_imports::*;

#[encrypted]
mod circuits {
    use arcis_imports::*;

    pub struct InputValues {
        v1: u8,
        v2: u8,
    }

    #[instruction]
    pub fn add_together(input_ctxt: Enc<Shared, InputValues>) -> Enc<Shared, u16> {
        let input = input_ctxt.to_arcis();
        let sum = input.v1 as u16 + input.v2 as u16;
        input_ctxt.owner.from_arcis(sum)
    }

    // === New encrypted instructions ===
    pub struct RelayOfferInput {
        offer_id: u64,
    }

    pub struct RelayOfferOutput {
        cloned_offer: u64,
    }

    #[instruction]
    pub fn relay_offer_clone(
        input_ctxt: Enc<Shared, RelayOfferInput>,
    ) -> Enc<Shared, RelayOfferOutput> {
        let input = input_ctxt.to_arcis();
        let cloned_offer = input.offer_id;
        input_ctxt
            .owner
            .from_arcis(RelayOfferOutput { cloned_offer })
    }

    pub struct DepositInput {
        amount: u64,
    }

    pub struct DepositOutput {
        processed_amount: u64,
    }

    #[instruction]
    pub fn confidential_deposit_native(
        input_ctxt: Enc<Shared, DepositInput>,
    ) -> Enc<Shared, DepositOutput> {
        let input = input_ctxt.to_arcis();
        let processed_amount = input.amount;
        input_ctxt
            .owner
            .from_arcis(DepositOutput { processed_amount })
    }

    pub struct DepositSplInput {
        offer_id: u64,
        amount: u64,
    }

    pub struct DepositSplOutput {
        processed_offer_id: u64,
        processed_amount: u64,
    }

    #[instruction]
    pub fn interchain_origin_evm_deposit_seller_spl(
        input_ctxt: Enc<Shared, DepositSplInput>,
    ) -> Enc<Shared, DepositSplOutput> {
        let input = input_ctxt.to_arcis();
        let processed_offer_id = input.offer_id;
        let processed_amount = input.amount;
        input_ctxt
            .owner
            .from_arcis(DepositSplOutput { processed_offer_id, processed_amount })
    }

    pub struct DepositSellerNativeInput {
        offer_id: u64,
        amount: u64,
    }

    pub struct DepositSellerNativeOutput {
        processed_offer_id: u64,
        processed_amount: u64,
    }

    #[instruction]
    pub fn deposit_seller_native(
        input_ctxt: Enc<Shared, DepositSellerNativeInput>,
    ) -> Enc<Shared, DepositSellerNativeOutput> {
        let input = input_ctxt.to_arcis();
        let processed_offer_id = input.offer_id;
        let processed_amount = input.amount;
        input_ctxt
            .owner
            .from_arcis(DepositSellerNativeOutput { processed_offer_id, processed_amount })
    }

    pub struct DepositSellerSPLInput {
        offer_id: u64,
        amount: u64,
    }

    pub struct DepositSellerSPLOutput {
        processed_offer_id: u64,
        processed_amount: u64,
    }

    #[instruction]
    pub fn deposit_seller_spl(
        input_ctxt: Enc<Shared, DepositSellerSPLInput>,
    ) -> Enc<Shared, DepositSellerSPLOutput> {
        let input = input_ctxt.to_arcis();
        let processed_offer_id = input.offer_id;
        let processed_amount = input.amount;
        input_ctxt
            .owner
            .from_arcis(DepositSellerSPLOutput { processed_offer_id, processed_amount })
    }

    pub struct FinalizeInterchainInput {
        offer_id: u64,
    }

    pub struct FinalizeInterchainOutput {
        finalized_offer_id: u64,
    }

    #[instruction]
    pub fn finalize_interchain_origin_evm_offer(
        input_ctxt: Enc<Shared, FinalizeInterchainInput>,
    ) -> Enc<Shared, FinalizeInterchainOutput> {
        let input = input_ctxt.to_arcis();
        let finalized_offer_id = input.offer_id;
        input_ctxt
            .owner
            .from_arcis(FinalizeInterchainOutput { finalized_offer_id })
    }

    pub struct FinalizeIntrachainInput {
        offer_id: u64,
    }

    pub struct FinalizeIntrachainOutput {
        finalized_offer_id: u64,
    }

    #[instruction]
    pub fn finalize_intrachain_offer(
        input_ctxt: Enc<Shared, FinalizeIntrachainInput>,
    ) -> Enc<Shared, FinalizeIntrachainOutput> {
        let input = input_ctxt.to_arcis();
        let finalized_offer_id = input.offer_id;
        input_ctxt
            .owner
            .from_arcis(FinalizeIntrachainOutput { finalized_offer_id })
    }

    // === Matching Engine Circuits ===

    #[derive(Clone, Copy)]
    pub struct SubmitOrderInput {
        order_id: u64,
        side: u8, // 0: buy, 1: sell
        price: u64,
        size: u64,
        expiry: u64,
    }

    pub struct SubmitOrderOutput {
        order_digest: u64,
    }

    #[instruction]
    pub fn submit_order(
        input_ctxt: Enc<Shared, SubmitOrderInput>,
    ) -> Enc<Shared, SubmitOrderOutput> {
        let input = input_ctxt.to_arcis();
        // Basic validation using conditional clamps (avoid assert macro)
        let price = if input.price == 0 { 1 } else { input.price };
        let size = if input.size == 0 { 1 } else { input.size };
        let side = if input.side == 0 || input.side == 1 { input.side } else { 0 };
        let order_digest = input.order_id + price + size + side as u64;
        input_ctxt.owner.from_arcis(SubmitOrderOutput { order_digest })
    }

    // Arcis constraints: avoid Vec, while, ranges. Use fixed-size arrays.
    pub const MAX_ORDERS: usize = 2;

    pub struct MatchOrdersInput {
        orders: [SubmitOrderInput; MAX_ORDERS],
        n_orders: u8,
    }

    #[derive(Clone, Copy)]
    pub struct Match {
        buy_order_id: u64,
        sell_order_id: u64,
        matched_price: u64,
        matched_size: u64,
    }

    pub struct MatchOrdersOutput {
        matches: [Match; MAX_ORDERS],
        n_matches: u8,
        residuals: [SubmitOrderInput; MAX_ORDERS],
        n_residuals: u8,
    }

    #[instruction]
    pub fn match_orders(
        input_ctxt: Enc<Shared, MatchOrdersInput>,
    ) -> Enc<Shared, MatchOrdersOutput> {
        let input = input_ctxt.to_arcis();

        // Prepare outputs
        let mut matches: [Match; MAX_ORDERS] = [Match { buy_order_id: 0, sell_order_id: 0, matched_price: 0, matched_size: 0 }; MAX_ORDERS];
        let mut residuals: [SubmitOrderInput; MAX_ORDERS] = [SubmitOrderInput { order_id: 0, side: 0, price: 0, size: 0, expiry: 0 }; MAX_ORDERS];
        let mut n_matches: u8 = 0;
        let mut n_residuals: u8 = 0;

        // Copy sizes into mutable remaining array
        let mut remaining: [u64; MAX_ORDERS] = [0u64; MAX_ORDERS];
        let n = input.n_orders as usize;
        for i in 0..MAX_ORDERS {
            if i < n {
                remaining[i] = input.orders[i].size;
            } else {
                remaining[i] = 0;
            }
        }

        // Naive pairwise matching: for each buy, scan sells and match when prices permit
        for i in 0..MAX_ORDERS {
            if i < n {
                let oi = input.orders[i];
                if oi.side == 0 && remaining[i] > 0 {
                    for j in 0..MAX_ORDERS {
                        if j < n {
                            if remaining[i] == 0 {
                                // Skip if buy order is fully matched
                            } else {
                                let oj = input.orders[j];
                                if oj.side == 1 && remaining[j] > 0 && oi.price >= oj.price {
                                    // matched size
                                    let matched = if remaining[i] < remaining[j] { remaining[i] } else { remaining[j] };
                                    if matched > 0 && (n_matches as usize) < MAX_ORDERS {
                                        matches[n_matches as usize] = Match { buy_order_id: oi.order_id, sell_order_id: oj.order_id, matched_price: oj.price, matched_size: matched };
                                        n_matches += 1;
                                        remaining[i] -= matched;
                                        remaining[j] -= matched;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Collect residuals
        for i in 0..MAX_ORDERS {
            if i < n {
                if remaining[i] > 0 && (n_residuals as usize) < MAX_ORDERS {
                    let mut r = input.orders[i];
                    r.size = remaining[i];
                    residuals[n_residuals as usize] = r;
                    n_residuals += 1;
                }
            }
        }

        input_ctxt.owner.from_arcis(MatchOrdersOutput { matches, n_matches, residuals, n_residuals })
    }

    pub struct CancelOrderInput {
        order_id: u64,
        owner_proof: u64, // Simplified proof
    }

    pub struct CancelOrderOutput {
        cancelled_order_id: u64,
    }

    #[instruction]
    pub fn cancel_order(
        input_ctxt: Enc<Shared, CancelOrderInput>,
    ) -> Enc<Shared, CancelOrderOutput> {
        let input = input_ctxt.to_arcis();
        // In production, verify owner_proof against order ownership
        let cancelled_order_id = input.order_id;
        input_ctxt.owner.from_arcis(CancelOrderOutput { cancelled_order_id })
    }

    pub struct SettleMatchInput {
        match_details: Match,
        deposit_proofs: [u64; 4], // Simplified fixed-size
        n_deposit_proofs: u8,
    }

    #[derive(Clone, Copy)]
    pub struct SettlementDirective {
        order_id: u64,
        amount: u64,
        asset_type: u8, // 0: native, 1: spl
    }

    pub struct SettleMatchOutput {
        settlement_directives: [SettlementDirective; 4],
        n_directives: u8,
    }

    #[instruction]
    pub fn settle_match(
        input_ctxt: Enc<Shared, SettleMatchInput>,
    ) -> Enc<Shared, SettleMatchOutput> {
        let input = input_ctxt.to_arcis();
        let mut directives: [SettlementDirective; 4] = [SettlementDirective { order_id: 0, amount: 0, asset_type: 0 }; 4];
        directives[0] = SettlementDirective { order_id: input.match_details.buy_order_id, amount: input.match_details.matched_size * input.match_details.matched_price, asset_type: 0 };
        directives[1] = SettlementDirective { order_id: input.match_details.sell_order_id, amount: input.match_details.matched_size, asset_type: 1 };
        let n_directives: u8 = 2;
        input_ctxt.owner.from_arcis(SettleMatchOutput { settlement_directives: directives, n_directives })
    }
}