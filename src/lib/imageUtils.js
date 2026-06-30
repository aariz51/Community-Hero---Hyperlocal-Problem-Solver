// Resize/compress an image File to a JPEG data URL + raw base64 (for Gemini & Storage).
export function fileToCompressed(file, maxDim = 1024, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const im = new Image()
      im.onload = () => {
        let { width, height } = im
        if (width > height && width > maxDim) { height = (height * maxDim) / width; width = maxDim }
        else if (height > maxDim) { width = (width * maxDim) / height; height = maxDim }
        const c = document.createElement('canvas')
        c.width = width; c.height = height
        c.getContext('2d').drawImage(im, 0, 0, width, height)
        const dataUrl = c.toDataURL('image/jpeg', quality)
        resolve({ dataUrl, base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' })
      }
      im.onerror = reject
      im.src = reader.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export const base64Of = (dataUrl) => (dataUrl || '').split(',')[1] || ''

export async function base64FromSource(src) {
  if (!src) return ''
  if (src.startsWith('data:')) return base64Of(src)
  const response = await fetch(src)
  if (!response.ok) throw new Error('Could not load the original report photo for verification.')
  const blob = await response.blob()
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(base64Of(String(reader.result || '')))
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
