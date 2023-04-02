module.exports.inject = function inject(bot, SwitchMode) {
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
            bot.on("physicsTick", this.tick)

            // register objective heuristics
            {
                bot.movement.heuristic.register('proximity', 'gold')
                    .weight(0.25)

                bot.movement.heuristic.register('proximity', 'murderer')
                    .weight(0)
                    .avoid(true)
            }

            // register terrain navigation heuristics
            {
                bot.movement.heuristic.register('distance', 'long_distance')
                    .weight(0.6)
                    .radius(15)
                    .count(5)
                    .spread(25)
                    .offset(1)

                bot.movement.heuristic.register('distance', 'short_distance')
                    .weight(0.2)
                    .radius(4)
                    .count(3)
                    .spread(20)

                bot.movement.heuristic.register('danger')
                    .weight(0.4)
                    .radius(3)
                    .depth(1)
                    .count(6)

                bot.movement.heuristic.register('conformity')
                    .weight(0.5)
            }

            bot.setControlState("forward", true)
        }

        stop() {
            bot.off("physicsTick", this.tick)
            bot.setControlState("forward", false)
            bot.setControlState("jump", false)
        }

        tick = () => {
            bot.setControlState("jump", false)

            // search for the nearest gold ingot
            {
                const entity = bot.nearestEntity(entity => 
                    entity.mobType === "Dropped item" &&
                    entity.position.distanceTo(bot.entity.position) < 3
                )

                bot.movement.heuristic.get('gold')
                    .target(entity?.position || null)
            }

            if (bot.entity.onGround) {
                // determine if a jump can be made
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
                            if (state.isCollidedVertically) {
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

                    if (valid && trajectory.length > 0) {
                        const offset = trajectory[trajectory.length - 1].y - bot.entity.position.y
                        if (offset > 0) {
                            bot.setControlState("jump", true)
                        }
                    }
                }

                const yaw = bot.movement.getYaw(240, 25, 3)
                bot.movement.steer(yaw)
            }
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

            if (message.match(/^YOU DIED!/)) {
                this.stop()
            }

            console.log(chatMsg.toAnsi())
        }
    }
}