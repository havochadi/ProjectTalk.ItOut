import { api } from '../api/client';

// Voice configuration
let voiceConfig = {
  enabled: false,
  defaultVoiceId: 'Rachel',
  maxRecordingSeconds: 60,
};

// Active audio elements
let currentAudio: HTMLAudioElement | null = null;
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];

// Web Speech API recognition
let recognition: any = null;
let isRecognitionActive = false;

/**
 * Check if browser supports Web Speech API
 */
export function isBrowserSpeechSupported(): boolean {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

/**
 * Initialize voice client and fetch configuration
 */
export async function initializeVoiceClient(): Promise<void> {
  try {
    const response = await api.get('/voice/config');
    voiceConfig = response.data;
  } catch (error) {
    console.warn('Voice features not available:', error);
    voiceConfig.enabled = false;
  }
}

/**
 * Check if voice features are enabled
 */
export function isVoiceEnabled(): boolean {
  return voiceConfig.enabled;
}

/**
 * Get voice configuration
 */
export function getVoiceConfig() {
  return voiceConfig;
}

/**
 * Text-to-Speech: Converts text to audio and plays it
 * @param text - The text to speak
 * @param voiceId - Optional voice ID (defaults to config default)
 * @returns Promise that resolves when audio finishes playing
 */
export async function speak(text: string, voiceId?: string): Promise<void> {
  if (!voiceConfig.enabled) {
    throw new Error('Voice features are not available');
  }

  if (!text || text.trim().length === 0) {
    throw new Error('Text is required for speech');
  }

  try {
    // Stop any currently playing audio
    stopSpeaking();

    // Request TTS from API
    const response = await api.post(
      '/voice/tts',
      { text: text.trim(), voiceId: voiceId || voiceConfig.defaultVoiceId },
      {
        responseType: 'blob',
      }
    );

    // Create audio blob and play
    const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(audioBlob);

    currentAudio = new Audio(audioUrl);

    // Clean up URL after audio loads
    currentAudio.addEventListener('loadeddata', () => {
      URL.revokeObjectURL(audioUrl);
    });

    // Return promise that resolves when audio finishes
    return new Promise((resolve, reject) => {
      if (!currentAudio) {
        reject(new Error('Audio element not created'));
        return;
      }

      currentAudio.addEventListener('ended', () => {
        currentAudio = null;
        resolve();
      });

      currentAudio.addEventListener('error', (error) => {
        currentAudio = null;
        reject(error);
      });

      currentAudio.play().catch(reject);
    });
  } catch (error) {
    console.error('TTS error:', error);
    throw error;
  }
}

/**
 * Stop currently playing audio
 */
export function stopSpeaking(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

/**
 * Stop any kind of speech output (API audio or browser TTS).
 */
export function stopAllSpeech(): void {
  stopSpeaking();

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Check if audio is currently playing
 */
export function isSpeaking(): boolean {
  return currentAudio !== null && !currentAudio.paused;
}

/**
 * Record audio from microphone and transcribe it
 * @returns Promise that resolves with the transcribed text
 */
export async function recordAndTranscribe(): Promise<string> {
  if (!voiceConfig.enabled) {
    throw new Error('Voice features are not available');
  }

  // Check if microphone is available
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Microphone not available in this browser');
  }

  try {
    // Request microphone access
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    return new Promise<string>((resolve, reject) => {
      audioChunks = [];

      // Create MediaRecorder with opus codec for best quality/size ratio
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      mediaRecorder = new MediaRecorder(stream, {
        mimeType,
      });

      mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      });

      mediaRecorder.addEventListener('stop', async () => {
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());

        // Create audio blob
        const audioBlob = new Blob(audioChunks, { type: mimeType });

        try {
          // Send to API for transcription
          const formData = new FormData();
          formData.append('file', audioBlob, 'recording.webm');

          const response = await api.post('/voice/stt', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });

          resolve(response.data.text);
        } catch (error) {
          console.error('STT error:', error);
          reject(error);
        } finally {
          mediaRecorder = null;
          audioChunks = [];
        }
      });

      mediaRecorder.addEventListener('error', (error) => {
        stream.getTracks().forEach((track) => track.stop());
        mediaRecorder = null;
        audioChunks = [];
        reject(error);
      });

      // Start recording
      mediaRecorder.start();

      // Auto-stop after max duration
      setTimeout(() => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, voiceConfig.maxRecordingSeconds * 1000);
    });
  } catch (error) {
    console.error('Recording error:', error);

    if (error instanceof Error && error.name === 'NotAllowedError') {
      throw new Error('Microphone access denied. Please allow microphone access to use voice features.');
    }

    throw error;
  }
}

