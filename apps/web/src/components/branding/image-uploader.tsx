'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  Download,
  Eye,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react'

interface ImageUploaderProps {
  value?: string
  onChange: (url: string | null) => void
  bucket: string
  path: string
  label?: string
  description?: string
  maxSize?: number // in MB
  acceptedTypes?: string[]
  className?: string
  aspectRatio?: string
  preview?: boolean
}

interface UploadState {
  uploading: boolean
  progress: number
  error: string | null
  success: boolean
}

export function ImageUploader({
  value,
  onChange,
  bucket,
  path,
  label = "Image",
  description,
  maxSize = 5,
  acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  className = "",
  aspectRatio = "16/9",
  preview = true
}: ImageUploaderProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    error: null,
    success: false
  })
  const [dragActive, setDragActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const resetUploadState = () => {
    setUploadState({
      uploading: false,
      progress: 0,
      error: null,
      success: false
    })
  }

  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `File type not supported. Accepted types: ${acceptedTypes.join(', ')}`
    }

    if (file.size > maxSize * 1024 * 1024) {
      return `File too large. Maximum size: ${maxSize}MB`
    }

    return null
  }

  const uploadFile = useCallback(async (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setUploadState(prev => ({ ...prev, error: validationError }))
      return
    }

    resetUploadState()
    setUploadState(prev => ({ ...prev, uploading: true }))

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${path}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

      // Create a preview URL immediately
      const localPreviewUrl = URL.createObjectURL(file)
      setPreviewUrl(localPreviewUrl)

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName)

      // Clean up local preview
      URL.revokeObjectURL(localPreviewUrl)

      setUploadState(prev => ({
        ...prev,
        uploading: false,
        progress: 100,
        success: true
      }))

      setPreviewUrl(publicUrl)
      onChange(publicUrl)

      // Clear success state after 3 seconds
      setTimeout(() => {
        setUploadState(prev => ({ ...prev, success: false }))
      }, 3000)

    } catch (error) {
      console.error('Upload error:', error)
      setUploadState(prev => ({
        ...prev,
        uploading: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      }))

      // Clean up preview on error
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl(value || null)
    }
  }, [bucket, path, maxSize, acceptedTypes, value, onChange, supabase])

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]
    uploadFile(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    handleFileSelect(files)
  }, [uploadFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }, [])

  const handleRemove = async () => {
    if (!value) return

    try {
      // Extract file path from URL
      const url = new URL(value)
      const filePath = url.pathname.split('/').slice(-2).join('/')

      // Delete from Supabase Storage
      await supabase.storage
        .from(bucket)
        .remove([filePath])

      setPreviewUrl(null)
      onChange(null)
      resetUploadState()

    } catch (error) {
      console.error('Delete error:', error)
      setUploadState(prev => ({
        ...prev,
        error: 'Failed to delete image'
      }))
    }
  }

  const handleDownload = () => {
    if (value) {
      const link = document.createElement('a')
      link.href = value
      link.download = `image-${Date.now()}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {label && (
        <div>
          <Label className="text-sm font-medium">{label}</Label>
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </div>
      )}

      {/* Upload Area */}
      <Card className={`relative overflow-hidden transition-all ${
        dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
      } ${uploadState.error ? 'border-red-300' : ''}`}>
        <CardContent className="p-0">
          {previewUrl && preview ? (
            /* Image Preview */
            <div className="relative group">
              <motion.div
                className="relative overflow-hidden bg-gray-100"
                style={{ aspectRatio }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />

                {/* Overlay Actions */}
                <motion.div
                  className="absolute inset-0 bg-black/60 flex items-center justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                >
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={openFileDialog}
                    className="bg-white/90 hover:bg-white text-gray-900"
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    Replace
                  </Button>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleDownload}
                    className="bg-white/90 hover:bg-white text-gray-900"
                  >
                    <Download className="w-4 h-4" />
                  </Button>

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleRemove}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </motion.div>

                {/* Upload Status Overlay */}
                <AnimatePresence>
                  {uploadState.uploading && (
                    <motion.div
                      className="absolute inset-0 bg-black/80 flex items-center justify-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="text-center text-white">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                        <p className="text-sm font-medium">Uploading...</p>
                        <Progress value={uploadState.progress} className="w-32 mt-2" />
                      </div>
                    </motion.div>
                  )}

                  {uploadState.success && (
                    <motion.div
                      className="absolute top-4 right-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Uploaded</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          ) : (
            /* Upload Drop Zone */
            <motion.div
              className="p-8 text-center"
              style={{ aspectRatio }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              animate={{
                backgroundColor: dragActive ? 'rgb(239 246 255)' : 'transparent',
                scale: dragActive ? 1.02 : 1
              }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                {uploadState.uploading ? (
                  <motion.div
                    className="text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-700">Uploading...</p>
                    <Progress value={uploadState.progress} className="w-48 mt-2" />
                  </motion.div>
                ) : (
                  <>
                    <motion.div
                      animate={{
                        scale: dragActive ? 1.1 : 1,
                        rotate: dragActive ? 5 : 0
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      <ImageIcon className={`w-16 h-16 ${
                        dragActive ? 'text-blue-500' : 'text-gray-400'
                      }`} />
                    </motion.div>

                    <div className="space-y-2">
                      <p className="text-lg font-medium text-gray-700">
                        {dragActive ? 'Drop image here' : 'Upload an image'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Drag & drop or click to browse
                      </p>
                      <p className="text-xs text-gray-400">
                        Max {maxSize}MB • {acceptedTypes.map(type => type.split('/')[1]).join(', ')}
                      </p>
                    </div>

                    <Button
                      onClick={openFileDialog}
                      disabled={uploadState.uploading}
                      className="mt-4"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Choose File
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* Error Message */}
          <AnimatePresence>
            {uploadState.error && (
              <motion.div
                className="absolute bottom-0 left-0 right-0 bg-red-50 border-t border-red-200 p-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
              >
                <div className="flex items-center space-x-2 text-red-700">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">{uploadState.error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      {/* File Info */}
      {value && (
        <motion.div
          className="text-xs text-gray-500 space-y-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex items-center space-x-2">
            <Eye className="w-3 h-3" />
            <span className="truncate">{value}</span>
          </div>
        </motion.div>
      )}
    </div>
  )
}