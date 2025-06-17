import React, { useState } from "react";
import { ImageUpload } from "./ocaptain/components/ImageUpload";
import { ChatInterface } from "./ocaptain/components/ChatInterface";
import { processImage } from "./ocaptain/utils/imageProcessing";

const OCaptain = () => {
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [userPrompt, setUserPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);

  const handleStartOver = () => {
    setSelectedImage(null);
    setResponse('');
    setUserPrompt('');
    setChatHistory([]);
    setLoading(false);
  };

  const handleImageUpload = async (base64Image: string) => {
    setSelectedImage(base64Image);
    await handleImageProcessing(base64Image);
  };

  const handleImageProcessing = async (base64Image: string, customPrompt?: string) => {
    setLoading(true);
    try {
      const result = await processImage(base64Image, customPrompt);
      setResponse(result);
      setChatHistory(prev => [...prev, { role: 'assistant', content: result }]);
    } catch (error) {
      console.error("Error:", error);
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Sorry, there was an error processing your request.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userPrompt.trim() || !selectedImage) return;

    setChatHistory(prev => [...prev, { role: 'user', content: userPrompt }]);
    await handleImageProcessing(selectedImage, userPrompt);
    setUserPrompt('');
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl text-notWhite font-bold">O Captain! My Captain!</h3>
        {selectedImage && (
          <button
            onClick={handleStartOver}
            className="px-3 py-1.5 bg-deepPink text-white rounded-lg hover:bg-fontRed transition-colors text-sm font-medium"
          >
            Start Over
          </button>
        )}
      </div>
      
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 shadow-xl">
        {!selectedImage ? (
          <ImageUpload onImageUpload={handleImageUpload} />
        ) : (
          <>
            <div className="mb-4">
              <img
                src={selectedImage}
                alt="Your FPL Team"
                className="max-w-full h-auto rounded-lg shadow-lg mx-auto"
              />
            </div>

            <ChatInterface
              chatHistory={chatHistory}
              loading={loading}
              userPrompt={userPrompt}
              onPromptSubmit={handlePromptSubmit}
              onPromptChange={setUserPrompt}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default OCaptain; 