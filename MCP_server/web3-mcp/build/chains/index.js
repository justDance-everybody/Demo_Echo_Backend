import { registerBitcoinTools } from "./UTXO/bitcoin";
import { registerLitecoinTools } from "./UTXO/litecoin";
import { registerDogecoinTools } from "./UTXO/dogecoin";
import { registerBitcoinCashTools } from "./UTXO/bitcoincash";
import { registerCardanoTools } from "./UTXO/cardano";
import { registerThorchainTools } from "./thorchain/thorchain";
import { registerRippleTools } from "./ripple/ripple";
import { registerTonTools } from "./ton/ton";
// Export all UTXO tools registration function
export function registerUtxoTools(server) {
    registerBitcoinTools(server);
    registerLitecoinTools(server);
    registerDogecoinTools(server);
    registerBitcoinCashTools(server);
    registerCardanoTools(server);
}
// Export all tools registration function
export function registerAllTools(server) {
    registerUtxoTools(server);
    registerThorchainTools(server);
    registerRippleTools(server);
    registerTonTools(server);
}
