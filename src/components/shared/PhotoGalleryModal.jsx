import React from 'react';
import { Camera, XCircle, Download } from 'lucide-react';

const PhotoGalleryModal = ({ photos, onClose, title = "Attached Photos" }) => {
    if (!photos || photos.length === 0) return null;

    return (
        <div className="fixed inset-0 bg-black/90 z-[70] flex flex-col items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col relative" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Camera size={20} /> {title} ({photos.length})
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <XCircle size={24} className="text-slate-500" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto bg-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {photos.map((img, idx) => (
                        <div key={idx} className="relative group bg-white p-2 rounded-xl shadow-sm">
                            <img
                                src={img}
                                alt={`Evidence ${idx + 1}`}
                                className="w-full h-64 object-contain rounded-lg bg-black/5"
                            />
                            <div className="absolute top-4 left-4 bg-black/50 text-white px-2 py-1 rounded text-xs font-mono">
                                #{idx + 1}
                            </div>
                            <a
                                href={img}
                                download={`evidence-${idx + 1}.jpg`}
                                className="absolute bottom-4 right-4 p-2 bg-white text-brand-600 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                                title="Download"
                                onClick={e => e.stopPropagation()}
                            >
                                <Download size={16} />
                            </a>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PhotoGalleryModal;
