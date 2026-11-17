import { El } from "../elems.js";
import { C_VID_STATE } from "../components/VideoState.js";
import { Store } from "../store.js";

const LAST_URL_KEY = 'streamLinkUrl'
const DIALOG_ID = 'stream-link-dialog'

let dialog
let panel
let input
let errorEl
let playBtn
let cancelBtn
let pendingCleanup = null
let lastFocused = null

function injectStyles() {
    if (document.getElementById('stream-link-styles')) return
    const style = document.createElement('style')
    style.id = 'stream-link-styles'
    style.textContent = `
#${DIALOG_ID} {
    position: fixed;
    inset: 0;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: rgba(0, 0, 0, 0.72);
    z-index: 9999;
    font-family: Arial, Helvetica, sans-serif;
}
#${DIALOG_ID}.open {
    display: flex;
}
#${DIALOG_ID} .stream-link-panel {
    box-sizing: border-box;
    width: min(560px, 100%);
    padding: 22px;
    border-radius: 12px;
    background: #202020;
    color: #f2f2f2;
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.5);
}
#${DIALOG_ID} h2 {
    margin: 0 0 16px;
    font-size: 20px;
}
#${DIALOG_ID} label {
    display: block;
    margin-bottom: 6px;
    font-size: 13px;
    color: #bdbdbd;
}
#${DIALOG_ID} input {
    box-sizing: border-box;
    width: 100%;
    padding: 12px;
    border: 1px solid #4a4a4a;
    border-radius: 8px;
    background: #111;
    color: #fff;
    font-size: 16px;
}
#${DIALOG_ID} input:focus {
    outline: 2px solid #5e74a7;
    outline-offset: 1px;
}
#${DIALOG_ID} .stream-link-error {
    display: none;
    margin: 10px 0 0;
    color: #ff8a80;
    font-size: 14px;
}
#${DIALOG_ID} .stream-link-error.visible {
    display: block;
}
#${DIALOG_ID} .stream-link-hint {
    margin: 10px 0 0;
    color: #9e9e9e;
    font-size: 12px;
    line-height: 1.4;
}
#${DIALOG_ID} .stream-link-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
}
#${DIALOG_ID} button {
    padding: 10px 18px;
    border: 0;
    border-radius: 8px;
    background: #3a3a3a;
    color: #fff;
    font-size: 15px;
    cursor: pointer;
}
#${DIALOG_ID} button:hover:not(:disabled) {
    background: #4a4a4a;
}
#${DIALOG_ID} button:disabled {
    opacity: 0.6;
    cursor: default;
}
#${DIALOG_ID} button.stream-link-primary {
    background: #5e74a7;
}
#${DIALOG_ID} button.stream-link-primary:hover:not(:disabled) {
    background: #7088bd;
}
`
    document.head.appendChild(style)
}

function isValidHostname(hostname) {
    if (!hostname) return false
    if (/^\[[0-9a-f:.]+\]$/i.test(hostname)) return true
    return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i.test(hostname)
}

function normalizeUrl(value) {
    let url = value.trim()
    if (!url) throw new Error('Enter a video URL')
    if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
        try {
            url = new URL(url, window.location.href).href
        } catch (err) {
            throw new Error('Enter a valid URL')
        }
    } else if (!/^[a-z][a-z\d+\-.]*:/i.test(url)) {
        url = 'https://' + url
    }

    let parsed
    try {
        parsed = new URL(url)
    } catch (err) {
        throw new Error('Enter a valid URL')
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Only http and https links are supported')
    }
    if (!isValidHostname(parsed.hostname)) {
        throw new Error('Enter a valid URL')
    }
    return parsed.href
}

function fileNameFromUrl(url) {
    try {
        const path = new URL(url).pathname
        const fileName = decodeURIComponent(path.substring(path.lastIndexOf('/') + 1))
        return fileName || 'stream'
    } catch (err) {
        return 'stream'
    }
}

function showError(message) {
    errorEl.textContent = message
    errorEl.classList.toggle('visible', message.length > 0)
}

function setBusy(busy) {
    input.disabled = busy
    playBtn.disabled = busy
    playBtn.textContent = busy ? 'Loading...' : 'Play'
}

