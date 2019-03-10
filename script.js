///// GAME RULES /////
let FIGHTER_SPEED = 1
let GRAVITY = 0.05
let JUMP_SPEED = 6
let KICK_STRENGTH = 15
let PUNCH_STRENGTH = 11
let FLOOR_HEIGHT_COEFFICIENT = 0.35


///// TIME /////
const Time = {
	oldTime: 0,
	deltaTime: 0,

	update() {
		const newTime = new Date().getTime()
		Time.deltaTime = newTime - Time.oldTime
		Time.oldTime = newTime
	}
}


///// KEYBOARD /////
const Keyboard = {}

// EDGE does not have e.code,
// so store key and location
window.addEventListener('keydown', e => {
	Keyboard[e.key + ':' + e.location] = true
})

window.addEventListener('keyup', e => {
	delete Keyboard[e.key + ':' + e.location]
})


///// FIGHTERS /////
class Fighter {
	constructor(up, left, down, right, jump, crawl, tag, element) {
		this.enemy     = null
		this.health    = 100
		this.direction = 1
		this.isDead    = false

		this.element = element
		this.tag     = tag

		this.emitter    = this.element.getElementsByClassName('emitter')[0]
		this.dieAudio   = this.element.getElementsByClassName('die_audio')[0]
		this.windAudio  = this.element.getElementsByClassName('wind_audio')[0]
		this.hurtAudio  = this.element.getElementsByClassName('hurt_audio')[0]
		this.punchAudio = this.element.getElementsByClassName('punch_audio')[0]

		this.right = right
		this.left  = left
		this.down  = down
		this.up    = up
		this.jump  = jump
		this.crawl = crawl

		this.velocity = { x: 0, y: 0 }

		this.delay 	  = { kick: 0, punch: 0 }
		this.cooldown = { kick: 0, punch: 0 }
	}

	playIdle() {
		this.element.style['background-image'] = `url(images/${this.tag}_idle.png)`
	}

	playRun() {
		this.element.style['background-image'] = `url(images/${this.tag}_run.gif)`
	}

	playKick() {
		this.element.style['background-image'] = `url(images/${this.tag}_kick.png)`
	}

	playPunch() {
		this.element.style['background-image'] = `url(images/${this.tag}_punch.png)`
	}

	playDead() {
		this.element.style['background-image'] = `url(images/${this.tag}_dead.png)`
	}

	die() {
		//this.dieAudio.pause()
		//this.dieAudio.currentTime = 0
		this.playDead()
		this.dieAudio.play()
		this.isDead = true
	}

	getDistance(other) {
		const deltaX = this.element.offsetLeft - other.element.offsetLeft
		const deltaY = this.element.offsetTop  - other.element.offsetTop
		return Math.sqrt(deltaX * deltaX + deltaY * deltaY)
	}

	isInRange(other) {
		return this.getDistance(other) < this.element.offsetWidth / 2
	}

	reduceHealth(amount) {
		if (this.isDead)
			return

		this.health -= amount

		if (this.health < 0)
			this.health = 0

		this.punchAudio.pause()
		this.punchAudio.currentTime = 0
		this.punchAudio.play()

		this.hurtAudio.pause()
		this.hurtAudio.currentTime = 0
		this.hurtAudio.play()

		this.emitter.style['background-image'] = 'url(images/blood.png)'
		this.emitter.style.transform = 'scale(1)'

		setTimeout(_ => {
			this.emitter.style.transform = 'scale(0)'
		}, 50)
	}

	blockAttack() {
		this.emitter.style['background-image'] = 'url(images/drops.png)'
		this.emitter.style.transform = 'scale(1)'

		setTimeout(_ => {
			this.emitter.style.transform = 'scale(0)'
		}, 50)
	}

	move() {
		this.element.style.left = this.element.offsetLeft
		                        + this.velocity.x
		                        * Time.deltaTime
		                        + 'px'

		this.element.style.top = this.element.offsetTop
		                       + this.velocity.y
		                       * Time.deltaTime
		                       + 'px'
	}

	isOnGround() {
		return this.element.offsetTop > window.innerHeight * FLOOR_HEIGHT_COEFFICIENT
	}

	putABitBelowGround() {
		return this.element.style.top = window.innerHeight * FLOOR_HEIGHT_COEFFICIENT + 1
	}

