// The radio button elements for selecting the connection types.
var connectionTypes
var webSocketButton
var httpButton

// The buttons and input elements that appear once you select the connection type.
var webSocketEndpoint
var webSocketEndpointLabel
var webSocketConnectButton
var httpEndpoint
var httpEndpointLabel

// The log element.
var logElement

// The player setting elements.
var playerName
var instrument
var sendVelocity

// The magic octave instruments.
var magicOctaveOneInstrument
var magicOctaveTwoInstrument
var magicOctaveThreeInstrument

/**
 * The active WebSocket connection. Might be null.
 */
var webSocket

/**
 * Represents a note.
 */
class Note {
    constructor(instrumentValue, pitch, velocity) {
        this.instrument = instrumentValue
        this.pitch = pitch
        this.velocity = velocity
    }
}

/**
 * Represents a note request.
 */
class NoteRequest {
    constructor(playerNameValue, type, note) {
        this.playerName = playerNameValue
        this.type = type
        this.note = note
    }
}

/**
 * Called when the DOM content loads and sets up listeners, variables, etc.
 */
function onLoad() {
    connectionTypes = document.getElementsByName("connection-type")
    webSocketButton = document.getElementById("websocket")
    httpButton = document.getElementById("http")

    webSocketEndpoint = document.getElementById("websocket-endpoint")
    webSocketEndpointLabel = document.getElementById("websocket-endpoint-label")
    webSocketConnectButton = document.getElementById("websocket-connect")
    httpEndpoint = document.getElementById("http-endpoint")
    httpEndpointLabel = document.getElementById("http-endpoint-label")

    logElement = document.getElementById("log")

    playerName = document.getElementById("player-name")
    instrument = document.getElementById("instrument")
    sendVelocity = document.getElementById("send-velocity")

    magicOctaveOneInstrument = document.getElementById("magic-octave-one-instrument")
    magicOctaveTwoInstrument = document.getElementById("magic-octave-two-instrument")
    magicOctaveThreeInstrument = document.getElementById("magic-octave-three-instrument")

    setupPianoKeys()

    // Set the active connection type whenever a radio button is clicked.
    for (let radioButton of connectionTypes) {
        radioButton.addEventListener("change", function () {
            setActiveConnectionVisibility(this.value)
        })
    }

    setActiveConnectionVisibility("websocket")

    // Set the magic octave instruments selectors visibility whenever magic is selected.
    instrument.addEventListener("change", function() {
        setMagicOctaveInstrumentsVisibility(this.value == "MAGIC") 
    });

    setMagicOctaveInstrumentsVisibility(false)

    webSocketConnectButton.addEventListener("click", connectWebSocket)

    WebMidi.enable(onWebMidiEnable, true)
}

/**
 * Sets up the piano keys for the piano on the page itself.
 * Doesn't do anything related to actual MIDI devices.
 */
function setupPianoKeys() {
    var keys = document.getElementsByClassName("piano-key")

    for (let key of keys) {
        var classes = key.classList
        if (!classes.contains("piano-disabled")) {
            classes.forEach(function (c) {
                if (c.startsWith("piano-key-")) {
                    var keyName = c.replace("piano-key-", "")
                    key.onclick = function () {
                        onClick(keyName)
                    }
                }
            })
        }
    }
}

/**
 * Sets the visibility of the endpoint text inputs, the endpoint labels, and the
 * WebSocket connect button.
 * @param {string} setting either "websocket" or "http"
 */
function setActiveConnectionVisibility(setting) {
    if (setting == "websocket") {
        webSocketEndpoint.style.display = "inline"
        webSocketEndpointLabel.style.display = "inline"
        httpEndpoint.style.display = "none"
        httpEndpointLabel.style.display = "none"

        webSocketConnectButton.style.display = "inline"
    } else if (setting == "http") {
        webSocketEndpoint.style.display = "none"
        webSocketEndpointLabel.style.display = "none"
        httpEndpoint.style.display = "inline"
        httpEndpointLabel.style.display = "inline"

        webSocketConnectButton.style.display = "none"
    } else {
        webSocketEndpoint.style.display = "none"
        webSocketEndpointLabel.style.display = "none"
        httpEndpoint.style.display = "none"
        httpEndpointLabel.style.display = "none"

        webSocketConnectButton.style.display = "none"
    }
}

/**
 * Sets whether the magic instrument options should be visible.
 * @param {boolean} bool 
 */
function setMagicOctaveInstrumentsVisibility(bool) {
    if (bool) {
        magicOctaveOneInstrument.style.display = "block"
        magicOctaveTwoInstrument.style.display = "block"
        magicOctaveThreeInstrument.style.display = "block"
    } else {
        magicOctaveOneInstrument.style.display = "none"
        magicOctaveTwoInstrument.style.display = "none"
        magicOctaveThreeInstrument.style.display = "none"
    }
}

/**
 * Called when WebMidi is enabled.
 * @param {} err the error. null if there isn't one 
 */
function onWebMidiEnable(err) {
    if (err) {
        log("WebMidi couldn't be enabled: " + err)
        setText("status", "Sorry, something went wrong when trying to load the Web MIDI API. In order to connect your MIDI devices, please use a different browser. Or, just use the piano below!")
    } else {
        log("WebMidi enabled!")
        setText("status", "Web MIDI API loaded! Your connected MIDI devices should appear down below!")
        updateDeviceList()
        addInputListeners()

        WebMidi.addListener("connected", function (e) {
            console.log(e)
            updateDeviceList()
            addInputListeners()
        })

        WebMidi.addListener("disconnected", function (e) {
            console.log(e)
            updateDeviceList()
        })
    }
}

/**
 * Tries to create a new WebSocket using webSocketEndpoint's value as the endpoint.
 */
