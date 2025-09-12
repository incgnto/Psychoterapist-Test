// ElevenLabs Voice Configuration
// You can find more voices at: https://elevenlabs.io/voice-library

export const VOICE_OPTIONS = {
  // Natural Female Voices
  rachel: {
    id: '21m00Tcm4TlvDq8ikWAM',
    name: 'Rachel',
    description: 'Warm, conversational American female voice'
  },
  domi: {
    id: 'AZnzlk1XvdvUeBnXmlld',
    name: 'Domi',
    description: 'Young, energetic female voice'
  },
  bella: {
    id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Bella',
    description: 'Soft, friendly female voice'
  },
  elli: {
    id: 'MF3mGyEYCl7XYWbV9V6O',
    name: 'Elli',
    description: 'Clear, professional female voice'
  },
  
  // Natural Male Voices
  adam: {
    id: 'pNInz6obpgDQGcFmaJgB',
    name: 'Adam',
    description: 'Deep, professional American male voice'
  },
  antoni: {
    id: 'ErXwobaYiN019PkySvjV',
    name: 'Antoni',
    description: 'Friendly, conversational male voice'
  },
  josh: {
    id: 'TxGEqnHWrfWFTfGW9XjX',
    name: 'Josh',
    description: 'Young, casual male voice'
  },
  arnold: {
    id: 'VR6AewLTigWG4xSOukaG',
    name: 'Arnold',
    description: 'Mature, authoritative male voice'
  }
}

// Voice settings for different conversation styles
export const VOICE_SETTINGS = {
  // Professional medical consultation
  professional: {
    stability: 0.75,
    similarity_boost: 0.75,
    style: 0.15,
    use_speaker_boost: true
  },
  
  // Friendly, conversational
  conversational: {
    stability: 0.65,
    similarity_boost: 0.75,
    style: 0.25,
    use_speaker_boost: true
  },
  
  // Energetic and engaging
  energetic: {
    stability: 0.55,
    similarity_boost: 0.80,
    style: 0.35,
    use_speaker_boost: true
  },
  
  // Calm and soothing
  calm: {
    stability: 0.85,
    similarity_boost: 0.70,
    style: 0.10,
    use_speaker_boost: true
  }
}

// Default voice configuration
export const DEFAULT_VOICE = VOICE_OPTIONS.rachel
export const DEFAULT_SETTINGS = VOICE_SETTINGS.conversational
