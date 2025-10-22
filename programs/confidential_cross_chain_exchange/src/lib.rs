use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;

const COMP_DEF_OFFSET_ADD_Together: u32 = comp_def_offset("add_together");
const COMP_DEF_OFFSET_RELAY_OFFER_CLONE: u32 = comp_def_offset("relay_offer_clone");
const COMP_DEF_OFFSET_CONFIDENTIAL_DEPOSIT_NATIVE: u32 = comp_def_offset("confidential_deposit_native");
const COMP_DEF_OFFSET_INTERCHAIN_ORIGIN_EVM_DEPOSIT_SELLER_SPL: u32 = comp_def_offset("interchain_origin_evm_deposit_seller_spl");
const COMP_DEF_OFFSET_FINALIZE_INTERCHAIN_ORIGIN_EVM_OFFER: u32 = comp_def_offset("finalize_interchain_origin_evm_offer");
const COMP_DEF_OFFSET_DEPOSIT_SELLER_NATIVE: u32 = comp_def_offset("deposit_seller_native");
const COMP_DEF_OFFSET_DEPOSIT_SELLER_SPL: u32 = comp_def_offset("deposit_seller_spl");
const COMP_DEF_OFFSET_FINALIZE_INTRACHAIN_OFFER: u32 = comp_def_offset("finalize_intrachain_offer");


declare_id!("DzueqW4xsJRhv5pQdcwTsWgeKcV2xfEoKRALN4Ma8dHd");

#[arcium_program]
pub mod confidential_cross_chain_exchange {
    use super::*;

