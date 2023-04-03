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
                    .weight(1)

                bot.movement.heuristic.register('proximity', 'murderer')
                    .weight(0)
                    .avoid(true)
            }

            // register terrain navigation heuristics
            {
                bot.movement.heuristic.register('distance', 'long_distance')
                    .weight(0.5)
                    .radius(20)
                    .count(5)
                    .spread(25)
                    .increment(0.5)
                    .offset(1)

                bot.movement.heuristic.register('distance', 'short_distance')
                    .weight(0.45)
                    .radius(4)
                    .count(3)
                    .spread(30)
                    .offset(1)

                bot.movement.heuristic.register('danger', 'descent')
                    .weight(0.35)
                    .radius(6)
                    .depth(5)
                    .count(12)
                    .descend(true)

                bot.movement.heuristic.register('danger', 'holes')
                    .weight(0.65)
                    .radius(3)
                    .depth(2)
                    .count(6)

                bot.movement.heuristic.register('conformity')
                    .weight(0.3)
            }

            // randomise periods where the player will stop
            this.timeout = null
            this.wait = false
            this.waitTicks = 0

            bot.setControlState("forward", true)
        }

        stop() {
            bot.off("physicsTick", this.tick)
            bot.clearControlStates()
            clearTimeout(this.timeout)
        }

        tick = () => {
            bot.clearControlStates()

            // randomise "stopping" periods where movement is ceased
            {
                // verify no timeouts are currently pending
                if (!this.wait) {
                    const duration = (15 * 1000) + (Math.floor(10 * Math.random()) * 1000)
                    const ticks = 20 + Math.floor(Math.random() * 40)
                    this.wait = true

                    // set a duration from now where the player will stop moving
                    this.timeout = setTimeout(() => {
                        this.waitTicks = ticks
                        this.wait = false
                    }, duration)
                }

                // ticks applied by timeout; freeze movement until it has reached 0
                if (this.waitTicks > 0) {
                    this.waitTicks--
                    return
                }
            }

            // if gold is nearby, change the heuristic
            {
                const entity = bot.nearestEntity(entity => 
                    entity.mobType === "Dropped item" &&
                    entity.position.distanceTo(bot.entity.position) < 3
                )

                bot.movement.heuristic.get('gold')
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
                const yaw = bot.movement.getYaw(220, 25, 3)
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