function cleanupPending() {
    if (pendingCleanup) {
        pendingCleanup()
        pendingCleanup = null
    }
}

function close() {
    cleanupPending()
    setBusy(false)
    dialog.classList.remove('open')
    if (lastFocused && lastFocused.focus) lastFocused.focus()
}

function onSubmit(event) {
    event.preventDefault()

    let url
    try {
        url = normalizeUrl(input.value)
    } catch (err) {
        showError(err.message)
        return
    }

    showError('')
    input.value = url
    Store.set(LAST_URL_KEY, url)

    const video = El.video
    const current = El.videoState.getAttribute(C_VID_STATE)
    const isSame = current.src === url

    if (isSame && !video.error && video.readyState >= 1) {
        video.play().catch(() => {})
        close()
        return
    }

    cleanupPending()
    setBusy(true)

    const onLoaded = () => {
        cleanupPending()
        setBusy(false)
        close()
    }
    const onError = () => {
        cleanupPending()
        setBusy(false)
        showError('Unable to load this link. Check that it points to a video and allows cross-origin playback.')
    }
    const cleanup = () => {
        video.removeEventListener('loadedmetadata', onLoaded)
        video.removeEventListener('error', onError)
        pendingCleanup = null
    }

    pendingCleanup = cleanup
    video.addEventListener('loadedmetadata', onLoaded)
    video.addEventListener('error', onError)

    El.subtitles.removeAttribute('subtitles')
    if (isSame) {
        video.load()
        video.play().catch(() => {})
    } else {
        El.videoState.setAttribute(C_VID_STATE, {
            src: url,
            fileName: fileNameFromUrl(url)
        })
    }
}

function buildDialog() {
    if (dialog) return

    injectStyles()

    dialog = document.createElement('div')
    dialog.id = DIALOG_ID
    dialog.setAttribute('role', 'dialog')
    dialog.setAttribute('aria-modal', 'true')
    dialog.setAttribute('aria-labelledby', 'stream-link-title')

    panel = document.createElement('form')
    panel.className = 'stream-link-panel'

    const title = document.createElement('h2')
    title.id = 'stream-link-title'
    title.textContent = 'Stream video from link'

    const label = document.createElement('label')
    label.htmlFor = 'stream-link-input'
    label.textContent = 'Video URL'

    input = document.createElement('input')
    input.id = 'stream-link-input'
    input.type = 'text'
    input.inputMode = 'url'
    input.autocomplete = 'off'
    input.spellcheck = false
    input.placeholder = 'https://example.com/video.mp4'

    errorEl = document.createElement('p')
    errorEl.className = 'stream-link-error'
    errorEl.setAttribute('role', 'alert')

    const hint = document.createElement('p')
    hint.className = 'stream-link-hint'
    hint.textContent = 'Use a direct video link (mp4, webm, ...). The host must allow cross-origin playback.'

    const actions = document.createElement('div')
    actions.className = 'stream-link-actions'

    cancelBtn = document.createElement('button')
    cancelBtn.type = 'button'
    cancelBtn.textContent = 'Cancel'

    playBtn = document.createElement('button')
    playBtn.type = 'submit'
    playBtn.className = 'stream-link-primary'
    playBtn.textContent = 'Play'

    actions.append(cancelBtn, playBtn)
    panel.append(title, label, input, errorEl, hint, actions)
    dialog.append(panel)
    document.body.append(dialog)

    panel.addEventListener('submit', onSubmit)
    cancelBtn.addEventListener('click', close)
    dialog.addEventListener('mousedown', (event) => {
        if (event.target === dialog) close()
    })
    dialog.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') close()
    })
}

export function openStreamLinkDialog() {
    buildDialog()

    if (dialog.classList.contains('open')) {
        input.focus()
        input.select()
        return
    }

    lastFocused = document.activeElement
    showError('')
    setBusy(false)
    input.value = Store.get(LAST_URL_KEY) ?? ''
    dialog.classList.add('open')

    requestAnimationFrame(() => {
        input.focus()
        input.select()
    })
}
