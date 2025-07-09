import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, Image, Video, Check } from 'lucide-react';

interface FileUploadProps {
  type: 'image' | 'video';
  onFileSelect: (file: File | null) => void;
  currentFile?: File | null;
  placeholder?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  type, 
  onFileSelect, 
  currentFile, 
  placeholder 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedTypes = type === 'image' 
    ? 'image/jpeg,image/png,image/webp,image/jpg'
    : 'video/mp4,video/webm,video/mov';

  const maxSize = type === 'image' ? 5 * 1024 * 1024 : 50 * 1024 * 1024; // 5MB for images, 50MB for videos

  const handleFileSelect = (file: File) => {
    if (file.size > maxSize) {
      alert(`File size must be less than ${type === 'image' ? '5MB' : '50MB'}`);
      return;
    }

    const validTypes = acceptedTypes.split(',');
    if (!validTypes.includes(file.type)) {
      alert(`Please select a valid ${type} file`);
      return;
    }

    onFileSelect(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const removeFile = () => {
    onFileSelect(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const Icon = type === 'image' ? Image : Video;

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        {type === 'image' ? 'Product Image' : 'Product Video'} 
        {type === 'image' && <span className="text-red-500">*</span>}
      </label>
      
      {currentFile || preview ? (
        <div className="relative">
          {type === 'image' ? (
            <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={preview || ''}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={removeFile}
                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="relative w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Video className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">{currentFile?.name}</p>
                <div className="flex items-center justify-center space-x-1 mt-1">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-green-600">Video uploaded</span>
                </div>
              </div>
              <button
                type="button"
                onClick={removeFile}
                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <motion.div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-pink-400 bg-pink-50'
              : 'border-gray-300 hover:border-pink-400 hover:bg-pink-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes}
            onChange={handleFileInput}
            className="hidden"
          />
          
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-pink-500 to-rose-500 w-12 h-12 rounded-xl flex items-center justify-center mx-auto">
              <Icon className="w-6 h-6 text-white" />
            </div>
            
            <div>
              <p className="text-lg font-medium text-gray-900">
                {placeholder || `Upload ${type}`}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Drag and drop or click to browse
              </p>
            </div>
            
            <div className="text-xs text-gray-400">
              {type === 'image' 
                ? 'PNG, JPG, WEBP up to 5MB'
                : 'MP4, WEBM, MOV up to 50MB'
              }
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};