	updateGravityEffect() {
		// add gravity
		this.velocity.y += GRAVITY * Time.deltaTime

		// and remove if on ground
		if (this.isOnGround()) {
			this.putABitBelowGround()

			if (this.velocity.y > 0)
				this.velocity.y = 0
		}
	}

	updateRunningEffect() {
		// slow down horizontal
		this.velocity.x *= 0.7
	}

	update() {
		// update motion
		this.updateGravityEffect()
		this.updateRunningEffect()
		// apply motion
		this.move()

		if (this.isDead)
			return

		// decrease after-attack effects
		this.cooldown.kick  -= Time.deltaTime
		this.cooldown.punch -= Time.deltaTime
		this.delay.kick     -= Time.deltaTime
		this.delay.punch    -= Time.deltaTime

		// continue kick animation
		if (this.delay.kick > 1)
			this.playKick()

		// continue punch animation
		else if (this.delay.punch > 1)
			this.playPunch()

		// allow user control again
		else {
			// check facing
			if (this.velocity.x > 0.1) {
				this.direction = -1
				this.element.style.transform = 'scaleX(-1)'
				this.playRun()
			}

			else if (this.velocity.x < -0.1) {
				this.direction = 1
				this.element.style.transform = 'scaleX(+1)'
				this.playRun()
			}

			// stop
			else
				this.playIdle()

			// new attach
			if (
				Keyboard[this.up] &&
				this.cooldown.kick < 1
			) {
				this.delay.kick = 130 //ms
				this.cooldown.kick = 180 //ms

				this.windAudio.pause()
				this.windAudio.currentTime = 0
				this.windAudio.play()

				if (this.isInRange(this.enemy)) {
					// back
					if (this.direction == this.enemy.direction)
						this.enemy.reduceHealth(KICK_STRENGTH)

					// enemy moving towards
					else if (
						this.enemy.direction == 1 &&
						this.enemy.velocity.x < -0.1
					) {
						this.enemy.reduceHealth(KICK_STRENGTH)
					}

					else {
						this.enemy.blockAttack()
					}
				}
			}

			else if (
				Keyboard[this.down] &&
				this.cooldown.punch < 1
			) {
				this.delay.punch = 130 //ms
				this.cooldown.punch = 180 //ms

				this.windAudio.pause()
				this.windAudio.currentTime = 0
				this.windAudio.play()

				if (this.isInRange(this.enemy)) {
					// back
					if (this.direction == this.enemy.direction)
						this.enemy.reduceHealth(PUNCH_STRENGTH)

					// enemy moving towards
					else if (
						this.enemy.direction == 1 &&
						this.enemy.velocity.x < -0.1
					) {
						this.enemy.reduceHealth(PUNCH_STRENGTH)
					}

					else {
						this.enemy.blockAttack()
					}
				}
			}

			// update velocity
			else if (
				Keyboard[this.jump] &&
				this.isOnGround()
			) this.velocity.y = -JUMP_SPEED

			else if (Keyboard[this.left])
				this.velocity.x = -FIGHTER_SPEED
			else if (Keyboard[this.right])
				this.velocity.x =  FIGHTER_SPEED
		}
	}
}

const USTINA = new Fighter(
	'w:0', 'a:0', 's:0', 'd:0',
	' :0', 'Shift:1',
	'Ustina', ustina)
const URA    = new Fighter(
	'ArrowUp:0', 'ArrowLeft:0', 'ArrowDown:0', 'ArrowRight:0',
	'Enter:0', 'Shift:2',
	'Ura', ura)
USTINA.enemy = URA
URA.enemy = USTINA


///// READY /////
document.addEventListener('DOMContentLoaded', e => {
	ura.style.left = "calc(100% - 10vw - 50vh)"
	ustina.style.left = "10vw"
})


///// MAIN /////
requestAnimationFrame(function update() {
	Time.update()

	USTINA.update()
	URA.update()

	ustinas_health.style.width = USTINA.health + '%'
	uras_health.style.width    = URA.health + '%'

	if (USTINA.health <= 0 && !USTINA.isDead) {
		USTINA.die()
	}

	if (URA.health <= 0 && !URA.isDead) {
		URA.die()
	}

	requestAnimationFrame(update)
})