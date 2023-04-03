const { GoalNearXZ } = require("mineflayer-pathfinder").goals
const Assert         = require("assert")

module.exports.inject = function inject(bot, SwitchMode) {
    const ChatMessage = require("prismarine-chat")(bot.registry)

    return class Lobby {
        register() {
            bot.once("spawn", this.spawn)
            bot.on("message", this.message)
        }

        terminate() {
            bot.off("spawn", this.spawn)
            bot.off("message", this.message)
        }

        spawn = async() => {
            // click murder mystery in the game menu
            Assert.ok(
                await new bot.gui.Query()
                    .matchBy("display")
                    .packet(true)
                    .clickItems("Game Menu", "Murder Mystery")
            , "Unable to use game selector")
    
            // allow time for the world to load
            await new Promise(resolve => setTimeout(resolve, 8 * 1000))

            // find the lobby NPC's hologram
            const hologram = new bot.hologram.Query()
                .match(/Classic \/ Double Up!/)
    
            // navigate to the lobby NPC
            Assert.ok(
                await bot.pathfinder.goto(new GoalNearXZ(
                    hologram.position.x,
                    hologram.position.z,
                    1
                )).then(
                    () => true,
                    () => false
                )
            , "Unable to get to Lobby NPC")
            
            // Connect to a new game
            {
                const timeout = setTimeout(function timeout() {
                    throw new Error("Unable to open lobby NPC window")
                }, 5 * 1000)
        
                // make sure nothing is held (prevent opening different window)
                bot.setQuickBarSlot(3)
        
                // click the lobby NPC
                bot.attack(bot.nearestEntity(entity => entity.type === "player"))
                
                // wait for the lobby NPC window
                const window = await new Promise(resolve =>
                    bot.once("windowOpen", function(window) {
                        clearTimeout(timeout)
                        resolve(window)
                    })
                )
        
                Assert.ok(
                    await new bot.gui.Query()
                        .window(window)
                        .matchBy("display")
                        .packet(true)
                        .clickItems("Murder Mystery (Classic)")
                , "Unable to use lobby NPC menu")
            }

            // Wait for the bot to connect to the game
            {
                const timeout = setTimeout(function timeout() {
                    throw new Error("Unable to join the lobby")
                }, 5 * 1000)

                await new Promise(resolve => 
                    bot.once("spawn", function() {
                        clearTimeout(timeout)
                        resolve()
                    })
                )
            }

            // Wait for the game to start (120 seconds)
            {
                const timeout = setTimeout(function timeout() {
                    throw new Error("Unable to start the game")
                }, 120 * 1000)

                const role = await new Promise(resolve => {
                    const callback = function(json) {
                        let chatMsg
                        try {
                            chatMsg = new ChatMessage(JSON.parse(json))
                        } catch (e) {
                            chatMsg = new ChatMessage(json)
                        }

                        const msg = chatMsg.toString()

                        if (msg.match(/ROLE: INNOCENT/)) {
                            bot.off("title", callback)
                            clearTimeout(timeout)
                            resolve('innocent')
                        } else

                        if (msg.match(/ROLE: DETECTIVE/)) {
                            bot.off("title", callback)
                            clearTimeout(timeout)
                            resolve('detective')
                        } else

                        if (msg.match(/ROLE: MURDERER/)) {
                            bot.off("title", callback)
                            clearTimeout(timeout)
                            resolve('murderer')
                        }
                    }

                    bot.on("title", callback)
                })

                SwitchMode(role)
            }
        }

        message = (chatMsg) => {
            console.log(chatMsg.toAnsi())
        }
    }
}