    pub fn init_add_together_comp_def(ctx: Context<InitAddTogetherCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, true, 0, None, None)?;
        Ok(())
    }

    pub fn add_together(
        ctx: Context<AddTogether>,
        computation_offset: u64,
        ciphertext_0: [u8; 32],
        ciphertext_1: [u8; 32],
        pub_key: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        let args = vec![
            Argument::ArcisPubkey(pub_key),
            Argument::PlaintextU128(nonce),
            Argument::EncryptedU8(ciphertext_0),
            Argument::EncryptedU8(ciphertext_1),
        ];

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![AddTogetherCallback::callback_ix(&[])],
        )?;

        Ok(())
    }

    pub fn init_relay_offer_clone_comp_def(ctx: Context<InitRelayOfferCloneCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, true, 0, None, None)?;
        Ok(())
    }

    pub fn init_confidential_deposit_native_comp_def(ctx: Context<InitConfidentialDepositNativeCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, true, 0, None, None)?;
        Ok(())
    }

    pub fn init_interchain_origin_evm_deposit_seller_spl_comp_def(ctx: Context<InitInterchainOriginEvmDepositSellerSplCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, true, 0, None, None)?;
        Ok(())
    }

    pub fn init_finalize_interchain_origin_evm_offer_comp_def(ctx: Context<InitFinalizeInterchainOriginEvmOfferCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, true, 0, None, None)?;
        Ok(())
    }

    pub fn init_deposit_seller_native_comp_def(ctx: Context<InitDepositSellerNativeCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, true, 0, None, None)?;
        Ok(())
    }

    pub fn init_deposit_seller_spl_comp_def(ctx: Context<InitDepositSellerSplCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, true, 0, None, None)?;
        Ok(())
    }


    pub fn relay_offer_clone(
        ctx: Context<RelayOfferClone>,
        computation_offset: u64,
        ciphertext_offer_id: [u8; 32],
        pub_key: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        let args = vec![
            Argument::ArcisPubkey(pub_key),
            Argument::PlaintextU128(nonce),
            Argument::EncryptedU64(ciphertext_offer_id),
        ];

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![RelayOfferCloneCallback::callback_ix(&[])],
        )?;

        Ok(())
    }

    pub fn confidential_deposit_native(
        ctx: Context<ConfidentialDepositNative>,
        computation_offset: u64,
        ciphertext_amount: [u8; 32],
        pub_key: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        let args = vec![
            Argument::ArcisPubkey(pub_key),
            Argument::PlaintextU128(nonce),
            Argument::EncryptedU64(ciphertext_amount),
        ];

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![ConfidentialDepositNativeCallback::callback_ix(&[])],
        )?;

        Ok(())
    }

    pub fn interchain_origin_evm_deposit_seller_spl(
        ctx: Context<InterchainOriginEvmDepositSellerSpl>,
        computation_offset: u64,
        ciphertext_offer_id: [u8; 32],
        ciphertext_amount: [u8; 32],
        pub_key: [u8; 32],
        nonce: u128,
        is_taker_native: bool,
    ) -> Result<()> {
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        let args = vec![
            Argument::ArcisPubkey(pub_key),
            Argument::PlaintextU128(nonce),
            Argument::EncryptedU64(ciphertext_offer_id),
            Argument::EncryptedU64(ciphertext_amount),
            Argument::PlaintextBool(is_taker_native),
        ];

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![InterchainOriginEvmDepositSellerSplCallback::callback_ix(&[])],
        )?;

        Ok(())
    }

    pub fn finalize_interchain_origin_evm_offer(
        ctx: Context<FinalizeInterchainOriginEvmOffer>,
        computation_offset: u64,
        ciphertext_offer_id: [u8; 32],
        pub_key: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        let args = vec![
            Argument::ArcisPubkey(pub_key),
            Argument::PlaintextU128(nonce),
            Argument::EncryptedU64(ciphertext_offer_id),
        ];

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![FinalizeInterchainOriginEvmOfferCallback::callback_ix(&[])],
        )?;

        Ok(())
    }

    pub fn deposit_seller_native(
        ctx: Context<DepositSellerNative>,
        computation_offset: u64,
        ciphertext_offer_id: [u8; 32],
        ciphertext_amount: [u8; 32],
        pub_key: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        let args = vec![
            Argument::ArcisPubkey(pub_key),
            Argument::PlaintextU128(nonce),
            Argument::EncryptedU64(ciphertext_offer_id),
            Argument::EncryptedU64(ciphertext_amount),
        ];

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![DepositSellerNativeCallback::callback_ix(&[])],
        )?;

        Ok(())
    }

    pub fn deposit_seller_spl(
        ctx: Context<DepositSellerSpl>,
        computation_offset: u64,
        ciphertext_offer_id: [u8; 32],
        ciphertext_amount: [u8; 32],
        pub_key: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        let args = vec![
            Argument::ArcisPubkey(pub_key),
            Argument::PlaintextU128(nonce),
            Argument::EncryptedU64(ciphertext_offer_id),
            Argument::EncryptedU64(ciphertext_amount),
        ];

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![DepositSellerSplCallback::callback_ix(&[])],
        )?;

        Ok(())
    }

    pub fn finalize_intrachain_offer(
        ctx: Context<FinalizeIntrachainOffer>,
        computation_offset: u64,
        ciphertext_offer_id: [u8; 32],
        pub_key: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        let args = vec![
            Argument::ArcisPubkey(pub_key),
            Argument::PlaintextU128(nonce),
            Argument::EncryptedU64(ciphertext_offer_id),
        ];

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![FinalizeIntrachainOfferCallback::callback_ix(&[])],
        )?;

        Ok(())
    }


    #[arcium_callback(encrypted_ix = "add_together")]
    pub fn add_together_callback(
        ctx: Context<AddTogetherCallback>,
        output: ComputationOutputs<AddTogetherOutput>,
    ) -> Result<()> {
        let o = match output {
            ComputationOutputs::Success(AddTogetherOutput { field_0 }) => field_0,
            _ => return Err(ErrorCode::AbortedComputation.into()),
        };

        emit!(SumEvent {
            sum: o.ciphertexts[0],
            nonce: o.nonce.to_le_bytes(),
        });
        Ok(())
    }

        #[arcium_callback(encrypted_ix = "relay_offer_clone")]
    pub fn relay_offer_clone_callback(
        ctx: Context<RelayOfferCloneCallback>,
        output: ComputationOutputs<RelayOfferCloneOutput>,
    ) -> Result<()> {
        let o = match output {
            ComputationOutputs::Success(RelayOfferCloneOutput { field_0 }) => field_0,
            _ => return Err(ErrorCode::AbortedComputation.into()),
        };

        emit!(RelayOfferClonedEvent {
            cloned_offer: o.ciphertexts[0],
            nonce: o.nonce.to_le_bytes(),
        });
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "confidential_deposit_native")]
    pub fn confidential_deposit_native_callback(
        ctx: Context<ConfidentialDepositNativeCallback>,
        output: ComputationOutputs<ConfidentialDepositNativeOutput>,
    ) -> Result<()> {
        let o = match output {
            ComputationOutputs::Success(ConfidentialDepositNativeOutput { field_0 }) => field_0,
            _ => return Err(ErrorCode::AbortedComputation.into()),
        };

        emit!(ConfidentialDepositNativeEvent {
            processed_amount: o.ciphertexts[0],
            nonce: o.nonce.to_le_bytes(),
        });
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "interchain_origin_evm_deposit_seller_spl")]
    pub fn interchain_origin_evm_deposit_seller_spl_callback(
        ctx: Context<InterchainOriginEvmDepositSellerSplCallback>,
        output: ComputationOutputs<InterchainOriginEvmDepositSellerSplOutput>,
    ) -> Result<()> {
        let o = match output {
            ComputationOutputs::Success(InterchainOriginEvmDepositSellerSplOutput { field_0 }) => field_0,
            _ => return Err(ErrorCode::AbortedComputation.into()),
        };

        emit!(InterchainOriginEvmDepositSellerSplEvent {
            processed_offer_id: o.ciphertexts[0],
            processed_amount: o.ciphertexts[1],
            nonce: o.nonce.to_le_bytes(),
        });
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "finalize_interchain_origin_evm_offer")]
    pub fn finalize_interchain_origin_evm_offer_callback(
        ctx: Context<FinalizeInterchainOriginEvmOfferCallback>,
        output: ComputationOutputs<FinalizeInterchainOriginEvmOfferOutput>,
    ) -> Result<()> {
        let o = match output {
            ComputationOutputs::Success(FinalizeInterchainOriginEvmOfferOutput { field_0 }) => field_0,
            _ => return Err(ErrorCode::AbortedComputation.into()),
        };

        emit!(FinalizeInterchainOriginEvmOfferEvent {
            finalized_offer_id: o.ciphertexts[0],
            nonce: o.nonce.to_le_bytes(),
        });
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "deposit_seller_native")]
    pub fn deposit_seller_native_callback(
        ctx: Context<DepositSellerNativeCallback>,
        output: ComputationOutputs<DepositSellerNativeOutput>,
    ) -> Result<()> {
        let o = match output {
            ComputationOutputs::Success(DepositSellerNativeOutput { field_0 }) => field_0,
            _ => return Err(ErrorCode::AbortedComputation.into()),
        };

        emit!(DepositSellerNativeEvent {
            processed_offer_id: o.ciphertexts[0],
            processed_amount: o.ciphertexts[1],
            nonce: o.nonce.to_le_bytes(),
        });
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "deposit_seller_spl")]
    pub fn deposit_seller_spl_callback(
        ctx: Context<DepositSellerSplCallback>,
        output: ComputationOutputs<DepositSellerSplOutput>,
    ) -> Result<()> {
        let o = match output {
            ComputationOutputs::Success(DepositSellerSplOutput { field_0 }) => field_0,
            _ => return Err(ErrorCode::AbortedComputation.into()),
        };

        emit!(DepositSellerSplEvent {
            processed_offer_id: o.ciphertexts[0],
            processed_amount: o.ciphertexts[1],
            nonce: o.nonce.to_le_bytes(),
        });
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "finalize_intrachain_offer")]
    pub fn finalize_intrachain_offer_callback(
        ctx: Context<FinalizeIntrachainOfferCallback>,
        output: ComputationOutputs<FinalizeIntrachainOfferOutput>,
    ) -> Result<()> {
        let o = match output {
            ComputationOutputs::Success(FinalizeIntrachainOfferOutput { field_0 }) => field_0,
            _ => return Err(ErrorCode::AbortedComputation.into()),
        };

        emit!(FinalizeIntrachainOfferEvent {
            finalized_offer_id: o.ciphertexts[0],
            nonce: o.nonce.to_le_bytes(),
        });
        Ok(())
    }
}

