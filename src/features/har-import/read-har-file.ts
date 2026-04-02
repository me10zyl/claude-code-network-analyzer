export function readHarFile(file: File): Promise<string> {
  return file.text()
}