/**
 * Start recording (returns a stop function)
 * Use this for manual recording control
 */
export async function startRecording(): Promise<() => Promise<string>> {
  if (!voiceConfig.enabled) {
    throw new Error('Voice features are not available');
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Microphone not available in this browser');
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  audioChunks = [];

  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : 'audio/webm';

  mediaRecorder = new MediaRecorder(stream, { mimeType });

  mediaRecorder.addEventListener('dataavailable', (event) => {
    if (event.data.size > 0) {
      audioChunks.push(event.data);
    }
  });

  mediaRecorder.start();

  // Return stop function
  return async (): Promise<string> => {
    if (!mediaRecorder || mediaRecorder.state !== 'recording') {
      throw new Error('No active recording');
    }

    return new Promise<string>((resolve, reject) => {
      if (!mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      const handleStop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunks, { type: mimeType });

        try {
          const formData = new FormData();
          formData.append('file', audioBlob, 'recording.webm');

          const response = await api.post('/voice/stt', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });

          resolve(response.data.text);
        } catch (error) {
          reject(error);
        } finally {
          mediaRecorder = null;
          audioChunks = [];
        }
      };

      mediaRecorder!.addEventListener('stop', handleStop, { once: true });
      mediaRecorder!.stop();
    });
  };
}

/**
 * Check if currently recording
 */
export function isRecording(): boolean {
  return mediaRecorder !== null && mediaRecorder.state === 'recording';
}

/**
 * Stop current recording without transcribing
 */
export function stopRecording(): void {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    mediaRecorder = null;
    audioChunks = [];
  }
}

/**
 * Start browser-based speech recognition (Web Speech API)
 * This works without any API keys and is completely free
 * @param onTranscriptUpdate - Callback function to update transcript in real-time
 * @returns Promise that resolves with stop function
 */