#[queue_computation_accounts("add_together", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct AddTogether<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, SignerAccount>,
    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Account<'info, MXEAccount>,
    #[account(
        mut,
        address = derive_mempool_pda!()
    )]
    /// CHECK: mempool_account, checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_execpool_pda!()
    )]
    /// CHECK: executing_pool, checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_comp_pda!(computation_offset)
    )]
    /// CHECK: computation_account, checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_ADD_Together)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(
        mut,
        address = derive_cluster_pda!(mxe_account)
    )]
    pub cluster_account: Account<'info, Cluster>,
    #[account(
        mut,
        address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS,
    )]
    pub pool_account: Account<'info, FeePool>,
    #[account(
        address = ARCIUM_CLOCK_ACCOUNT_ADDRESS
    )]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}


#[queue_computation_accounts("relay_offer_clone", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct RelayOfferClone<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, SignerAccount>,
    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Account<'info, MXEAccount>,
    #[account(
        mut,
        address = derive_mempool_pda!()
    )]
    /// CHECK: mempool_account, checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_execpool_pda!()
    )]
    /// CHECK: executing_pool, checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_comp_pda!(computation_offset)
    )]
    /// CHECK: computation_account, checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_RELAY_OFFER_CLONE)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(
        mut,
        address = derive_cluster_pda!(mxe_account)
    )]
    pub cluster_account: Account<'info, Cluster>,
    #[account(
        mut,
        address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS,
    )]
    pub pool_account: Account<'info, FeePool>,
    #[account(
        address = ARCIUM_CLOCK_ACCOUNT_ADDRESS
    )]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[queue_computation_accounts("confidential_deposit_native", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct ConfidentialDepositNative<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, SignerAccount>,
    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Account<'info, MXEAccount>,
    #[account(
        mut,
        address = derive_mempool_pda!()
    )]
    /// CHECK: mempool_account, checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_execpool_pda!()
    )]
    /// CHECK: executing_pool, checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_comp_pda!(computation_offset)
    )]
    /// CHECK: computation_account, checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_CONFIDENTIAL_DEPOSIT_NATIVE)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(
        mut,
        address = derive_cluster_pda!(mxe_account)
    )]
    pub cluster_account: Account<'info, Cluster>,
    #[account(
        mut,
        address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS,
    )]
    pub pool_account: Account<'info, FeePool>,
    #[account(
        address = ARCIUM_CLOCK_ACCOUNT_ADDRESS
    )]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[queue_computation_accounts("interchain_origin_evm_deposit_seller_spl", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct InterchainOriginEvmDepositSellerSpl<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, SignerAccount>,
    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Account<'info, MXEAccount>,
    #[account(
        mut,
        address = derive_mempool_pda!()
    )]
    /// CHECK: mempool_account, checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_execpool_pda!()
    )]
    /// CHECK: executing_pool, checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_comp_pda!(computation_offset)
    )]
    /// CHECK: computation_account, checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_INTERCHAIN_ORIGIN_EVM_DEPOSIT_SELLER_SPL)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(
        mut,
        address = derive_cluster_pda!(mxe_account)
    )]
    pub cluster_account: Account<'info, Cluster>,
    #[account(
        mut,
        address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS,
    )]
    pub pool_account: Account<'info, FeePool>,
    #[account(
        address = ARCIUM_CLOCK_ACCOUNT_ADDRESS
    )]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[queue_computation_accounts("finalize_interchain_origin_evm_offer", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct FinalizeInterchainOriginEvmOffer<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, SignerAccount>,
    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Account<'info, MXEAccount>,
    #[account(
        mut,
        address = derive_mempool_pda!()
    )]
    /// CHECK: mempool_account, checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_execpool_pda!()
    )]
    /// CHECK: executing_pool, checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_comp_pda!(computation_offset)
    )]
    /// CHECK: computation_account, checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_FINALIZE_INTERCHAIN_ORIGIN_EVM_OFFER)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(
        mut,
        address = derive_cluster_pda!(mxe_account)
    )]
    pub cluster_account: Account<'info, Cluster>,
    #[account(
        mut,
        address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS,
    )]
    pub pool_account: Account<'info, FeePool>,
    #[account(
        address = ARCIUM_CLOCK_ACCOUNT_ADDRESS
    )]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[queue_computation_accounts("deposit_seller_native", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct DepositSellerNative<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, SignerAccount>,
    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Account<'info, MXEAccount>,
    #[account(
        mut,
        address = derive_mempool_pda!()
    )]
    /// CHECK: mempool_account, checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_execpool_pda!()
    )]
    /// CHECK: executing_pool, checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_comp_pda!(computation_offset)
    )]
    /// CHECK: computation_account, checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_DEPOSIT_SELLER_NATIVE)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(
        mut,
        address = derive_cluster_pda!(mxe_account)
    )]
    pub cluster_account: Account<'info, Cluster>,
    #[account(
        mut,
        address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS,
    )]
    pub pool_account: Account<'info, FeePool>,
    #[account(
        address = ARCIUM_CLOCK_ACCOUNT_ADDRESS
    )]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[queue_computation_accounts("deposit_seller_spl", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct DepositSellerSpl<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, SignerAccount>,
    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Account<'info, MXEAccount>,
    #[account(
        mut,
        address = derive_mempool_pda!()
    )]
    /// CHECK: mempool_account, checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_execpool_pda!()
    )]
    /// CHECK: executing_pool, checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_comp_pda!(computation_offset)
    )]
    /// CHECK: computation_account, checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_DEPOSIT_SELLER_SPL)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(
        mut,
        address = derive_cluster_pda!(mxe_account)
    )]
    pub cluster_account: Account<'info, Cluster>,
    #[account(
        mut,
        address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS,
    )]
    pub pool_account: Account<'info, FeePool>,
    #[account(
        address = ARCIUM_CLOCK_ACCOUNT_ADDRESS
    )]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}



