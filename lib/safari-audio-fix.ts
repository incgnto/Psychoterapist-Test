// Safari Audio Context Fix
// Safari requires user interaction to play audio, so we need to unlock the audio context

let audioContext: AudioContext | null = null
let isUnlocked = false

export function initializeSafariAudioContext() {
  if (typeof window === 'undefined') return
  
  const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
  
  if (!isSafari && !isIOS) return
  
  console.log('Initializing Safari audio context fix...')
  
  try {
    // Create audio context
    const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext
    if (AudioContext) {
      audioContext = new AudioContext()
      
      // Try to resume immediately
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume()
      }
    }
  } catch (e) {
    console.error('Failed to create audio context:', e)
  }
}

export async function unlockSafariAudio() {
  if (!audioContext || isUnlocked) return
  
  const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
  
  if (!isSafari && !isIOS) return
  
  console.log('Attempting to unlock Safari audio context...')
  
  try {
    // Create a silent buffer
    const buffer = audioContext.createBuffer(1, 1, 22050)
    const source = audioContext.createBufferSource()
    source.buffer = buffer
    source.connect(audioContext.destination)
    
    // Play the silent sound
    source.start(0)
    
    // Resume the audio context
    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }
    
    isUnlocked = true
    console.log('Safari audio context unlocked successfully')
  } catch (e) {
    console.error('Failed to unlock Safari audio:', e)
  }
}

export function isSafariAudioUnlocked() {
  return isUnlocked
}
