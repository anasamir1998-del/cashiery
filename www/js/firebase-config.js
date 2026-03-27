// firebase-config.js
const firebaseConfig = {
    apiKey: "AIzaSyB3VaB96yma5xVP2Ve-0zhgraqb3FS4mQ8",
    authDomain: "qisa-caffee.firebaseapp.com",
    projectId: "qisa-caffee",
    storageBucket: "qisa-caffee.firebasestorage.app",
    messagingSenderId: "3884330975422",
    appId: "1:884330975422:web:2f982a150725b7f3664eef",
    measurementId: "G-LZ6V22BCB2"
};

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    // Enable offline persistence
    firebase.firestore().enablePersistence()
        .catch(function (err) {
            console.error("Firebase persistence error:", err.code);
        });

    window.dbFirestore = firebase.firestore();
    window.authFirebase = firebase.auth();
    console.log("Firebase Initialized Successfully");
} catch (e) {
    console.error("Firebase Initialization Error:", e);
}
