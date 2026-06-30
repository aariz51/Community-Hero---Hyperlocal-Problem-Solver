import { getDownloadURL, ref, uploadString } from 'firebase/storage'
import { storage } from '../firebase'

function imagePath(folder, userId) {
  const id = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${folder}/${userId}/${id}.jpg`
}

async function uploadDataUrl(folder, userId, dataUrl) {
  if (!userId) throw new Error('Sign in is required before uploading images.')
  const path = imagePath(folder, userId)
  const imageRef = ref(storage, path)
  await uploadString(imageRef, dataUrl, 'data_url', { contentType: 'image/jpeg' })
  return { url: await getDownloadURL(imageRef), path }
}

export const uploadReportImage = (userId, dataUrl) => uploadDataUrl('report-images', userId, dataUrl)
export const uploadVerificationImage = (userId, dataUrl) => uploadDataUrl('verification-images', userId, dataUrl)
