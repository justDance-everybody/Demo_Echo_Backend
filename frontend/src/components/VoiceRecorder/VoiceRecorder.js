import React, { useState, useEffect, useCallback } from 'react';
import './VoiceRecorder.css'; 

const VoiceRecorder = ({ onResult, onError, setStatus, disabled }) => { // Added disabled prop
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState(null);

    useEffect(() => {
        // Feature detection for SpeechRecognition
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recog = new SpeechRecognition();
            
            // Configuration for the recognition instance
            recog.continuous = false; // Stop listening after the first pause in speech
            recog.lang = 'zh-CN'; // Set language to Chinese (Mandarin, Simplified)
            recog.interimResults = false; // We only want final results
            recog.maxAlternatives = 1; // Get only the most likely transcript

            // Event handler when recognition starts
            recog.onstart = () => {
                console.log('Voice recognition started (initial input).');
                setIsListening(true); // Update local listening state
                if (typeof setStatus === 'function') {
                    setStatus('listening'); // Update global status passed from parent
                }
            };

            // Event handler when a final result is received
            recog.onresult = (event) => {
                const transcript = event.results[0][0].transcript; // Extract the transcript
                console.log('Transcript received (initial input):', transcript);
                setIsListening(false); // Recognition automatically stops on result (continuous=false)
                onResult(transcript); // Pass the transcript back to the parent component (MainPage)
                // Note: Status (e.g., 'thinking') is set in MainPage after this callback completes
            };

            // Event handler for recognition errors
            recog.onerror = (event) => {
                console.error('Speech recognition error (initial input):', event.error);
                 setIsListening(false); // Ensure listening state is reset
                onError(event.error); // Pass the error to the parent component
                // Note: Status (e.g., 'error' or 'idle') is handled in MainPage's onError callback
            };

            // Event handler when recognition ends
            recog.onend = () => {
                console.log('Voice recognition ended (initial input).');
                // Ensure the button state is reset if recognition ends unexpectedly 
                // (e.g., timeout, network error) while still in listening state.
                 if (isListening) {
                     setIsListening(false);
                     // Optionally call onError or setStatus if needed, but MainPage usually handles this
                 }
            };

            // Store the configured recognition instance in state
            setRecognition(recog);
        } else {
            // Handle browsers that don't support SpeechRecognition
            console.error('Speech Recognition not supported in this browser.');
            onError('Speech Recognition not supported'); // Notify parent
        }

        // Cleanup function: Ensure recognition is stopped if the component unmounts
        return () => {
            if (recognition && recognition.stop) {
                try {
                    recognition.stop();
                } catch (e) {
                    console.warn("Error stopping recognition on unmount:", e);
                }
            }
        };
        // Run this effect only once on component mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); 

    // Handler for the button click event
    const handleButtonClick = useCallback(() => {
        // Do nothing if recognition isn't supported or the button is disabled
        if (!recognition || disabled) return; 

        if (isListening) {
            // If currently listening, stop it
            try {
                recognition.stop(); 
            } catch (e) {
                 console.warn("Error stopping recognition:", e);
            }
            // Let the 'onend' handler manage the isListening state
        } else {
            // If not listening, start it
            try {
                recognition.start();
            } catch (e) {
                 // Handle potential errors when starting (e.g., trying to start while already started)
                 console.error("Error explicitly starting initial recognition:", e);
                 if(e.name === 'InvalidStateError') {
                     // If it's already started, maybe do nothing or log it.
                     console.warn("Recognition was already started, likely due to a previous event.");
                 } else {
                     // For other errors, notify the parent and reset state
                     onError("Failed to start listening");
                     setIsListening(false); 
                     if (typeof setStatus === 'function') {
                         setStatus('idle'); 
                     }
                 }
            }
        }
    // Dependencies for the button click handler
    }, [recognition, isListening, disabled, onError, setStatus]); 


    return (
        <div className="voice-recorder-container">
            <button
                className={`recorder-button ${isListening ? 'listening' : ''}`}
                onClick={handleButtonClick}
                // Disable the button if recognition isn't ready OR if the disabled prop is true
                disabled={!recognition || disabled} 
            >
                {isListening ? '停止' : '按住说话'}
            </button>
            {/* Display a message if speech recognition is not supported */}
            {!recognition && <p>语音识别不可用</p>}
        </div>
    );
};

export default VoiceRecorder; 