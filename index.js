const Mineflayer = require("mineflayer")
const Gui        = require("mineflayer-gui").plugin
const Movement   = require("mineflayer-movement").plugin
const Hologram   = require("mineflayer-hologram").plugin
const Physics    = require("mineflayer-physics").plugin
const Pathfinder = require("mineflayer-pathfinder").pathfinder
const Viewer     = require("prismarine-viewer").mineflayer
const Config     = require("./config.json")

const bot = Mineflayer.createBot({
    username: Config["username"],
    password: Config["password"],
    version: "1.8",
    host: "hypixel.net",
    auth: "microsoft"
})

bot.loadPlugin(Gui)
bot.loadPlugin(Movement)
bot.loadPlugin(Hologram)
bot.loadPlugin(Physics)
bot.loadPlugin(Pathfinder)

bot.once("spawn", () => Viewer(bot, { port: 3000, firstPerson: true }))

{
    let CurrentMode = {
        terminate: () => {}
    }

    const Modes = {
        'lobby': require("./src/lobby").inject(bot, SwitchMode),
        'innocent': require("./src/innocent").inject(bot, SwitchMode),
        'detective': require("./src/detective").inject(bot, SwitchMode),
        'murderer': require("./src/murderer").inject(bot, SwitchMode)
    }

    function SwitchMode(label) {
        CurrentMode.terminate()
        CurrentMode = new Modes[label]()
        CurrentMode.register()
    }

    // set default mode to lobby
    SwitchMode('lobby')
}