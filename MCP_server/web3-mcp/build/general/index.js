import { registerCoinGeckoTools } from "./coingecko.js";
import { registerRubicTools } from "./rubic.js";
export function registerGeneralTools(server) {
    registerCoinGeckoTools(server);
    registerRubicTools(server);
}
