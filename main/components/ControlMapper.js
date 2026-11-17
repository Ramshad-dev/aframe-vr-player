import { El } from '../elems.js'
import { Store } from '../store.js'
import { EV } from './Events.js'
import { getSettings, setSettings, ST } from './settings/Settings.js'
import { GamepadInput } from '../input/GamepadInput.js'
import { ACTIONS, INPUT_BINDINGS_STORE, normalizeBinding, sameBinding } from '../input/actions.js'
import { ZOOM_LEVELS } from './buttons/btnVideoZoom.js'
import { DIALOG_INPUT_BINDINGS } from './dialog/InputBindings.js'
import { videoPresets } from './env/EnvManager.js'
import { PRESET } from './env/constants.js'
import { CONTROLS, CTL_HIDDEN } from '../systems/Controls.js'

const PRESET_KEYS = [
    PRESET.SBS_180_EQR,
    PRESET.SBS_180_FE,
    PRESET.TB_360_EQR,
    PRESET.FLAT,
    PRESET.M_180_EQR,
    PRESET.M_360_EQR,
    PRESET.M_180_FE,
    PRESET.M_360_EAC,
]

const LOOK_SPEED = 75
const MAX_PITCH = 80
const LOOK_ACTIONS = ['lookX', 'lookY']

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const isExcludedTarget = (el) => el.hasAttribute('timeline') || el.hasAttribute('btn-vol') || el.hasAttribute('btn-video-zoom')

const isVisible = (el) => {
    let current = el
    while (current) {
        if (current.object3D && !current.object3D.visible) return false
        current = current.parentElement
    }
    return true
}

const clickEl = (el) => {
    if (!el) return
    if (typeof el.emit === 'function') {
        el.emit('click', {
            intersectedEl: el,
            target: el,
            intersection: { uv: { x: 0.5, y: 0.5 } },
        }, false)
        return
    }
    el.click()
}

const matches = (binding, input) => {
    const value = normalizeBinding(binding)
    if (value.source !== input.source || value.type !== input.type) return false
    if (value.index !== Number(input.index)) return false
    if (value.hand !== 'any' && value.hand !== input.hand) return false
    if (value.type === 'axis' && value.dir && value.dir !== input.dir) return false
    return true
}

