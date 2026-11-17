import { openStreamLinkDialog } from "../../web/streamLink.js";

AFRAME.registerComponent('btn-stream-link', {
    init: function () {
        this.el.addEventListener('click', openStreamLinkDialog)
    }
});
