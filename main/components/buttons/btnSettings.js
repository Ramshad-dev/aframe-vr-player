import { El } from "../../elems.js";
import { C_FILES } from "../dialog/Files.js";
import { DIALOG_SETTINGS } from "../dialog/Settings.js";
import { DIALOG_INPUT_BINDINGS } from "../dialog/InputBindings.js";

const closeOtherDialogs = (dialog) => {
    if (dialog.hasAttribute(DIALOG_INPUT_BINDINGS)) dialog.removeAttribute(DIALOG_INPUT_BINDINGS);
    if (dialog.hasAttribute(C_FILES)) dialog.removeAttribute(C_FILES);
};

AFRAME.registerComponent('btn-settings', {
    schema: {

    },

    init: function () {
        let el = this.el
        let d = El.dialog
        el.addEventListener('click', () => {
            if (d.hasAttribute(DIALOG_SETTINGS)) {
                if (d.object3D.visible) {
                    if (d.getAttribute('dialog-utils').screen === DIALOG_SETTINGS) {
                        d.removeAttribute('clickable')
                        d.replaceChildren()
                        d.object3D.visible = false
                    } else {
                        closeOtherDialogs(d)
                        d.setAttribute(DIALOG_SETTINGS, { reRender: 'rerender' })
                    }
                } else {
                    d.setAttribute(DIALOG_SETTINGS, { reRender: 'rerender' })
                }
            } else {
                closeOtherDialogs(d)
                d.setAttribute(DIALOG_SETTINGS, '')
                d.object3D.visible = true
            }
        })
        // el.click()
    },
});