function connectWebSocket() {
    log("Connecting via WebSocket..")
    webSocket = new WebSocket(webSocketEndpoint.value)

    webSocket.onopen = function () {
        // FIXME/TODO Setup server to handle JOIN RequestTypes. At the current moment, this results in an error, so it is disabled.
        //webSocket.send(JSON.stringify({ playerName: playerName.value, type: "JOIN" }))
        log("Successfully connected!")
    }

    webSocket.onmessage = function (event) {
        log(event.data)
    }

    webSocket.onerror = function (event) {
        log("WebSocket error: " + event.data)
    }
}

/**
 * Updates the device list.
 */
function updateDeviceList() {
    setText("inputs", "Inputs: ")
    for (var input of WebMidi.inputs) {
        addText("inputs", input.name + ", ")
    }
}

/**
 * For each of the MIDI inputs, add listeners for note on and note
 * off if a listener is not already registered.
 */
function addInputListeners() {
    for (var input of WebMidi.inputs) {
        if (!input.hasListener("noteon", "all", onNoteOn)) {
            input.addListener("noteon", "all", onNoteOn)
        }
        if (!input.hasListener("noteoff", "all", onNoteOff)) {
            input.addListener("noteoff", "all", onNoteOff)
        }
    }
}

/**
 * Sets the innerHTML of an element.
 * @param {string} id the id of the element
 * @param {*} value what to set the innerHTML to
 */
function setText(id, value) {
    document.getElementById(id).innerHTML = value
}

/**
 * Adds to the innerHTML of an element.
 * @param {string} id the id of the element
 * @param {*} value what to add to the innerHTML
 */
function addText(id, value) {
    document.getElementById(id).innerHTML += value
}

/**
 * Called when a piano key is clicked.
 * @param {string} keyName 
 */
function onClick(keyName) {
    createAndSendNote("ON", WebMidi.guessNoteNumber(keyName), 1)
}

/**
 * Called when a MIDI input has a note on event.
 * @param {*} e the event 
 */
function onNoteOn(e) {
    onNote(e, "ON")
}

/**
 * Called when a MIDI input has a note off event.
 * @param {*} e the event
 */
function onNoteOff(e) {
    onNote(e, "OFF")
}

/**
 * Called when a MIDI input has either a note on or note off event.
 * @param {*} e 
 * @param {*} type 
 */
function onNote(e, type) {
    createAndSendNote(type, e.note.number, sendVelocity.checked ? e.velocity : 1)
}

/**
 * Creates and sends a note. Gets instrument based off of the current
 * value of the instrument selector element, thus this does not require 
 * an argument for it.
 * @param {int} midiNoteNumber the midi note number
 * @param {string} type the type of request, either "ON" or "OFF" atm
 */
function createAndSendNote(type, midiNoteNumber, velocity) {
    var data
    if (instrument.value == "MAGIC") {
        data = new NoteRequest(playerName.value, type,
            getMagicNote(midiNoteNumber,
                velocity))
    } else {
        data = new NoteRequest(playerName.value, type,
            new Note(instrument.value,
                midiNoteNumber,
                velocity))
    }

    sendData(data)
}

/**
 * Sends data to either the HTTP POST endpoint or the WebSocket
 * Endpoint, depending on which is enabled.
 * @param {*} data the data to send
 */
function sendData(data) {
    console.log("Sending data: " + JSON.stringify(data))

    if (webSocketButton.checked) {
        if (!webSocket) {
            log("WebSocket not connected.")
        }
        sendWebSocketMessage(webSocketEndpoint.value, data)
    } else if (httpButton.checked) {
        post(httpEndpoint.value, data).then(function(response) {
            response.text().then(text => log(text))
        })
    }
}

/**
 * Sends an HTTP POST request to an endpoint.
 * @param {string} url the endpoint
 * @param {string} data the data to send
 */
function post(url, data) {
    if (!url) {
        return
    }
    return fetch(url, { method: "POST", body: JSON.stringify(data) })
}

/**
 * Sends a WebSocket message to an endpoint.
 * @param {string} url the endpoint
 * @param {string} data the data to send
 */
function sendWebSocketMessage(url, data) {
    if (!url || !webSocket || webSocket.readyState !== WebSocket.OPEN) {
        return
    }
    webSocket.send(JSON.stringify(data))
}

/**
 * Logs a message to both the console and the log textarea on the page.
 * @param {string} message 
 */
function log(message) {
    console.log(message)
    logElement.innerHTML = message + "\n" + logElement.innerHTML
}

/**
 * Gets a magic note which has the instrument according to the note being played.
 * @returns {note} note
 */
function getMagicNote(midiNoteNumber, velocity) {
    // Here, we select an instrument for the correct range.
    var instrument
    if (midiNoteNumber >= 30 && midiNoteNumber <= 53) {
        instrument = magicOctaveOneInstrument.value
    } else if (midiNoteNumber >= 54 && midiNoteNumber <= 78) {
        instrument = magicOctaveTwoInstrument.value
    } else if (midiNoteNumber >= 79 && midiNoteNumber <= 102) {
        instrument = magicOctaveThreeInstrument.value
    } else {
        instrument = "BIT"
    }

    // Normalize MIDI note number into a range between F#3 to F#5.
    var pitch
    if (midiNoteNumber <= 29) {
        pitch = 54
    } else if (midiNoteNumber >= 103) {
        pitch = 78
    } else {
        if (midiNoteNumber <= 53) {
            pitch = midiNoteNumber + 24
        } else if (midiNoteNumber >= 79) {
            pitch = midiNoteNumber - 24
        } else {
            pitch = midiNoteNumber
        }
    }

    return new Note(instrument, pitch, velocity)
}

// After all functions are loaded, call onLoad.
document.addEventListener("DOMContentLoaded", onLoad)
