/** Trigger a reliable file download from a Blob or Response body. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || 'download'
  a.rel = 'noopener'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoking immediately can cancel the download in Chrome/Safari.
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export async function downloadResponse(res, filename) {
  const blob = await res.blob()
  downloadBlob(blob, filename)
}
