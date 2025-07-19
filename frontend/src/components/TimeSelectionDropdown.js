import React, { useRef, useEffect } from 'react';

const TimeSelectionDropdown = ({
                              isOpen,
                              useLatestSnapshot,
                              onToggleUseLatest,
                              selectedDateTime,
                              onDateTimeChange,
                              onClose,
                          }) => {
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            ref={dropdownRef}
            className="absolute w-64 right-0 top-full mt-2 p-4 bg-white border rounded shadow-lg z-10"
        >
            <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700">Use latest</span>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={useLatestSnapshot}
                        onChange={onToggleUseLatest}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-300 peer-checked:bg-blue-600"></div>
                </label>
            </div>
            {!useLatestSnapshot && (
                <div>
                    <input
                        type="datetime-local"
                        value={selectedDateTime}
                        onChange={onDateTimeChange}
                        step="1"
                        className="border p-1 rounded"
                    />
                </div>
            )}
        </div>
    );
};

export default TimeSelectionDropdown;