export async function startBrowserRecognition(
  onTranscriptUpdate?: (transcript: string) => void
): Promise<() => Promise<string>> {
  if (!isBrowserSpeechSupported()) {
    throw new Error('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
  }

  return new Promise((resolve, reject) => {
    try {
      // @ts-expect-error Browser speech-recognition types are not part of the standard DOM library.
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let finalTranscript = '';
      let isStarted = false;

      recognition.onstart = () => {
        isRecognitionActive = true;
        isStarted = true;
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        // Call the callback with the full transcript (final + interim)
        if (onTranscriptUpdate) {
          const fullTranscript = (finalTranscript + interimTranscript).trim();
          onTranscriptUpdate(fullTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        isRecognitionActive = false;
        if (!isStarted) {
          reject(new Error(`Speech recognition error: ${event.error}`));
        }
      };

      recognition.onend = () => {
        isRecognitionActive = false;
      };

      // Start recognition
      recognition.start();

      // Return stop function
      const stopFn = (): Promise<string> => {
        return new Promise((resolveStop) => {
          if (recognition && isRecognitionActive) {
            recognition.stop();
            setTimeout(() => {
              resolveStop(finalTranscript.trim());
              recognition = null;
            }, 100);
          } else {
            resolveStop(finalTranscript.trim());
          }
        });
      };

      // Wait a bit to ensure recognition started
      setTimeout(() => {
        if (isStarted) {
          resolve(stopFn);
        } else {
          reject(new Error('Failed to start speech recognition'));
        }
      }, 500);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Stop browser-based speech recognition
 */
export function stopBrowserRecognition(): void {
  if (recognition && isRecognitionActive) {
    recognition.stop();
    recognition = null;
    isRecognitionActive = false;
  }
}

// Track current speech promise to prevent interruptions
let currentSpeechPromise: Promise<void> | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;

/**
 * Browser-based Text-to-Speech (Web Speech API)
 * Works without any API keys - completely free!
 */
export async function speakWithBrowser(text: string): Promise<void> {
  // If there's already speech in progress, cancel it first
  if (currentSpeechPromise) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
    currentSpeechPromise = null;
  }

  currentSpeechPromise = new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Text-to-speech is not supported in this browser'));
      return;
    }

    // Stop any current speech and wait for it to fully stop
    window.speechSynthesis.cancel();

    // Small delay to ensure cancellation completes
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      currentUtterance = utterance;

      // Configure voice settings
      utterance.rate = 1.0; // Speed (0.1 to 10)
      utterance.pitch = 1.0; // Pitch (0 to 2)
      utterance.volume = 1.0; // Volume (0 to 1)

      // Function to set voice once voices are loaded
      const setVoice = () => {
        const voices = window.speechSynthesis.getVoices();

        if (voices.length === 0) {
          console.warn('No voices available yet');
          return;
        }

        // Try to use a female English voice if available
        const femaleVoice = voices.find(voice =>
          voice.lang.startsWith('en') && voice.name.toLowerCase().includes('female')
        );
        const englishVoice = voices.find(voice => voice.lang.startsWith('en'));

        if (femaleVoice) {
          utterance.voice = femaleVoice;
        } else if (englishVoice) {
          utterance.voice = englishVoice;
        }
      };

      // Set voice immediately
      setVoice();

      // Also try to set voice when voices change (some browsers load voices asynchronously)
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.addEventListener('voiceschanged', setVoice, { once: true });
      }

      let hasEnded = false;

      utterance.onend = () => {
        if (!hasEnded) {
          hasEnded = true;
          currentUtterance = null;
          currentSpeechPromise = null;
          resolve();
        }
      };

      utterance.onerror = (error) => {
        console.error('Speech synthesis error:', error);

        // Don't treat 'interrupted' as an error if we intentionally cancelled
        if (error.error === 'interrupted') {
          console.log('Speech was interrupted (expected behavior)');
          currentUtterance = null;
          currentSpeechPromise = null;
          resolve(); // Resolve instead of reject for interruptions
          return;
        }

        // Provide more specific error messages for real errors
        if (error.error === 'not-allowed') {
          reject(new Error('Speech synthesis not allowed. Please check browser permissions.'));
        } else if (error.error === 'network') {
          reject(new Error('Network error during speech synthesis. Some browsers require internet for TTS.'));
        } else {
          reject(new Error(`Speech synthesis failed: ${error.error || 'unknown error'}`));
        }

        currentUtterance = null;
        currentSpeechPromise = null;
      };

      // Workaround for Chrome bug where speech doesn't start
      utterance.onstart = () => {
        console.log('Speech started');
      };

      try {
        window.speechSynthesis.speak(utterance);

        // Workaround for some browsers where speech doesn't start
        // Resume speech synthesis to ensure it plays
        setTimeout(() => {
          if (window.speechSynthesis.paused && currentUtterance === utterance) {
            window.speechSynthesis.resume();
          }
        }, 50);
      } catch (error) {
        currentUtterance = null;
        currentSpeechPromise = null;
        reject(error);
      }
    }, 150); // 150ms delay after cancel to ensure cleanup
  });

  return currentSpeechPromise;
}
