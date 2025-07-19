import React from 'react';
import { Server, TrendingUp } from 'lucide-react';

const SpotAdoptionCards = ({ spotAdoptionRates }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Pre-Automation Spot Adoption</h3>
                    <Server className="w-5 h-5 text-blue-500" />
                </div>
                <div className="text-3xl font-bold text-gray-900">
                    {spotAdoptionRates ? `${spotAdoptionRates.preAutomation.toFixed(1)}%` : 'N/A'}
                </div>
                <div className="text-sm text-gray-500 mt-2">
                    Average spot instance CPU adoption before automation
                </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Post-Automation Spot Adoption</h3>
                    <Server className="w-5 h-5 text-green-500" />
                </div>
                <div className="text-3xl font-bold text-gray-900">
                    {spotAdoptionRates ? `${spotAdoptionRates.postAutomation.toFixed(1)}%` : 'N/A'}
                </div>
                <div className="text-sm text-gray-500 mt-2">
                    Average spot instance CPU adoption after automation
                </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Spot Adoption Change</h3>
                    <TrendingUp className={`w-5 h-5 ${spotAdoptionRates?.change >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                </div>
                <div className="text-3xl font-bold text-gray-900">
                    {spotAdoptionRates ? `${spotAdoptionRates.change.toFixed(1)}%` : 'N/A'}
                </div>
                <div className="text-sm text-gray-500 mt-2">
                    Change in spot instance CPU adoption
                </div>
            </div>
        </div>
    );
};

export default SpotAdoptionCards; 