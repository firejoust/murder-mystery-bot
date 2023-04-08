module.exports.inject = function inject(bot, SwitchMode) {
    const MovementGoal = new bot.movement.Goal({
        'proximity': bot.movement.heuristic.new("proximity")
            .configure({}),
        'conformity': bot.movement.heuristic.new("conformity")
            .configure({}),
        'danger': bot.movement.heuristic.new("danger")
            .configure({}),
        'distance': bot.movement.heuristic.new("distance")
            .configure({})
    })

    return class Innocent {
        register() {
            bot.on("message", this.message)
            this.init()
        }

        terminate() {
            bot.off("message", this.message)
            this.stop()
        }

        init() {
            bot.movement.setGoal(MovementGoal)
            bot.setControlState("forward", true)
            bot.on("physicsTick", this.tick)
        }

        stop() {
            bot.off("physicsTick", this.tick)
            bot.clearControlStates()
        }

        tick = () => {
            bot.clearControlStates()

            // if gold is nearby, change the heuristic
            {
                const entity = bot.nearestEntity(entity => 
                    entity.mobType === "Dropped item" &&
                    Math.abs(entity.position.y - bot.entity.position.y) < 3
                )

                bot.movement.heuristic.get('proximity')
                    .target(entity?.position || null)
            }

            // determine if a jump can be made
            if (bot.entity.onGround) {
                {
                    let valid = false

                    const trajectory = new bot.physics.Simulation(bot.entity)
                        .until(state => {
                            if (state.isCollidedHorizontally)
                                return false
                            if (state.isInWater)
                                return false
                            if (state.isInLava)
                                return false
                            if (state.onGround) {
                                valid = true
                                return true
                            }
                        })
                        .controls({
                            "forward": true,
                            "jump": true
                        })
                        .ticks(15)
                        .trajectory()

                    // only apply jump if we are ascending a block
                    if (valid && trajectory.length > 0) {
                        const offset = trajectory[trajectory.length - 1].y - bot.entity.position.y
                        if (offset > 0.5) {
                            bot.setControlState("jump", true)
                        }
                    }
                }
            }

            // only chnage direction on the ground or in water
            if (bot.entity.onGround || bot.entity.isInWater) {
                const yaw = bot.movement.getYaw(120, 25, 0)
                bot.movement.steer(yaw, false)
            }

            // stay above the surface of water
            if (bot.entity.isInWater) {
                bot.setControlState("jump", true)
            }

            bot.setControlState("forward", true)
        }

        message = (chatMsg) => {
            const message = chatMsg.toString()

            if (message.match(/^The previous Murderer left, you are now taking their position!/)) {
                bot.chat('/hub')
                SwitchMode('lobby')
            } else

            if (message.match(/^\s+Winner:/)) {
                bot.chat('/hub')
                SwitchMode('lobby')
            } else

            if (message.match(/^You were spawned in Limbo/)) {
                bot.chat('/hub')
                SwitchMode('lobby')
            } else

            if (message.match(/^YOU DIED!/)) {
                this.stop() // wait until the game's over
            }

            console.log(chatMsg.toAnsi())
        }
    }
}