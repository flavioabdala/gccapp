// firebase-config.js

// Importe as versões "compat" dos SDKs do Firebase
// Certifique-se de que os scripts no HTML (index.html e dashboard.html)
// também estejam apontando para as versões "compat" (ex: firebase-app-compat.js)

const firebaseConfig = {
    apiKey: "AIzaSyDTxRQdMy4QugmySVeSErf5Kqihn_4OhWw",
    authDomain: "gcc-contratos.firebaseapp.com",
    projectId: "gcc-contratos",
    storageBucket: "gcc-contratos.firebasestorage.app",
    messagingSenderId: "405415511927",
    appId: "1:405415511927:web:4612190119302726820372",
    measurementId: "G-T1T4N9WD5T"
};

// Inicialize o Firebase usando a sintaxe compatível
firebase.initializeApp(firebaseConfig);

// Obtenha instâncias dos serviços que você vai usar (Auth e Firestore)
// Elas estarão disponíveis globalmente para auth.js e main.js
const auth = firebase.auth();
const db = firebase.firestore();

// UIDs de administradores (COM SEUS UIDs FORNECIDOS)
// Estes IDs definem quem terá acesso às funcionalidades de administrador
const ADMIN_UIDS = ['txHwdn3rwubSff4PvekjO4PM7wb2', 'xo7oBxVSn8QeUx3HvAl8gO3Mq2w1'];