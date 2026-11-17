import { El } from "../../elems.js";
import { EV } from "../Events.js";
import { getSettings, setSettings, ST } from "../settings/Settings.js";

const ON = '#asset-chroma-on'
const OFF = '#asset-chroma-off'

AFRAME.registerComponent('btn-chroma-key', {
    init: function () {
        this.onClick = () => {
            setSettings(ST.PASSTHROUGH, !getSettings(ST.PASSTHROUGH))
        }
        this.onSettingsChange = AFRAME.utils.bind(this.onSettingsChange, this)

        El.events.addEventListener(EV.SETTINGS, this.onSettingsChange)
        this.el.addEventListener('click', this.onClick)
        this.setIcon(!!getSettings(ST.PASSTHROUGH))
    },
    setIcon: function (enabled) {
        this.el.setAttribute('src', enabled ? ON : OFF)
    },
    onSettingsChange: function (e) {
        this.setIcon(!!e.detail[ST.PASSTHROUGH])
    },
    remove: function () {
        this.el.removeEventListener('click', this.onClick)
        El.events.removeEventListener(EV.SETTINGS, this.onSettingsChange)
    }
});
