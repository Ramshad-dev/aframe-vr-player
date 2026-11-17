import { El } from "../../elems.js";
import { C_FILES } from "../dialog/Files.js";
import { DIALOG_SETTINGS } from "../dialog/Settings.js";
import { DIALOG_INPUT_BINDINGS } from "../dialog/InputBindings.js";

const closeOtherDialogs = (dialog) => {
    if (dialog.hasAttribute(DIALOG_SETTINGS)) dialog.removeAttribute(DIALOG_SETTINGS);
    if (dialog.hasAttribute(C_FILES)) dialog.removeAttribute(C_FILES);
};

AFRAME.registerComponent('btn-input-bindings', {
    init: function () {
        const dialog = El.dialog
        this.el.addEventListener('click', () => {
            if (!dialog.hasAttribute(DIALOG_INPUT_BINDINGS)) {
                closeOtherDialogs(dialog)
                dialog.setAttribute(DIALOG_INPUT_BINDINGS, '')
                dialog.object3D.visible = true
                return
            }

            if (!dialog.object3D.visible) {
                dialog.setAttribute(DIALOG_INPUT_BINDINGS, { reRender: 'rerender' })
                return
            }

            if (dialog.getAttribute('dialog-utils')?.screen === DIALOG_INPUT_BINDINGS) {
                dialog.components[DIALOG_INPUT_BINDINGS]?.close()
            } else {
                dialog.setAttribute(DIALOG_INPUT_BINDINGS, { reRender: 'rerender' })
            }
        })
    },
});
