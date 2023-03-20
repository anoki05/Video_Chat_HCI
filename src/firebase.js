import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

const app = firebase.initializeApp({
    apiKey: "AIzaSyDaT3Wuyla5Ek-Ro75aIF6LYfkB1JC-qWc",
    authDomain: "video-web-app-be277.firebaseapp.com",
    projectId: "video-web-app-be277",
    storageBucket: "video-web-app-be277.appspot.com",
    messagingSenderId: "440655337824",
    appId: "1:440655337824:web:722c5b5f4dabbbcec5e605",
    measurementId: "G-Z66VE6ZBF4"
})

export const auth = app.auth()
export const firestore = firebase.firestore();
export default app