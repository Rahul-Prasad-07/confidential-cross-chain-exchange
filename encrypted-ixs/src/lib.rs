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
}
