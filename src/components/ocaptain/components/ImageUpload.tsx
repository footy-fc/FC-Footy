import React, { useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';

interface ImageUploadProps {
  onImageUpload: (base64Image: string) => void;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ onImageUpload }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        onImageUpload(base64);
      };
      reader.readAsDataURL(file);
    }
  }, [onImageUpload]);

  const handlePaste = useCallback(async (event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64 = e.target?.result as string;
            onImageUpload(base64);
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    }
  }, [onImageUpload]);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif']
    },
    maxFiles: 1
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className="border-2 border-dashed border-limeGreenOpacity rounded-lg p-6 text-center transition-colors hover:border-limeGreen"
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-lightPurple">Drop your screenshot here...</p>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              className="px-5 py-2 bg-deepPink text-white rounded-lg hover:bg-fontRed transition-colors text-base font-medium shadow-lg hover:shadow-xl"
            >
              Choose File
            </button>
            <p className="text-lightPurple">or</p>
            <p className="text-lightPurple">
              Drop your screenshot here
            </p>
          </div>
        )}
      </div>

      <div className="text-center">
        <p className="text-lightPurple mb-2">or</p>
        <button
          type="button"
          onClick={() => document.execCommand('paste')}
          className="px-5 py-2 bg-deepPink text-white rounded-lg hover:bg-fontRed transition-colors text-base font-medium shadow-lg hover:shadow-xl"
        >
          Paste Screenshot
        </button>
      </div>
    </div>
  );
}; 