#[callback_accounts("add_together")]
#[derive(Accounts)]
pub struct AddTogetherCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_ADD_Together)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
}

#[callback_accounts("relay_offer_clone")]
#[derive(Accounts)]
pub struct RelayOfferCloneCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_RELAY_OFFER_CLONE)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
}

#[callback_accounts("confidential_deposit_native")]
#[derive(Accounts)]
pub struct ConfidentialDepositNativeCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_CONFIDENTIAL_DEPOSIT_NATIVE)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
}

#[callback_accounts("interchain_origin_evm_deposit_seller_spl")]
#[derive(Accounts)]
pub struct InterchainOriginEvmDepositSellerSplCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_INTERCHAIN_ORIGIN_EVM_DEPOSIT_SELLER_SPL)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
}

#[callback_accounts("finalize_interchain_origin_evm_offer")]
#[derive(Accounts)]
pub struct FinalizeInterchainOriginEvmOfferCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_FINALIZE_INTERCHAIN_ORIGIN_EVM_OFFER)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
}

#[callback_accounts("deposit_seller_native")]
#[derive(Accounts)]
pub struct DepositSellerNativeCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_DEPOSIT_SELLER_NATIVE)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
}

#[callback_accounts("deposit_seller_spl")]
#[derive(Accounts)]
pub struct DepositSellerSplCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_DEPOSIT_SELLER_SPL)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
}

