import { useStore } from './store';

export async function copyText(text: string, label = 'Value'): Promise<void> {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable. Select the text and copy it manually.');
    await navigator.clipboard.writeText(text);
    useStore.getState().notify('success', `${label} copied to clipboard.`);
  } catch (err) {
    useStore.getState().notify('error', `Could not copy. ${(err as Error).message}`);
  }
}

export function downloadText(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/sql;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
