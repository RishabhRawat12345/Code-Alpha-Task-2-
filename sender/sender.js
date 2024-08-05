const webSocket = new WebSocket("ws://192.168.4.123:3000");

webSocket.onmessage = (event) => {
    handleSignallingData(JSON.parse(event.data));
};

function handleSignallingData(data) {
    switch (data.type) {
        case "answer":
            peerConn.setRemoteDescription(new RTCSessionDescription(data.answer));
            break;
        case "candidate":
            peerConn.addIceCandidate(new RTCIceCandidate(data.candidate));
            break;
    }
}

let username;
function sendUsername() {
    username = document.getElementById("username-input").value;
    sendData({
        type: "store_user"
    });
}

function sendData(data) {
    data.username = username;
    webSocket.send(JSON.stringify(data));
}

let localStream;
let peerConn;
let screenSharingStream;

async function startCall() {
    document.getElementById("video-call-div").style.display = "inline";

    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: {
                frameRate: 24,
                width: {
                    min: 480, ideal: 720, max: 1280
                },
                aspectRatio: 1.33333
            },
            audio: true
        });

        document.getElementById("local-video").srcObject = localStream;

        let configuration = {
            iceServers: [
                {
                    urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"]
                }
            ]
        };

        peerConn = new RTCPeerConnection(configuration);
        peerConn.addStream(localStream);

        peerConn.onaddstream = (e) => {
            document.getElementById("remote-video").srcObject = e.stream;
        };

        peerConn.onicecandidate = (e) => {
            if (e.candidate == null) return;
            sendData({
                type: "store_candidate",
                candidate: e.candidate
            });
        };

        createAndSendOffer();

    } catch (error) {
        console.error("Error accessing media devices.", error);
    }
}

function createAndSendOffer() {
    peerConn.createOffer()
        .then((offer) => {
            sendData({
                type: "store_offer",
                offer: offer
            });

            peerConn.setLocalDescription(offer);
        })
        .catch((error) => {
            console.error("Error creating an offer.", error);
        });
}

let isAudio = true;
function muteAudio() {
    isAudio = !isAudio;
    localStream.getAudioTracks()[0].enabled = isAudio;
}

let isVideo = true;
function muteVideo() {
    isVideo = !isVideo;
    localStream.getVideoTracks()[0].enabled = isVideo;
}

async function shareScreen() {
    try {
        screenSharingStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenSharingStream.getTracks()[0];

        peerConn.addTrack(screenTrack, screenSharingStream);

        screenTrack.onended = () => {
            peerConn.removeTrack(screenTrack);
            localStream.getVideoTracks()[0].enabled = true;
        };

        localStream.getVideoTracks()[0].enabled = false;

    } catch (error) {
        console.error("Error sharing the screen.", error);
    }
}
