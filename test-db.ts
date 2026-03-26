import { db } from './lib/firebase'
import { collection, getDocs } from 'firebase/firestore'

async function check() {
  console.log("Checking collections...")
  const collections = ['miqaat', 'miqaats', 'sessions', 'live']
  for (const name of collections) {
    try {
      const snap = await getDocs(collection(db, name))
      console.log(`Collection '${name}': ${snap.size} docs`)
    } catch(e) {
      console.log(`Error reading ${name}`)
    }
  }
}

check()
