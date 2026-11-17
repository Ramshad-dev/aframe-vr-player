export const INPUT_SOURCE = {
    STANDARD: 'standard',
    XR: 'xr',
}

const DEADZONE = 0.2
const AXIS_ACTIVE = 0.65
const AXIS_REPEAT_MS = 260

const values = (list) => Array.from(list || []).filter(Boolean)

const pressed = (button) => {
    if (typeof button === 'number') return button > 0.5
    return !!(button && button.pressed)
}

const cloneAxes = (axes) => Array.from(axes || [], (value) => Number(value) || 0)

export class GamepadInput {
    constructor(sceneEl) {
        this.sceneEl = sceneEl
        this.states = new Map()
        this.latest = new Map()
    }

    poll(time) {
        const events = []
        const seen = new Set()
        const standardPads = values(typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [])
        const session = this.sceneEl?.xrSession || this.sceneEl?.renderer?.xr?.getSession?.()
        const xrSources = values(session?.inputSources).filter((source) => source.gamepad)

        for (const pad of standardPads) {
            const key = `${INPUT_SOURCE.STANDARD}:${pad.index ?? 0}`
            seen.add(key)
            this.pollPad(key, INPUT_SOURCE.STANDARD, 'any', pad, events, time)
        }

        for (const source of xrSources) {
            const key = `${INPUT_SOURCE.XR}:${source.handedness || 'none'}:${source.gamepad.index ?? 0}`
            seen.add(key)
            this.pollPad(key, INPUT_SOURCE.XR, source.handedness || 'none', source.gamepad, events, time)
        }

        for (const key of Array.from(this.states.keys())) {
            if (!seen.has(key)) {
                this.states.delete(key)
                this.latest.delete(key)
            }
        }

        return events
    }

    pollPad(key, source, hand, pad, events, time) {
        let state = this.states.get(key)
        if (!state) {
            state = { buttons: [], axes: {}, axisTime: {} }
            this.states.set(key, state)
        }

        const buttons = pad.buttons || []
        for (let i = 0; i < buttons.length; i++) {
            const down = pressed(buttons[i])
            if (down && !state.buttons[i]) {
                events.push({ source, hand, type: 'button', index: i, value: 1 })
            }
            state.buttons[i] = down
        }

        const axes = cloneAxes(pad.axes)
        this.latest.set(key, { source, hand, axes })
        for (let i = 0; i < axes.length; i++) {
            for (const dir of [-1, 1]) {
                const axisKey = `${i}:${dir}`
                const active = axes[i] * dir >= AXIS_ACTIVE
                const wasActive = !!state.axes[axisKey]
                const last = state.axisTime[axisKey] || 0

                if (active && !wasActive) {
                    events.push({ source, hand, type: 'axis', index: i, dir, value: axes[i] })
                    state.axisTime[axisKey] = time
                } else if (active && wasActive && time - last >= AXIS_REPEAT_MS) {
                    events.push({ source, hand, type: 'axis', index: i, dir, value: axes[i] })
                    state.axisTime[axisKey] = time
                }

                state.axes[axisKey] = active
            }
        }
    }

    getAxisValue(binding) {
        const entry = this.findEntry(binding.source, binding.hand)
        if (!entry) return 0

        const value = entry.axes[binding.index] || 0
        return Math.abs(value) < DEADZONE ? 0 : value
    }

    findEntry(source, hand) {
        let fallback = null
        for (const entry of this.latest.values()) {
            if (entry.source !== source) continue
            if (!fallback) fallback = entry
            if (!hand || hand === 'any' || entry.hand === hand || entry.hand === 'any') return entry
        }
        return fallback
    }

    reset() {
        this.states.clear()
        this.latest.clear()
    }
}