AFRAME.registerComponent('control-mapper', {
    schema: {
        enabled: { type: 'boolean', default: true },
    },

    init: function () {
        this.input = new GamepadInput(El.ascene)
        this.bindings = this.loadBindings()
        this.captureCallback = null
        this.focusEls = []
        this.focusIndex = -1
        this.focusRing = this.createFocusRing()
        this.manualLook = false
        this.savedLook = null
        this.savedRigRotation = null
        this.savedRayOrigins = []
        this.yaw = 0
        this.pitch = 0
        this.controlsVisible = true
        this.onControls = AFRAME.utils.bind(this.onControls, this)
        this.onBindingsChanged = AFRAME.utils.bind(this.onBindingsChanged, this)

        El.events.addEventListener(CONTROLS, this.onControls)
        El.events.addEventListener(EV.INPUT_BINDINGS, this.onBindingsChanged)
    },

    loadBindings: function () {
        const saved = Store.get(INPUT_BINDINGS_STORE) || {}
        const bindings = {}
        for (const action of ACTIONS) {
            const stored = saved[action.id]
            const source = Array.isArray(stored) && stored.length ? stored : action.defaults
            bindings[action.id] = source.map((binding) => normalizeBinding(binding))
        }
        return bindings
    },

    createFocusRing: function () {
        const ring = document.createElement('a-ring')
        ring.setAttribute('geometry', 'primitive: ring; radius-inner: 2.6; radius-outer: 3.1')
        ring.setAttribute('material', 'color: #00ff88; shader: flat; side: double; transparent: true; opacity: 0.9; depthTest: false')
        ring.setAttribute('visible', 'false')
        El.ascene.appendChild(ring)
        return ring
    },

    onControls: function (event) {
        this.controlsVisible = event.detail !== CTL_HIDDEN
        if (!this.controlsVisible) {
            this.focusIndex = -1
            this.focusRing.setAttribute('visible', 'false')
        }
    },

    onBindingsChanged: function () {
        this.bindings = this.loadBindings()
    },

    tick: function (time, delta) {
        if (!this.data.enabled) return

        const inputs = this.input.poll(time)
        for (const input of inputs) {
            this.handleInput(input)
        }

        if (this.manualLook) this.applyManualLook(delta)
        this.updateFocusRing()
    },

    handleInput: function (input) {
        if (this.captureCallback) {
            const callback = this.captureCallback
            this.captureCallback = null
            callback(input)
            return
        }

        for (const action of ACTIONS) {
            if (LOOK_ACTIONS.includes(action.id)) continue
            if (!(this.bindings[action.id] || []).some((binding) => matches(binding, input))) continue
            El.events.emit(EV.INPUT, { action: action.id, input })
            this.runAction(action.id)
        }
    },

    runAction: function (actionId) {
        switch (actionId) {
            case 'menuNext':
                if (!this.adjustFocused(1)) this.moveFocus(1)
                break
            case 'menuPrev':
                if (!this.adjustFocused(-1)) this.moveFocus(-1)
                break
            case 'menuSelect':
                if (this.manualLook && this.selectCursorTarget()) break
                this.activateFocused()
                break
            case 'menuBack':
                this.goBack()
                break
            case 'playPause':
                clickEl(document.querySelector('[btn-pause-play]'))
                break
            case 'seekBack':
                this.seek(-15)
                break
            case 'seekForw':
                this.seek(15)
                break
            case 'zoomIn':
                this.changeZoom(1)
                break
            case 'zoomOut':
                this.changeZoom(-1)
                break
            case 'chromaKey':
                clickEl(document.querySelector('[btn-chroma-key]'))
                break
            case 'voidPreset':
                this.setVoidPreset()
                break
            case 'presetPrev':
                this.changePreset(-1)
                break
            case 'presetNext':
                this.changePreset(1)
                break
            case 'toggleUI':
                this.toggleUI()
                break
            case 'openBindings':
                clickEl(document.querySelector('[btn-input-bindings]'))
                break
            case 'manualLook':
                this.toggleManualLook()
                break
            case 'recenter':
                clickEl(document.querySelector('[recenter]'))
                break
        }
    },

    refreshFocusEls: function () {
        let elements
        if (El.dialog?.object3D.visible) {
            elements = El.dialog.querySelectorAll('[clickable]')
        } else {
            elements = [
                ...El.controls.querySelectorAll('[clickable][controls]'),
                ...El.env.querySelectorAll('[clickable][controls]'),
            ]
        }

        const visible = Array.from(elements).filter((el) => !isExcludedTarget(el) && isVisible(el))
        const focused = this.focusEls[this.focusIndex]
        this.focusEls = visible
        this.focusIndex = focused ? visible.indexOf(focused) : -1
    },

    moveFocus: function (delta) {
        this.refreshFocusEls()
        if (!this.focusEls.length) return

        if (this.focusIndex < 0) {
            this.focusIndex = delta > 0 ? 0 : this.focusEls.length - 1
        } else {
            const count = this.focusEls.length
            this.focusIndex = (this.focusIndex + delta + count) % count
        }
        this.updateFocusRing()
    },

    updateFocusRing: function () {
        if (!this.focusRing) return
        const focused = this.focusEls[this.focusIndex]
        if (!focused || !isVisible(focused)) {
            this.focusRing.setAttribute('visible', 'false')
            return
        }

        const position = focused.object3D.getWorldPosition(new THREE.Vector3())
        this.focusRing.object3D.position.copy(position)
        const cameraPosition = El.camera.object3D.getWorldPosition(new THREE.Vector3())
        this.focusRing.object3D.lookAt(cameraPosition)
        this.focusRing.setAttribute('visible', 'true')
    },

    activateFocused: function () {
        this.refreshFocusEls()
        const focused = this.focusEls[this.focusIndex]
        if (!focused) return

        if (focused.components['btn-video-zoom']) {
            this.stepZoom(1)
            return
        }
        clickEl(focused)
    },

    selectCursorTarget: function () {
        for (const el of El.ascene.querySelectorAll('[raycaster], [cursor]')) {
            const raycaster = el.components.raycaster
            const candidates = [
                ...(raycaster?.intersectedEls || []),
                el.components.cursor?.intersectedEl,
                raycaster?.intersectedEl,
            ]
            const seen = new Set()
            for (const target of candidates) {
                if (!target || seen.has(target) || isExcludedTarget(target) || !isVisible(target)) continue
                seen.add(target)
                clickEl(target)
                return true
            }
        }
        return false
    },

    adjustFocused: function (delta) {
        this.refreshFocusEls()
        const focused = this.focusEls[this.focusIndex]
        if (!focused) return false

        if (focused.components['btn-video-zoom']) {
            this.stepZoom(delta)
            return true
        }
        return false
    },

    stepZoom: function (delta) {
        const current = Number(getSettings(ST.VIDEO_ZOOM)) || 1
        let index = ZOOM_LEVELS.indexOf(current)
        if (index < 0) index = ZOOM_LEVELS.findIndex((level) => level >= current)
        if (index < 0) index = ZOOM_LEVELS.length - 1
        setSettings(ST.VIDEO_ZOOM, ZOOM_LEVELS[clamp(index + delta, 0, ZOOM_LEVELS.length - 1)])
    },

    changeZoom: function (delta) {
        this.stepZoom(delta)
    },

    seek: function (seconds) {
        const video = El.video
        if (!video || video.readyState === 0 || !isFinite(video.duration)) return
        video.currentTime = clamp(video.currentTime + seconds, 0, video.duration)
    },

    setVoidPreset: function () {
        setSettings(ST.FLAT_ENV_POI, 0)
        setSettings(ST.FLAT_ENV_BG, 2)
        videoPresets.find((preset) => preset.text === 'FLAT')?.fn()
    },

    changePreset: function (delta) {
        const current = El.env.getAttribute('env-manager')?.preset
        let index = PRESET_KEYS.indexOf(current)
        if (index < 0) index = 0
        index = (index + delta + PRESET_KEYS.length) % PRESET_KEYS.length
        videoPresets[index]?.fn()
    },

    toggleUI: function () {
        const system = El.ascene.systems.controls
        if (this.controlsVisible) system.hideControls()
        else system.showControls()
    },

    goBack: function () {
        if (El.dialog?.object3D.visible) {
            const dialogComponent = El.dialog.components[DIALOG_INPUT_BINDINGS]
            if (dialogComponent) dialogComponent.close()
            else clickEl(document.querySelector('[btn-settings]'))
            return
        }
        if (this.controlsVisible) El.ascene.systems.controls.hideControls()
        else El.ascene.systems.controls.showControls()
    },

    toggleManualLook: function () {
        if (this.manualLook) {
            this.manualLook = false
            if (this.savedLook) El.camera.setAttribute('look-controls', this.savedLook)
            if (this.savedRigRotation) El.cameraRig.setAttribute('rotation', this.savedRigRotation)
            for (const saved of this.savedRayOrigins) {
                saved.el.setAttribute('cursor', 'rayOrigin', saved.origin)
            }
            this.savedLook = null
            this.savedRigRotation = null
            this.savedRayOrigins = []
            this.yaw = 0
            this.pitch = 0
            return
        }

        const look = El.camera.getAttribute('look-controls') || {}
        this.savedLook = {
            enabled: look.enabled !== false,
            magicWindowTrackingEnabled: look.magicWindowTrackingEnabled !== false,
        }
        this.savedRigRotation = { ...El.cameraRig.getAttribute('rotation') }
        for (const el of El.ascene.querySelectorAll('[cursor]')) {
            if (el.components.cursor?.data.rayOrigin !== 'mouse') continue
            this.savedRayOrigins.push({ el, origin: 'mouse' })
            el.setAttribute('cursor', 'rayOrigin', 'entity')
        }
        El.camera.setAttribute('look-controls', { enabled: false, magicWindowTrackingEnabled: false })
        this.manualLook = true
    },

    applyManualLook: function (delta) {
        const horizontal = this.axisValue('lookX')
        const vertical = this.axisValue('lookY')
        if (!horizontal && !vertical) return

        const seconds = Math.min(0.05, (delta || 16) / 1000)
        this.yaw -= horizontal * LOOK_SPEED * seconds
        this.pitch = clamp(this.pitch - vertical * LOOK_SPEED * seconds, -MAX_PITCH, MAX_PITCH)
        El.cameraRig.setAttribute('rotation', { x: this.pitch, y: this.yaw, z: 0 })
    },

    axisValue: function (actionId) {
        for (const binding of this.bindings[actionId] || []) {
            const value = this.input.getAxisValue(binding)
            if (value) return value
        }
        return 0
    },

    listenOnce: function (callback) {
        this.captureCallback = callback
    },

    cancelListen: function () {
        this.captureCallback = null
    },

    assign: function (actionId, input) {
        const binding = normalizeBinding(input)
        const next = {}
        for (const action of ACTIONS) {
            const current = (this.bindings[action.id] || []).map(normalizeBinding)
            next[action.id] = action.id === actionId
                ? [binding]
                : current.filter((value) => !sameBinding(value, binding))
        }
        this.bindings = next
        Store.set(INPUT_BINDINGS_STORE, next)
        El.events.emit(EV.INPUT_BINDINGS, { actionId, binding })
    },

    reset: function () {
        const bindings = {}
        for (const action of ACTIONS) {
            bindings[action.id] = action.defaults.map(normalizeBinding)
        }
        this.bindings = bindings
        Store.set(INPUT_BINDINGS_STORE, bindings)
        El.events.emit(EV.INPUT_BINDINGS, { reset: true })
    },

    getBindings: function () {
        return this.bindings
    },

    remove: function () {
        El.events.removeEventListener(CONTROLS, this.onControls)
        El.events.removeEventListener(EV.INPUT_BINDINGS, this.onBindingsChanged)
        if (this.manualLook) this.toggleManualLook()
        this.focusRing?.parentNode?.removeChild(this.focusRing)
    },
})
