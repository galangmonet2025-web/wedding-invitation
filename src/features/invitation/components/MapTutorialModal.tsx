import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { HiOutlineX, HiOutlineDeviceMobile, HiOutlineDesktopComputer, HiOutlineChatAlt } from 'react-icons/hi';

interface MapTutorialModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const tutorials = [
    {
        id: 'hp',
        label: 'Google Map HP',
        icon: <HiOutlineDeviceMobile className="w-4 h-4" />,
        embedUrl: 'https://www.youtube.com/embed/PbYCRn-HPgw?enablejsapi=1'
    },
    {
        id: 'wa',
        label: 'WhatsApp',
        icon: <HiOutlineChatAlt className="w-4 h-4" />,
        embedUrl: 'https://www.youtube.com/embed/OvINirDB-oU?enablejsapi=1'
    },
    {
        id: 'pc',
        label: 'Google Map PC',
        icon: <HiOutlineDesktopComputer className="w-4 h-4" />,
        embedUrl: 'https://www.youtube.com/embed/r5rCUKOySyY?enablejsapi=1'
    }
];

export function MapTutorialModal({ isOpen, onClose }: MapTutorialModalProps) {
    const [activeTab, setActiveTab] = useState('hp');
    const iframeRefs = useRef<{ [key: string]: HTMLIFrameElement | null }>({});

    useEffect(() => {
        if (isOpen) {
            setActiveTab('hp');
        }
    }, [isOpen]);

    // Handle auto-pause when switching tabs
    useEffect(() => {
        Object.keys(iframeRefs.current).forEach(id => {
            if (id !== activeTab) {
                const iframe = iframeRefs.current[id];
                if (iframe && iframe.contentWindow) {
                    try {
                        iframe.contentWindow.postMessage(JSON.stringify({
                            event: 'command',
                            func: 'pauseVideo',
                            args: ''
                        }), '*');
                    } catch (e) {
                        console.error('Failed to pause video:', e);
                    }
                }
            }
        });
    }, [activeTab]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800 transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Cara Ambil Titik Google Maps</h2>
                        <p className="text-sm text-gray-500 mt-0.5">Ikuti panduan video di bawah ini</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
                    >
                        <HiOutlineX className="w-6 h-6" />
                    </button>
                </div>

                {/* Tab Selection */}
                <div className="p-4 bg-gray-50/50 dark:bg-gray-800/20 flex gap-2 overflow-x-auto no-scrollbar">
                    {tutorials.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap
                                ${activeTab === tab.id
                                    ? 'bg-gold-500 text-white shadow-lg shadow-gold-500/20 scale-[1.02]'
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700'}`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Video Content */}
                <div className="flex-1 h-[600px] max-h-[75vh] p-4 bg-black flex items-center justify-center overflow-hidden">
                    {tutorials.map((tab) => (
                        <div
                            key={tab.id}
                            className={`h-full w-full items-center justify-center ${activeTab === tab.id ? 'flex' : 'hidden'}`}
                        >
                            <div className={`h-full ${tab.id === 'pc' ? 'w-full aspect-video' : 'aspect-[9/16]'}`}>
                                <iframe
                                    ref={el => iframeRefs.current[tab.id] = el}
                                    width="100%"
                                    height="100%"
                                    src={tab.embedUrl}
                                    title={tab.label}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    allowFullScreen
                                    className="rounded-lg shadow-inner"
                                ></iframe>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800/40 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-xs text-center text-gray-400 font-medium">
                        Tips: Pastikan titik koordinat sudah tepat sebelum menyalin link.
                    </p>
                </div>
            </div>
        </div>,
        document.body
    );
}
