use anchor_lang::prelude::*;

mod state;
mod errors;
mod constants;
mod instructions;

pub use instructions::*;
use errors::AmmError;

declare_id!("4EvoCmJExHBdJPvyDP7YVt9qKuW53LKw8Sz9Xm7JzuL8");

#[program]
pub mod blueshift_anchor_amm {
    use super::*;

    #[instruction(discriminator = 0)]
    pub fn initialize(
        ctx: Context<Initialize>, 
        seed: u64, 
        authority: Pubkey, 
        fee: u16,
        init_amount_x: u64,
        init_amount_y: u64,
    ) -> Result<()> {
        instructions::initialize(ctx, seed, authority, fee, init_amount_x, init_amount_y)
    }

    #[instruction(discriminator = 1)]
    pub fn deposit(ctx: Context<Deposit>, amount: u64, max_x: u64, max_y: u64, expiration: i64) -> Result<()> {
        instructions::deposit(ctx, amount, max_x, max_y, expiration)
    }

    #[instruction(discriminator = 2)]
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64, min_x: u64, min_y: u64, expiration: i64) -> Result<()> {
        instructions::withdraw(ctx, amount, min_x, min_y, expiration)
    }

    #[instruction(discriminator = 3)]
    pub fn swap(ctx: Context<Swap>, amount: u64, min: u64, expiration: i64) -> Result<()> {
        instructions::swap(ctx, amount, min, expiration)
    }

    #[instruction(discriminator = 4)]
    pub fn update_authority(ctx: Context<ConfigAction>, authority: Pubkey) -> Result<()> {
        ctx.accounts.check_authority()?;
        ctx.accounts.update_authority(authority)?;

        Ok(())
    }

    #[instruction(discriminator = 5)]
    pub fn update_fee(ctx: Context<ConfigAction>, fee: u16) -> Result<()> {
        ctx.accounts.check_authority()?;
        ctx.accounts.update_fee(fee)?;

        Ok(())
    }

    #[instruction(discriminator = 6)]
    pub fn update_lock(ctx: Context<ConfigAction>) -> Result<()> {
        ctx.accounts.check_authority()?;
        ctx.accounts.update_lock()?;

        Ok(())
    }

    #[instruction(discriminator = 7)]
    pub fn remove_authority(ctx: Context<ConfigAction>) -> Result<()> {
        ctx.accounts.check_authority()?;
        ctx.accounts.remove_authority()?;

        Ok(())
    }
}
