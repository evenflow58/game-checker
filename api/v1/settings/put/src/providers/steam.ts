import { SteamError } from "../errors/steamError.js";

export async function checkSteamProvider(steamApiKey: string, steamId: string) {
    try {
        // Ensure the steam id is valid
        const url = `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${steamApiKey}&steamids=${steamId}`;

        const steamResponse = await fetch(url);
        if (!steamResponse.ok) {
            throw new Error("Unable to validate steam id");
        }

        const steamPlayers = (await steamResponse.json())?.response?.players;

        console.log("Got response from Steam");

        if (steamPlayers.length !== 1) {
            throw new Error(`Incorrect number of players returned. ${steamPlayers}`);
        }

        console.log("Retreived player");
    }
    catch (err) {
        console.log(`Unable to retreive a player with the given steam id: ${steamId}`, err);
        throw new SteamError("Unable to retreive steam id");
    }
}