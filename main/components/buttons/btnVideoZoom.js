import { El } from "../../elems.js";
import { createEl, setAttr } from "../../utils.js";
import { getSettings, setSettings, ST } from "../settings/Settings.js";
import { EV } from "../Events.js";

export const ZOOM_LEVELS = [1, 1.25, 1.5, 2, 3, 4, 6]

AFRAME.registerComponent('btn-video-zoom', {
    init: function () {
        let el = this.el
        this.setZoom = AFRAME.utils.bind(this.setZoom, this)
        this.onSettingsChange = AFRAME.utils.bind(this.onSettingsChange, this)
        El.events.addEventListener(EV.SETTINGS, this.onSettingsChange)

        let width = this.width = 10
        let height = this.height = 4
        setAttr(el, {
            geometry: {
                primitive: 'plane',
                width: width + 1,
                height: height + 1,
            },
            material: 'color: #808080',
            text: `value: 1x; width: 40; zOffset: 0.4; align: center`,
        })
        this.bar = createEl('a-entity', {
            material: 'color: #005073',
            geometry: `primitive: plane; width: ${width}; height: ${height};`,
            position: '0 0 0.2'
        }, [], el)

        el.addEventListener('click', (e) => {
            const point = e.detail.intersection.point.clone()
            el.object3D.worldToLocal(point)
            this.setZoom(point.x / this.width + 0.5)
        })

        this.setZoom(getSettings(ST.VIDEO_ZOOM) ?? 1)
    },
    setZoom: function (value, emit = true) {
        let index
        if (ZOOM_LEVELS.includes(value)) {
            index = ZOOM_LEVELS.indexOf(value)
        } else {
            let t = Math.max(0, Math.min(1, Number(value) || 0))
            index = Math.round(t * (ZOOM_LEVELS.length - 1))
        }

        const zoom = ZOOM_LEVELS[index]
        const fraction = index / (ZOOM_LEVELS.length - 1)
        const q = Math.max(0.5, this.width * fraction)
        const p = q / 2

        if (emit) setSettings(ST.VIDEO_ZOOM, zoom)
        setAttr(this.el, {
            text: `value: ${zoom}x`
        })
        setAttr(this.bar, {
            position: `${p - this.width / 2} 0 0.2`,
            geometry: { width: q }
        })
    },
    onSettingsChange: function (event) {
        const zoom = event.detail[ST.VIDEO_ZOOM]
        if (zoom === undefined) return
        this.setZoom(zoom, false)
    },
    remove: function () {
        El.events.removeEventListener(EV.SETTINGS, this.onSettingsChange)
    }
});