#[callback_accounts("finalize_intrachain_offer")]
#[derive(Accounts)]
pub struct FinalizeIntrachainOfferCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_FINALIZE_INTRACHAIN_OFFER)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
}



#[init_computation_definition_accounts("add_together", payer)]
#[derive(Accounts)]
pub struct InitAddTogetherCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program.
    /// Can't check it here as it's not initialized yet.
    pub comp_def_account: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("relay_offer_clone", payer)]
#[derive(Accounts)]
pub struct InitRelayOfferCloneCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program.
    /// Can't check it here as it's not initialized yet.
    pub comp_def_account: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("confidential_deposit_native", payer)]
#[derive(Accounts)]
pub struct InitConfidentialDepositNativeCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program.
    /// Can't check it here as it's not initialized yet.
    pub comp_def_account: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("interchain_origin_evm_deposit_seller_spl", payer)]
#[derive(Accounts)]
pub struct InitInterchainOriginEvmDepositSellerSplCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program.
    /// Can't check it here as it's not initialized yet.
    pub comp_def_account: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("finalize_interchain_origin_evm_offer", payer)]
#[derive(Accounts)]
pub struct InitFinalizeInterchainOriginEvmOfferCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program.
    /// Can't check it here as it's not initialized yet.
    pub comp_def_account: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("deposit_seller_native", payer)]
