import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, Check, X, SwitchCamera } from 'lucide-react';

const CameraCapture = ({ onCapture, onClose }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [error, setError] = useState(null);
    const [facingMode, setFacingMode] = useState('environment'); // 'user' or 'environment'

    const streamRef = useRef(null);

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                track.stop();
                track.enabled = false;
            });
            streamRef.current = null;
            setStream(null);
        }
    };

    useEffect(() => {
        let isMounted = true;

        const initCamera = async () => {
            try {
                // Stop any existing stream first
                stopCamera();

                const constraints = {
                    video: {
                        facingMode: facingMode,
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    }
                };

                const newStream = await navigator.mediaDevices.getUserMedia(constraints);

                // If unmounted during await, stop immediately
                if (!isMounted) {
                    newStream.getTracks().forEach(track => {
                        track.stop();
                        track.enabled = false;
                    });
                    return;
                }

                streamRef.current = newStream;
                setStream(newStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = newStream;
                }
                setError(null);
            } catch (err) {
                if (isMounted) {
                    console.error("Error accessing camera:", err);
                    setError("Could not access camera. Please ensure permissions are granted.");
                }
            }
        };

        initCamera();

        return () => {
            isMounted = false;
            stopCamera();
        };
    }, [facingMode]);

    // Removed standalone startCamera to avoid dependency complexity
    const handleSwitchCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            // Set canvas dimensions to match video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const context = canvas.getContext('2d');
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            const imageData = canvas.toDataURL('image/jpeg', 0.8);
            setCapturedImage(imageData);
        }
    };

    const handleRetake = () => {
        setCapturedImage(null);
    };

    const handleConfirm = () => {
        onCapture(capturedImage);
        onClose();
    };



    return (
        <div className="fixed inset-0 bg-black/90 z-[60] flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-black rounded-2xl overflow-hidden relative border border-slate-700">
                {/* Header */}
                <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent z-10">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <Camera size={20} /> Camera
                    </h3>
                    <button onClick={onClose} className="bg-black/40 text-white p-2 rounded-full hover:bg-black/60 transition-all">
                        <X size={24} />
                    </button>
                </div>

                {/* Main View */}
                <div className="relative aspect-[4/3] bg-slate-900 flex items-center justify-center">
                    {error ? (
                        <div className="text-red-400 text-center p-6">
                            <p className="mb-2 font-bold">Camera Error</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    ) : capturedImage ? (
                        <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
                    ) : (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                        />
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                </div>

                {/* Controls */}
                <div className="p-6 bg-slate-900 flex items-center justify-between">
                    {capturedImage ? (
                        <>
                            <button
                                onClick={handleRetake}
                                className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition-colors"
                            >
                                <div className="p-3 rounded-full bg-slate-800">
                                    <RefreshCw size={24} />
                                </div>
                                <span className="text-xs font-medium">Retake</span>
                            </button>

                            <button
                                onClick={handleConfirm}
                                className="p-4 rounded-full bg-brand-600 text-white shadow-lg shadow-brand-500/20 hover:scale-105 transition-all"
                            >
                                <Check size={32} />
                            </button>

                            <div className="w-12"></div> {/* Spacer for balance */}
                        </>
                    ) : (
                        <>
                            <button
                                onClick={handleSwitchCamera}
                                className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition-colors"
                            >
                                <div className="p-3 rounded-full bg-slate-800">
                                    <SwitchCamera size={24} />
                                </div>
                                <span className="text-xs font-medium">Flip</span>
                            </button>

                            <button
                                onClick={handleCapture}
                                className="p-1 rounded-full border-4 border-white/30 hover:border-white/50 transition-all"
                            >
                                <div className="p-4 rounded-full bg-white text-black hover:scale-95 transition-all">
                                    <div className="w-8 h-8 rounded-full bg-transparent"></div> {/* Visual spacer */}
                                </div>
                            </button>

                            <div className="w-12"></div> {/* Spacer for balance */}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CameraCapture;
