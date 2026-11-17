import { INPUT_SOURCE } from './GamepadInput.js'

export const INPUT_BINDINGS_STORE = 'inputBindings'

const standardButton = (index) => ({ source: INPUT_SOURCE.STANDARD, type: 'button', index })
const standardAxis = (index, dir) => ({ source: INPUT_SOURCE.STANDARD, type: 'axis', index, dir })
const xrButton = (index, hand = 'any') => ({ source: INPUT_SOURCE.XR, type: 'button', index, hand })
const xrAxis = (index, dir, hand = 'any') => ({ source: INPUT_SOURCE.XR, type: 'axis', index, dir, hand })

export const ACTIONS = [
    {
        id: 'menuNext', label: 'Menu next', defaults: [
            standardButton(5), standardAxis(0, 1), xrButton(5, 'right'), xrAxis(0, 1, 'left'), xrAxis(2, 1, 'left')
        ]
    },
    {
        id: 'menuPrev', label: 'Menu previous', defaults: [
            standardButton(4), standardAxis(0, -1), xrButton(4, 'right'), xrAxis(0, -1, 'left'), xrAxis(2, -1, 'left')
        ]
    },
    {
        id: 'menuSelect', label: 'Menu select', defaults: [
            standardButton(0), xrButton(0, 'right'), xrButton(0, 'left')
        ]
    },
    {
        id: 'menuBack', label: 'Menu back', defaults: [
            standardButton(1), xrButton(1, 'right'), xrButton(1, 'left')
        ]
    },
    { id: 'playPause', label: 'Play / pause', defaults: [standardButton(2), xrButton(3, 'right')] },
    { id: 'seekBack', label: 'Seek back', defaults: [standardButton(14)] },
    { id: 'seekForw', label: 'Seek forward', defaults: [standardButton(15)] },
    { id: 'zoomIn', label: 'Zoom in', defaults: [standardButton(12), xrButton(4, 'right')] },
    { id: 'zoomOut', label: 'Zoom out', defaults: [standardButton(13), xrButton(5, 'right')] },
    { id: 'chromaKey', label: 'Chroma key', defaults: [standardButton(3), xrButton(4, 'left')] },
    { id: 'voidPreset', label: 'Void preset', defaults: [standardButton(8), xrButton(5, 'left')] },
    { id: 'presetPrev', label: 'Previous preset', defaults: [standardButton(6)] },
    { id: 'presetNext', label: 'Next preset', defaults: [standardButton(7)] },
    { id: 'toggleUI', label: 'Show / hide controls', defaults: [standardButton(9)] },
    { id: 'openBindings', label: 'Open bindings', defaults: [standardButton(10)] },
    { id: 'manualLook', label: 'Toggle manual look', defaults: [standardButton(11), xrButton(3, 'left')] },
    { id: 'recenter', label: 'Recenter view', defaults: [] },
    {
        id: 'lookX', label: 'Manual look - horizontal', defaults: [
            standardAxis(2), xrAxis(2, 1, 'right'), xrAxis(0, 1, 'right')
        ]
    },
    {
        id: 'lookY', label: 'Manual look - vertical', defaults: [
            standardAxis(3), xrAxis(3, 1, 'right'), xrAxis(1, 1, 'right')
        ]
    },
]

export const ACTION_MAP = Object.fromEntries(ACTIONS.map((action) => [action.id, action]))

export const DEFAULT_BINDINGS = Object.fromEntries(ACTIONS.map((action) => [action.id, action.defaults.map((binding) => ({ ...binding }))]))

const STANDARD_BUTTON_LABELS = [
    'A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Back', 'Start', 'L3', 'R3', 'D-up', 'D-down', 'D-left', 'D-right'
]

export const normalizeBinding = (binding) => ({
    source: binding.source,
    hand: binding.hand || 'any',
    type: binding.type,
    index: Number(binding.index),
    dir: binding.dir || 0,
})

export const sameBinding = (a, b) => {
    const first = normalizeBinding(a)
    const second = normalizeBinding(b)
    return first.source === second.source &&
        first.hand === second.hand &&
        first.type === second.type &&
        first.index === second.index &&
        first.dir === second.dir
}

export function labelBinding(binding) {
    const value = normalizeBinding(binding)
    const hand = value.hand === 'any' ? '' : `${value.hand === 'right' ? 'R' : 'L'} `
    const source = value.source === INPUT_SOURCE.XR ? 'XR ' : ''
    let name

    if (value.type === 'button') {
        name = value.source === INPUT_SOURCE.STANDARD
            ? (STANDARD_BUTTON_LABELS[value.index] || `Button ${value.index}`)
            : `Button ${value.index}`
    } else {
        name = `Axis ${value.index}${value.dir ? ` ${value.dir > 0 ? '+' : '-'}` : ''}`
    }

    return `${hand}${source}${name}`.trim()
}