#[derive(Accounts)]
pub struct InitDepositSellerNativeCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program.
    /// Can't check it here as it's not initialized yet.
    pub comp_def_account: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("deposit_seller_spl", payer)]
#[derive(Accounts)]
pub struct InitDepositSellerSplCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program.
    /// Can't check it here as it's not initialized yet.
    pub comp_def_account: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("finalize_intrachain_offer", payer)]
#[derive(Accounts)]
pub struct InitFinalizeIntrachainOfferCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program.
    /// Can't check it here as it's not initialized yet.
    pub comp_def_account: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}


#[event]
pub struct SumEvent {
    pub sum: [u8; 32],
    pub nonce: [u8; 16],
}

#[event]
pub struct RelayOfferClonedEvent {
    pub cloned_offer: [u8; 32],
    pub nonce: [u8; 16],
}

#[event]
pub struct ConfidentialDepositNativeEvent {
    pub processed_amount: [u8; 32],
    pub nonce: [u8; 16],
}

#[event]
pub struct InterchainOriginEvmDepositSellerSplEvent {
    pub processed_offer_id: [u8; 32],
    pub processed_amount: [u8; 32],
    pub nonce: [u8; 16],
}

#[event]
pub struct FinalizeInterchainOriginEvmOfferEvent {
    pub finalized_offer_id: [u8; 32],
    pub nonce: [u8; 16],
}

#[event]
pub struct DepositSellerNativeEvent {
    pub processed_offer_id: [u8; 32],
    pub processed_amount: [u8; 32],
    pub nonce: [u8; 16],
}

#[event]
pub struct DepositSellerSplEvent {
    pub processed_offer_id: [u8; 32],
    pub processed_amount: [u8; 32],
    pub nonce: [u8; 16],
}

#[event]
pub struct FinalizeIntrachainOfferEvent {
    pub finalized_offer_id: [u8; 32],
    pub nonce: [u8; 16],
}


#[error_code]
pub enum ErrorCode {
    #[msg("The computation was aborted")]
    AbortedComputation,
    #[msg("Cluster not set")]
    ClusterNotSet,
}
