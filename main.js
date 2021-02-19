var endpoint
var playerName
var instrument
var sendVelocity

class Note {
    constructor(instrument, pitch, velocity) {
        this.instrument = instrument
        this.pitch = pitch
        this.velocity = velocity
    }
}

class NoteRequest {
    constructor(playerName, note) {
        this.playerName = playerName
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
    endpoint = document.getElementById("endpoint")
    playerName = document.getElementById("player-name")
    instrument = document.getElementById("instrument")
    sendVelocity = document.getElementById("send-velocity")

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
}

function updateDeviceList() {
    setText("inputs", "Inputs: ")
    for (input of WebMidi.inputs) {
        addText("inputs", input.name + ", ")
    }
}

function addListeners() {
    for (input of WebMidi.inputs) {
        if (!input.hasListener("noteon", "all", noteOn)) {
            input.addListener("noteon", "all", noteOn)
        }
    }
}

function noteOn(e) {
    post(endpoint.value + "/note-on",
        new NoteRequest(playerName.value,
            new Note(instrument.value,
                e.note.number,
                sendVelocity.checked ? e.velocity : 1)))
}

function post(url, data) {
    console.log(data)
    console.log(JSON.stringify(data))
    return fetch(url, { method: "POST", body: JSON.stringify(data) })
}

document.addEventListener("DOMContentLoaded", onLoad)
