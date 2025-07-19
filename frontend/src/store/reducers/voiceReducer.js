/**
 * 语音交互状态管理
 */

// 初始状态
export const initialVoiceState = {
  isRecording: false,
  isPlaying: false,
  isProcessing: false,
  audioLevel: 0,
  currentAudio: null,
  recordingDuration: 0,
  voiceSettings: {
    language: 'zh-CN',
    voice: 'default',
    speed: 1.0,
    volume: 1.0,
  },
  error: null,
  lastTranscript: '',
  isListening: false,
};

// Action Types
export const VOICE_ACTIONS = {
  START_RECORDING: 'VOICE/START_RECORDING',
  STOP_RECORDING: 'VOICE/STOP_RECORDING',
  START_PLAYING: 'VOICE/START_PLAYING',
  STOP_PLAYING: 'VOICE/STOP_PLAYING',
  START_PROCESSING: 'VOICE/START_PROCESSING',
  STOP_PROCESSING: 'VOICE/STOP_PROCESSING',
  UPDATE_AUDIO_LEVEL: 'VOICE/UPDATE_AUDIO_LEVEL',
  SET_CURRENT_AUDIO: 'VOICE/SET_CURRENT_AUDIO',
  UPDATE_RECORDING_DURATION: 'VOICE/UPDATE_RECORDING_DURATION',
  UPDATE_VOICE_SETTINGS: 'VOICE/UPDATE_VOICE_SETTINGS',
  SET_ERROR: 'VOICE/SET_ERROR',
  CLEAR_ERROR: 'VOICE/CLEAR_ERROR',
  SET_TRANSCRIPT: 'VOICE/SET_TRANSCRIPT',
  START_LISTENING: 'VOICE/START_LISTENING',
  STOP_LISTENING: 'VOICE/STOP_LISTENING',
  RESET_VOICE_STATE: 'VOICE/RESET_VOICE_STATE',
};

// Reducer
export const voiceReducer = (state = initialVoiceState, action) => {
  switch (action.type) {
    case VOICE_ACTIONS.START_RECORDING:
      return {
        ...state,
        isRecording: true,
        recordingDuration: 0,
        error: null,
      };

    case VOICE_ACTIONS.STOP_RECORDING:
      return {
        ...state,
        isRecording: false,
        audioLevel: 0,
      };

    case VOICE_ACTIONS.START_PLAYING:
      return {
        ...state,
        isPlaying: true,
        error: null,
      };

    case VOICE_ACTIONS.STOP_PLAYING:
      return {
        ...state,
        isPlaying: false,
      };

    case VOICE_ACTIONS.START_PROCESSING:
      return {
        ...state,
        isProcessing: true,
        error: null,
      };

    case VOICE_ACTIONS.STOP_PROCESSING:
      return {
        ...state,
        isProcessing: false,
      };

    case VOICE_ACTIONS.UPDATE_AUDIO_LEVEL:
      return {
        ...state,
        audioLevel: action.payload.level,
      };

    case VOICE_ACTIONS.SET_CURRENT_AUDIO:
      return {
        ...state,
        currentAudio: action.payload.audio,
      };

    case VOICE_ACTIONS.UPDATE_RECORDING_DURATION:
      return {
        ...state,
        recordingDuration: action.payload.duration,
      };

    case VOICE_ACTIONS.UPDATE_VOICE_SETTINGS:
      return {
        ...state,
        voiceSettings: {
          ...state.voiceSettings,
          ...action.payload.settings,
        },
      };

    case VOICE_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload.error,
        isRecording: false,
        isPlaying: false,
        isProcessing: false,
      };

    case VOICE_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case VOICE_ACTIONS.SET_TRANSCRIPT:
      return {
        ...state,
        lastTranscript: action.payload.transcript,
      };

    case VOICE_ACTIONS.START_LISTENING:
      return {
        ...state,
        isListening: true,
        error: null,
      };

    case VOICE_ACTIONS.STOP_LISTENING:
      return {
        ...state,
        isListening: false,
      };

    case VOICE_ACTIONS.RESET_VOICE_STATE:
      return {
        ...initialVoiceState,
        voiceSettings: state.voiceSettings, // 保留用户设置
      };

    default:
      return state;
  }
};