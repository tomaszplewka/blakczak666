import firebase from "firebase/app";
import "firebase/auth";
import "firebase/firestore";
import FirebaseConfig from './FirebaseConfig';
import regeneratorRuntime from "regenerator-runtime";

const FirebaseCtrl = (function(FirebaseConfig) {
    // Initialize firebase
    firebase.initializeApp(FirebaseConfig.config);
    const auth = firebase.auth();
    const db = firebase.firestore();
    // Google sign-in
    const googleProvider = new firebase.auth.GoogleAuthProvider();
    googleProvider.setCustomParameters({ 'propmt': 'select_account' });
    const signInGoogle = () => auth.signInWithPopup(googleProvider);
    // Github sign-in
    const githubProvider = new firebase.auth.GithubAuthProvider();
    githubProvider.setCustomParameters({ 'propmt': 'select_account' });
    const signInGithub = () => auth.signInWithPopup(githubProvider);
    // Store user in db
    const storeUser = async (userAuth, data) => {
        if (userAuth) {
            const userDocRef = db.collection('users').doc(userAuth.uid);
            const userDocSnapshot = await userDocRef.get();
            if (!userDocSnapshot.exists) {
                const { displayName, email } = userAuth;
                const createdAt = new Date();
                const savedGames = {};
                await userDocRef.set({
                    displayName,
                    email,
                    createdAt,
                    savedGames,
                    ...data
                });
            }
            return userDocRef;
        } else { return; }
    };
    const signOut = () => auth.signOut();
    const loadGame = async userDocRef => await userDocRef.get();
    const saveGame = async (userDocRef, data) => {
        // Load games and check if its 5 or less
        const docs = await loadGame(userDocRef);
        let savedGames = docs.data().savedGames;
        if (Object.keys(savedGames).length == 5) {
            // Sort in increasing order
            const savedGamesKeys = Object.keys(savedGames).slice();
            savedGamesKeys.sort((a, b) => b - a);
            const keyToDelete = savedGamesKeys[savedGamesKeys.length - 1];
            const { [keyToDelete]: remove, ...stuffToKeep } = savedGames;
            savedGames = stuffToKeep;
            await userDocRef.update({ savedGames });
        }
        const timestamp = Date.now();
        await userDocRef.update({ [`savedGames.${timestamp}`]: data });
    };
    return {
        signInGoogle,
        signInGithub,
        storeUser,
        auth,
        saveGame,
        signOut,
        loadGame
    };
})(FirebaseConfig);
export default FirebaseCtrl;