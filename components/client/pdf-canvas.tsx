"use client"

import { useEffect, useRef, useState, useCallback } from 'react'

interface PDFCanvasProps {
  pdfUrl: string
  width: number
  height: number
  zoom: number
  pan: { x: number; y: number }
  onLoadComplete?: (success: boolean) => void
}

export function PDFCanvas({ pdfUrl, width, height, zoom, pan, onLoadComplete }: PDFCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderTaskRef = useRef<any>(null)
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastRenderParamsRef = useRef<string>('')
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [pageNum, setPageNum] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadPDF = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Dynamically import PDF.js
        const pdfjsLib = await import('pdfjs-dist')
        
        // Set up the worker using local file
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          // Use the local worker file we copied to the public directory
          pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs'
          console.log('Using local PDF.js worker from: /pdfjs/pdf.worker.min.mjs')
        }

        // Load the PDF
        console.log('Loading PDF from:', pdfUrl)
        console.log('Worker source:', pdfjsLib.GlobalWorkerOptions.workerSrc)
        
        const loadingTask = pdfjsLib.getDocument(pdfUrl)
        const pdf = await loadingTask.promise
        
        console.log('PDF loaded successfully, pages:', pdf.numPages)
        setPdfDoc(pdf)
        onLoadComplete?.(true)
      } catch (error) {
        console.error('Error loading PDF:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        const errorDetails = error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack
        } : { error: String(error) }
        console.error('Error details:', errorDetails)
        setError(`Failed to load PDF: ${errorMessage}`)
        onLoadComplete?.(false)
      } finally {
        setIsLoading(false)
      }
    }

    if (pdfUrl) {
      loadPDF()
    }
  }, [pdfUrl, onLoadComplete])

  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return

    try {
      setError(null) // Clear any previous errors

      // Create a unique identifier for this render operation
      const renderParams = `${pageNum}-${width}-${height}-${zoom}`
      
      // Skip if we're already rendering with the same parameters
      if (lastRenderParamsRef.current === renderParams && renderTaskRef.current) {
        return
      }

      // Cancel any existing render task
      if (renderTaskRef.current) {
        console.log('Cancelling previous render task')
        try {
          renderTaskRef.current.cancel()
        } catch (e) {
          // Ignore cancellation errors
        }
        renderTaskRef.current = null
      }

      // Clear any pending render timeout
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current)
        renderTimeoutRef.current = null
      }

      const page = await pdfDoc.getPage(pageNum)
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')

      if (!context) {
        throw new Error('Failed to get canvas context')
      }

      // Calculate scale to fit the desired dimensions
      const viewport = page.getViewport({ scale: 1 })
      const scaleX = width / viewport.width
      const scaleY = height / viewport.height
      const scale = Math.min(scaleX, scaleY) * zoom

      const scaledViewport = page.getViewport({ scale })

      // Only resize canvas if dimensions actually changed
      const needsResize = canvas.width !== scaledViewport.width || canvas.height !== scaledViewport.height
      if (needsResize) {
        canvas.width = scaledViewport.width
        canvas.height = scaledViewport.height
      }

      // Only clear canvas if we resized it (to avoid white flash)
      if (needsResize) {
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, canvas.width, canvas.height)
      }

      // Render the page
      const renderContext = {
        canvasContext: context,
        viewport: scaledViewport,
      }

      // Store the render task so we can cancel it if needed
      renderTaskRef.current = page.render(renderContext)
      lastRenderParamsRef.current = renderParams
      
      await renderTaskRef.current.promise
      
      // Clear the render task reference when completed successfully
      renderTaskRef.current = null
      console.log('PDF render completed successfully')
      
    } catch (error) {
      // Check if the error is due to cancellation
      if (error && typeof error === 'object' && 'name' in error && error.name === 'RenderingCancelledException') {
        console.log('Render task was cancelled (this is normal)')
        return
      }
      
      console.error('Error rendering page:', error)
      
      // Set up a retry mechanism for failed renders
      renderTimeoutRef.current = setTimeout(() => {
        console.log('Retrying PDF render after error...')
        renderPage()
      }, 100) // Short delay before retry
    }
  }, [pdfDoc, pageNum, width, height, zoom])

  // Debounced render effect that only triggers on zoom changes, not pan
  useEffect(() => {
    if (!pdfDoc) return

    // Clear any existing timeout
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current)
    }

    // Use shorter debounce for smoother zoom experience
    renderTimeoutRef.current = setTimeout(() => {
      renderPage()
    }, 50) // Reduced from 16ms to 50ms for better stability

    // Cleanup function to cancel render task when component unmounts or dependencies change
    return () => {
      if (renderTaskRef.current) {
        console.log('Cleaning up render task')
        try {
          renderTaskRef.current.cancel()
        } catch (e) {
          // Ignore cancellation errors
        }
        renderTaskRef.current = null
      }
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current)
        renderTimeoutRef.current = null
      }
    }
  }, [renderPage])

  // Recovery mechanism - if we have an error and the PDF doc is loaded, try to recover
  useEffect(() => {
    if (error && pdfDoc) {
      console.log('Attempting to recover from render error...')
      const recoveryTimeout = setTimeout(() => {
        setError(null)
        renderPage()
      }, 500)
      
      return () => clearTimeout(recoveryTimeout)
    }
  }, [error, pdfDoc, renderPage])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ width, height }}>
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent border-solid rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-600">Loading PDF...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center bg-gray-100" style={{ width, height }}>
        <div className="text-center p-4">
          <p className="text-red-600 mb-2">{error}</p>
          <p className="text-sm text-gray-500">
            This might be a network issue. Try refreshing the page.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="relative overflow-hidden bg-white shadow-lg"
      style={{ width, height }}
    >
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px)`,
          transformOrigin: '0 0',
        }}
      >
        <canvas
          ref={canvasRef}
          className="block"
          style={{
            maxWidth: 'none',
            maxHeight: 'none',
          }}
        />
      </div>
    </div>
  )
} 