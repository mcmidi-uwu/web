var httpEndpoint
var websocketEndpoint
var playerName
var instrument
var sendVelocity
var websocket

class Note {
    constructor(instrumentValue, pitch, velocity) {
        this.instrument = instrumentValue
        this.pitch = pitch
        this.velocity = velocity
    }
}

class NoteRequest {
    constructor(playerNameValue, note, on) {
        this.type = on ? "NoteOn" : "NoteOff"
        this.playerName = playerNameValue
        this.note = note
    }
}

function setText(id, value) {
    document.getElementById(id).innerHTML = value
}

function addText(id, value) {
    document.getElementById(id).innerHTML += value
}

function onLoad() {
    httpEndpoint = document.getElementById("http-endpoint")
    websocketEndpoint = document.getElementById("websocket-endpoint")
    playerName = document.getElementById("player-name")
    instrument = document.getElementById("instrument")
    sendVelocity = document.getElementById("send-velocity")

    setupKeys();

    WebMidi.enable(function (err) {
        if (err) {
            console.log("WebMidi couldn't be enabled.", err)
            setText("status", "Sorry, something went wrong. Please reload the page or use a different browser.")
        } else {
            console.log("WebMidi enabled!")
            setText("status", "Loaded! Please connect your MIDI device.")
            updateDeviceList()
            addListeners()

            WebMidi.addListener("connected", function (e) {
                console.log(e)
                updateDeviceList()
                addListeners()
            })

            WebMidi.addListener("disconnected", function (e) {
                console.log(e)
                updateDeviceList()
            })
        }
    }, true)

    connectWebsocket();
    websocketEndpoint.onblur = function () {
        connectWebsocket();
    };
}

function connectWebsocket() {
    console.log("connecting...");
    websocket = new WebSocket(websocketEndpoint.value);
    websocket.onopen = function () {
        websocket.send(JSON.stringify({type: "Join", playerName: playerName.value}));
    }
    websocket.onmessage = function (event) {
        console.log("got message from socket: " + event.data);
    }
    websocket.onerror = function (event) {
        console.log("socket error: " + event.data);
    }
}

function setupKeys() {
    var keys = document.getElementsByClassName("piano-key");

    for (let key of keys) {
        var classes = key.classList;
        if (!classes.contains("piano-disabled")) {
            classes.forEach(function (c) {
                if (c.startsWith("piano-key-")) {
                    var keyName = c.replace("piano-key-", "");
                    key.onclick = function () {
                        onClick(keyName);
                    }
                }
            })
        }
    }
}

function updateDeviceList() {
    setText("inputs", "Inputs: ")
    for (var input of WebMidi.inputs) {
        addText("inputs", input.name + ", ")
    }
}

function addListeners() {
    for (var input of WebMidi.inputs) {
        if (!input.hasListener("noteon", "all", onNoteOn)) {
            input.addListener("noteon", "all", onNoteOn)
        }
        if (!input.hasListener("noteoff", "all", onNoteOff)) {
            input.addListener("noteon", "all", onNoteOff)
        }
    }
}

function onClick(keyName) {
    var data = new NoteRequest(playerName.value,
        new Note(instrument.value,
            WebMidi.guessNoteNumber(keyName),
            sendVelocity.checked ? e.velocity : 1),
        true
    );

    sendData(data);
}

function onNoteOn(e) {
    onNote(e, false);
}

function onNoteOff(e) {
    onNote(e, false);
}

function onNote(e, on) {
    var data = new NoteRequest(playerName.value,
        new Note(instrument.value,
            e.note.number,
            sendVelocity.checked ? e.velocity : 1),
        on
    );
    sendData(data)
}

function sendData(data) {
    console.log("sendData: " + JSON.stringify(data));
    post(httpEndpoint.value + "/note", data);
    sendMessage(websocketEndpoint.value, data);
}

function post(url, data) {
    if (!url) {
        return;
    }
    return fetch(url, {method: "POST", body: JSON.stringify(data)});
}

function sendMessage(url, data) {
    if (!url || !websocket || websocket.readyState !== WebSocket.OPEN) {
        return;
    }

    websocket.send(JSON.stringify(data));
}

document.addEventListener("DOMContentLoaded", onLoad);
