import React from 'react';
import NumberValidator from '../components/NumberValidator';

const ValidatorPage = () => {
    return (
        <div className="animate-in fade-in duration-500">
            <h1 className="text-3xl font-bold mb-8 text-primary">Number Filter & Validation</h1>
            <div className="max-w-4xl">
                <NumberValidator />
            </div>
            <div className="mt-8 bg-primary/5 p-6 rounded-2xl border border-primary/10">
                <h3 className="text-xl font-bold mb-2">Why validate numbers?</h3>
                <p className="text-dark-muted leading-relaxed">
                    Sending messages to numbers that aren't on WhatsApp can flag your account for spam. 
                    Using this filter helps maintain your account health and ensures your campaigns 
                    reach 100% real users.
                </p>
            </div>
        </div>
    );
};

export default ValidatorPage;
