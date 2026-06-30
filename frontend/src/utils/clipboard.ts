import { toastService } from '@/services/toastService';

export async function copyTextToClipboard(text: string, label = 'Texte'): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    toastService.success('Copié', `${label} copié dans le presse-papiers.`);
    return true;
  } catch {
    toastService.error('Copie impossible', 'Le presse-papiers n\'est pas accessible.');
    return false;
  }
}
