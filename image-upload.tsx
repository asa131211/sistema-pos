"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, Camera, ImageIcon, X, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface ImageUploadProps {
  onImageSelect: (imageUrl: string) => void
  currentImage?: string
  className?: string
}

export default function ImageUpload({ onImageSelect, currentImage, className }: ImageUploadProps) {
  const [preview, setPreview] = useState<string>(currentImage || "")
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Convertir archivo a base64
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })
  }

  // Redimensionar imagen
  const resizeImage = (file: File, maxWidth = 800, maxHeight = 600): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      const img = new Image()

      img.onload = () => {
        // Calcular nuevas dimensiones manteniendo proporción
        let { width, height } = img

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height

        // Dibujar imagen redimensionada
        ctx?.drawImage(img, 0, 0, width, height)

        // Convertir a base64 con calidad optimizada
        const resizedBase64 = canvas.toDataURL("image/jpeg", 0.8)
        resolve(resizedBase64)
      }

      img.src = URL.createObjectURL(file)
    })
  }

  // Manejar selección de archivo
  const handleFileSelect = async (file: File) => {
    if (!file) return

    // Validar tipo de archivo
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor selecciona solo archivos de imagen")
      return
    }

    // Validar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("La imagen es muy grande. Máximo 10MB")
      return
    }

    setUploading(true)
    try {
      // Redimensionar y optimizar imagen
      const optimizedImage = await resizeImage(file)

      setPreview(optimizedImage)
      onImageSelect(optimizedImage)

      toast.success("Imagen cargada exitosamente")
    } catch (error) {
      console.error("Error processing image:", error)
      toast.error("Error al procesar la imagen")
    } finally {
      setUploading(false)
    }
  }

  // Manejar cambio en input de archivo
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  // Manejar drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  // Abrir selector de archivos
  const openFileSelector = () => {
    fileInputRef.current?.click()
  }

  // Abrir cámara (móvil)
  const openCamera = () => {
    cameraInputRef.current?.click()
  }

  // Limpiar imagen
  const clearImage = () => {
    setPreview("")
    onImageSelect("")
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (cameraInputRef.current) cameraInputRef.current.value = ""
  }

  return (
    <div className={className}>
      <Label className="text-sm font-medium">Imagen del Producto</Label>

      {/* Área de preview/upload */}
      <Card className="mt-2">
        <CardContent className="p-4">
          {preview ? (
            // Vista previa de imagen
            <div className="relative">
              <img src={preview || "/placeholder.svg"} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={clearImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            // Área de drop/upload
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : "border-gray-300 dark:border-gray-600"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {uploading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
                  <p className="text-sm text-gray-600">Procesando imagen...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <ImageIcon className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600 mb-4">
                    Arrastra una imagen aquí o selecciona desde tu dispositivo
                  </p>

                  {/* Botones de acción */}
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={openFileSelector}
                      className="flex items-center bg-transparent"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Seleccionar Archivo
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={openCamera}
                      className="flex items-center bg-transparent"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Usar Cámara
                    </Button>
                  </div>

                  <p className="text-xs text-gray-500 mt-2">Formatos: JPG, PNG, GIF • Máximo: 10MB</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inputs ocultos */}
      <Input ref={fileInputRef} type="file" accept="image/*" onChange={handleInputChange} className="hidden" />

      <Input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  )
}
