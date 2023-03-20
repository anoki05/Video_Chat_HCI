import React from "react";
import styles from "./Dashboard.module.css";

import { useRef, useState } from "react";

import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

export default function Dashboard() {
  const callInputRef = useRef();
  const webcamVideoRef = useRef();
  const remoteVideoRef = useRef();

  const firebaseConfig = {
    apiKey: "AIzaSyDaT3Wuyla5Ek-Ro75aIF6LYfkB1JC-qWc",
    authDomain: "video-web-app-be277.firebaseapp.com",
    projectId: "video-web-app-be277",
    storageBucket: "video-web-app-be277.appspot.com",
    messagingSenderId: "440655337824",
    appId: "1:440655337824:web:69fa483514a435e6c5e605",
    measurementId: "G-0TFC5ZESQD",
  };

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  const firestore = firebase.firestore();

  const servers = {
    iceServers: [
      {
        urls: [
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
        ],
      },
    ],
    iceCandidatePoolSize: 10,
  };

  //Button states
  const [webcam, setWebcam] = useState(false);
  const [call, setCall] = useState(true);
  const [answer, setAnswer] = useState(true);

  // Global State
  const pcRef = useRef(new RTCPeerConnection(servers));
  // const pc = new RTCPeerConnection(servers);
  let localStream = null;
  let remoteStream = null;

  const webcamFunction = async () => {
    console.log("Webcam function start");
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    remoteStream = new MediaStream();

    // Push tracks from local stream to peer connection
    localStream.getTracks().forEach((track) => {
      pcRef.current.addTrack(track, localStream);
      console.log("Local tracks addition");
    });

    // Pull tracks from remote stream, add to video stream
    pcRef.current.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);
        console.log("Remote tracks addition");
      });
    };

    webcamVideoRef.current.srcObject = localStream;
    remoteVideoRef.current.srcObject = remoteStream;

    setCall(false);
    setAnswer(false);
    setWebcam(true);
  };

  const callFunction = async () => {
    // Reference Firestore collections for signaling
    const callDoc = firestore.collection("calls").doc();
    const offerCandidates = callDoc.collection("offerCandidates");
    const answerCandidates = callDoc.collection("answerCandidates");

    callInputRef.current.value = callDoc.id;

    // Get candidates for caller, save to db
    pcRef.current.onicecandidate = (event) => {
      event.candidate && offerCandidates.add(event.candidate.toJSON());
    };

    // Create offer
    const offerDescription = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    await callDoc.set({ offer });

    // Listen for remote answer
    callDoc.onSnapshot((snapshot) => {
      const data = snapshot.data();
      if (!pcRef.current.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        pcRef.current.setRemoteDescription(answerDescription);
      }
    });

    // When answered, add candidate to peer connection
    answerCandidates.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const candidate = new RTCIceCandidate(change.doc.data());
          pcRef.current.addIceCandidate(candidate);
        }
      });
    });
  };

  const answerFunction = async () => {
    const callId = callInputRef.current.value;
    const callDoc = firestore.collection("calls").doc(callId);
    const answerCandidates = callDoc.collection("answerCandidates");
    const offerCandidates = callDoc.collection("offerCandidates");

    pcRef.current.onicecandidate = (event) => {
      event.candidate && answerCandidates.add(event.candidate.toJSON());
      console.log("testloop");
    };

    const callData = (await callDoc.get()).data();

    const offerDescription = callData.offer;
    await pcRef.current.setRemoteDescription(new RTCSessionDescription(offerDescription));

    const answerDescription = await pcRef.current.createAnswer();
    await pcRef.current.setLocalDescription(answerDescription);

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };

    await callDoc.update({ answer });

    offerCandidates.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        console.log(change);
        if (change.type === "added") {
          let data = change.doc.data();
          pcRef.current.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });
  };

  return (
    <div id={styles.body}>
      {/* <h2>Welcome to the meeting bot</h2> */}
      <br />
      <div>
        <button  id={styles.startbtn}  onClick={webcamFunction} disabled={webcam}>
          Start webcam
        </button>
        <button id={styles.callbtn}   onClick={callFunction} disabled={call}>
        Create Call
      </button>
      <p>Enter caller ID : 
      <input id="callInput" ref={callInputRef} />
      <button id="answerButton" onClick={answerFunction} disabled={answer}>
        Answer
      </button></p>
      </div>
      
      <div id={styles.videos}>
        <span>
          <h3>Your video</h3>
          <video  id="webcamVideo" ref={webcamVideoRef} autoPlay playsInline></video>
        </span>
        <span>
          <h3>Caller</h3>
          <video id="remoteVideo" ref={remoteVideoRef} autoPlay playsInline></video>
        </span>
      </div>        
      
    </div>
  );
}
