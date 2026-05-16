import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyBclcyuYaMqFInY_cJriufm4EVdKhge79M',
  authDomain: 'macmac-f8946.firebaseapp.com',
  projectId: 'macmac-f8946',
  storageBucket: 'macmac-f8946.firebasestorage.app',
  messagingSenderId: '874617730199',
  appId: '1:874617730199:web:25c0b7997ef9b17d7f25d2',
  measurementId: 'G-6N27E3MJQB',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)

export const googleProvider = new GoogleAuthProvider()
