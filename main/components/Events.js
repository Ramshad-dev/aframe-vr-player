export const EVENTS = "events"
export const EV = {
    SETTINGS: 'Settings',
    VIDSTATE: 'VideoState',
    CONTROLS: 'Controls',
    ENVIRONMENT: 'Environment',
    INPUT: 'Input',
    INPUT_BINDINGS: 'InputBindings',
}

AFRAME.registerComponent('events', {
    init: function () {
        console.log("Events initialized...")
    },
});