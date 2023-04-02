module.exports.inject = function inject(bot, SwitchMode) {
    return class Detective {
        register() {
            bot.on("physicsTick", this.tick)
            bot.on("message", this.message)
            this.init()
        }

        terminate() {
            bot.off("physicsTick", this.tick)
            bot.off("message", this.message)
        }

        init() {
            bot.chat("/hub")
            SwitchMode('lobby')
        }

        tick() {

        }

        message(chatMsg) {
            console.log(chatMsg.toAnsi())
        }
    }
}