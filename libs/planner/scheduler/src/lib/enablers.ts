// The actions that heal or mitigate nothing themselves but make others do
// so (or come sooner), by action, with what they do: the log of a pull
// shows them beside the heals and mitigations. Eukrasia isn't among them:
// the Eukrasian heal after it shows, and it comes before every Eukrasian
// Dosis too.
export const ENABLERS: Record<number, string> = {
  16542: 'Makes the next Adloquium, Succor, Indomitability or Excogitation critical, with no Aetherflow', // Recitation
  166: '3 Aetherflow stacks', // Aetherflow
  16545: 'Seraph for 22s: Seraphic Veil by herself, and Consolation', // Summon Seraph
  3586: 'Makes the next Adloquium, Succor or Concitation heal instead of shielding', // Emergency Tactics
  3606: 'Spells instant for 15s', // Lightspeed
  7561: 'Makes the next spell instant', // Swiftcast
  37017: 'Draws the Arrow and the Spire (with the Balance and Lord of Crowns)', // Astral Draw
  37018: 'Draws the Bole, the Ewer and Lady of Crowns (with the Spear)', // Umbral Draw
  24309: '1 Addersgall', // Rhizomata
};
