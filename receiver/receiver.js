const webSocket = new WebSocket("ws://192.168.4.123:3000");

webSocket.onmessage = (event) => {
    handleSignallingData(JSON.parse(event.data));
};

function handleSignallingData(data) {
    switch (data.type) {
        case "offer":
            peerConn.setRemoteDescription(new RTCSessionDescription(data.offer));
            createAndSendAnswer();
            break;
        case "candidate":
            peerConn.addIceCandidate(new RTCIceCandidate(data.candidate));
            break;
    }
}

function createAndSendAnswer() {
    peerConn.createAnswer().then(answer => {
        peerConn.setLocalDescription(answer);
        sendData({
            type: "send_answer",
            answer: answer
        });
    }).catch(error => {
        console.log(error);
    });
}

function sendData(data) {
    data.username = username;
    webSocket.send(JSON.stringify(data));
}

let localStream;
let peerConn;
let username;

function joinCall() {
    username = document.getElementById("username-input").value;

    document.getElementById("video-call-div").style.display = "inline";

    navigator.mediaDevices.getUserMedia({
        video: {
            frameRate: 24,
            width: { min: 480, ideal: 720, max: 1280 },
            aspectRatio: 1.33333
        },
        audio: true
    }).then(stream => {
        localStream = stream;
        document.getElementById("local-video").srcObject = localStream;

        let configuration = {
            iceServers: [
                {
                    urls: [
                        "stun:stun.l.google.com:19302",
                        "stun:stun1.l.google.com:19302",
                        "stun:stun2.l.google.com:19302"
                    ]
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
                type: "send_candidate",
                candidate: e.candidate
            });
        };

        sendData({
            type: "join_call"
        });

    }).catch(error => {
        console.log(error);
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
