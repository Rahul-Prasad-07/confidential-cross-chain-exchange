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
}
