export interface Model {
    name: string
    model: string
  }
  
export interface ApiResponse {
    models: Model[]
  }

export interface ImageResponse {
  prompt: string,
  url: string,
  timestamp: number
}

export interface ImageGenOverlayProps {
  isOpen: boolean,
  onClose: () => void,
  onGenerate: (prompt: string) => void
}