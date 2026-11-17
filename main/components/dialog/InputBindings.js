import { El } from '../../elems.js'
import { createEl } from '../../utils.js'
import { EV } from '../Events.js'
import { ACTIONS, labelBinding } from '../../input/actions.js'
import { DHeight, DWidth } from './Utils.js'

export const DIALOG_INPUT_BINDINGS = 'dialog-input-bindings'

const itemLimit = 4
const space = -DHeight * 0.125
const initialPosition = DHeight * 0.15

const mapper = () => document.querySelector('#input')?.components['control-mapper']

function insertHeader(el, offset) {
    const geometry = el.getAttribute('geometry')
    el.appendChild(createEl('a-entity', {
        geometry: `primitive:plane; width:${geometry.width}; height: 3`,
        position: `0 ${geometry.height / 2} 0.2`,
        material: 'color: grey',
    }, [
        createEl('a-entity', {
            text: 'value: Gamepad Bindings; align: center; width: 30;',
            position: '0 0 0.2',
        })
    ]))

    const close = createEl('a-plane', {
        geometry: 'width: 4; height: 3',
        material: 'color: #A15807',
        position: `${geometry.width / 2 - 3} ${geometry.height / 2} 0.3`,
        clickable: '',
        'button-highlight': '',
        text: 'value: X; align: center; width: 30; zOffset: 0.4;',
    })
    close.addEventListener('click', () => el.components[DIALOG_INPUT_BINDINGS]?.close())
    el.appendChild(close)

    if (offset > 0) {
        const up = createEl('a-image', {
            src: '#asset-up',
            scale: '3 3 1',
            position: `0 ${geometry.height * 0.3} 0.2`,
            clickable: '',
            'button-highlight': '',
        })
        up.addEventListener('click', () => el.setAttribute(DIALOG_INPUT_BINDINGS, { offset: offset - 1 }))
        el.appendChild(up)
    }

    if (offset + itemLimit < ACTIONS.length) {
        const down = createEl('a-image', {
            src: '#asset-up',
            scale: '3 -3 1',
            position: `0 -${geometry.height * 0.5} 0.2`,
            clickable: '',
            'button-highlight': '',
        })
        down.addEventListener('click', () => el.setAttribute(DIALOG_INPUT_BINDINGS, { offset: offset + 1 }))
        el.appendChild(down)
    }
}

function renderBindings(el, offset) {
    el.replaceChildren()
    el.setAttribute('clickable', '')
    el.object3D.visible = true

    insertHeader(el, offset)

    const bindings = mapper()?.getBindings() || {}
    let y = initialPosition
    for (let i = offset; i < offset + itemLimit && i < ACTIONS.length; i++) {
        const action = ACTIONS[i]
        el.appendChild(createEl('a-plane', {
            geometry: `width: ${DWidth * 0.40}; height: ${DHeight * 0.1}`,
            material: 'color: #801D9F',
            position: `-${DWidth * 0.25} ${y} 0.2`,
            text: `value: ${action.label}; align: center; width: 35; zOffset: 0.2;`,
        }))

        const actionBindings = bindings[action.id] || []
        const current = actionBindings.length
            ? `${labelBinding(actionBindings[0])}${actionBindings.length > 1 ? ` (+${actionBindings.length - 1})` : ''}`
            : 'unbound'
        const tile = createEl('a-plane', {
            geometry: `width: ${DWidth * 0.40}; height: ${DHeight * 0.1}`,
            material: 'color: #A15807',
            position: `${DWidth * 0.25} ${y} 0.2`,
            clickable: '',
            'button-highlight': '',
            text: `value: ${current}; align: center; width: 35; zOffset: 0.2;`,
        }, [], el)

        tile.addEventListener('click', () => {
            const controlMapper = mapper()
            if (!controlMapper) return
            tile.setAttribute('text', 'value: PRESS...; align: center; width: 35; zOffset: 0.2;')
            controlMapper.listenOnce((input) => {
                controlMapper.assign(action.id, input)
                tile.setAttribute('text', `value: ${labelBinding(input)}; align: center; width: 35; zOffset: 0.2;`)
            })
        })

        y += space
    }

    const reset = createEl('a-plane', {
        geometry: `width: 20; height: ${DHeight * 0.1}`,
        material: 'color: #A15807',
        position: `0 ${initialPosition + itemLimit * space} 0.2`,
        clickable: '',
        'button-highlight': '',
        text: 'value: Reset defaults; align: center; width: 35; zOffset: 0.2;',
    }, [], el)
    reset.addEventListener('click', () => mapper()?.reset())
}

AFRAME.registerComponent(DIALOG_INPUT_BINDINGS, {
    schema: {
        offset: { type: 'number', default: 0 },
        reRender: { type: 'string', default: '' },
    },

    init: function () {
        const el = this.el
        this.onBindingsChanged = AFRAME.utils.bind(this.onBindingsChanged, this)
        El.events.addEventListener(EV.INPUT_BINDINGS, this.onBindingsChanged)
        el.setAttribute('geometry', `primitive: plane; width: ${DWidth}; height: ${DHeight}`)
        el.setAttribute('material', 'color: teal')
        el.setAttribute('dialog-utils', { screen: DIALOG_INPUT_BINDINGS })
    },

    update: function () {
        const el = this.el
        if (this.data.reRender && this.data.reRender.length > 0) {
            el.setAttribute('dialog-utils', { screen: DIALOG_INPUT_BINDINGS })
            el.setAttribute(DIALOG_INPUT_BINDINGS, { reRender: '' })
            return
        }
        renderBindings(el, this.data.offset)
    },

    onBindingsChanged: function (event) {
        if (event.detail.actionId) return
        this.el.setAttribute(DIALOG_INPUT_BINDINGS, { reRender: 'rerender' })
    },

    close: function () {
        mapper()?.cancelListen()
        this.el.removeAttribute(DIALOG_INPUT_BINDINGS)
        this.el.removeAttribute('clickable')
        this.el.replaceChildren()
        this.el.object3D.visible = false
    },

    remove: function () {
        mapper()?.cancelListen()
        El.events.removeEventListener(EV.INPUT_BINDINGS, this.onBindingsChanged)
        this.el.replaceChildren()
        this.el.removeAttribute('clickable')
        this.el.setAttribute('dialog-utils', { screen: '' })
    },
})
