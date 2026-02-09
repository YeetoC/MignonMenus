export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof window === "undefined") {
    return false
  }

  try {
    if (window.isSecureContext && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }

    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.setAttribute("readonly", "")
    textarea.style.position = "fixed"
    textarea.style.top = "-9999px"
    textarea.style.left = "-9999px"

    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()

    const ok = document.execCommand("copy")
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}

export async function copyRichTextToClipboard(args: {
  html: string
  plain: string
}): Promise<boolean> {
  if (typeof window === "undefined") {
    return false
  }

  const html = args.html.trim()
  const plain = args.plain

  try {
    if (
      window.isSecureContext &&
      navigator.clipboard?.write &&
      typeof ClipboardItem !== "undefined"
    ) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        }),
      ])
      return true
    }
  } catch {
    // ignore
  }

  return copyTextToClipboard(plain)
}
