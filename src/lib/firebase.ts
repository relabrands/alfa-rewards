import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBW7NfByMVcyrUhVL_PhazalALcXM3Wgl4",
  authDomain: "lab-alfa-rewards.firebaseapp.com",
  projectId: "lab-alfa-rewards",
  storageBucket: "lab-alfa-rewards.firebasestorage.app",
  messagingSenderId: "447704363609",
  appId: "1:447704363609:web:d661990592c6ca8d397748",
  measurementId: "G-150C3R0PX3"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };
