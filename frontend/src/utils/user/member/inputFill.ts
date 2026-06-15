const FILL_COLOR = 'rgba(120,168,238,0.22)';

let measureContext: CanvasRenderingContext2D | null = null;

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (measureContext) return measureContext;
  const canvas = document.createElement('canvas');
  measureContext = canvas.getContext('2d');
  return measureContext;
}

export function applyInputFill(input: HTMLInputElement) {
  const text = input.type === 'password' ? '•'.repeat(input.value.length) : input.value;
  if (!text) {
    input.style.removeProperty('background-image');
    return;
  }
  const ctx = getMeasureContext();
  if (!ctx) return;
  const style = getComputedStyle(input);
  ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const textWidth = Math.ceil(ctx.measureText(text).width);
  const isRegister = input.closest('.cw-register-field, .cw-register-inline') !== null;
  const end = isRegister ? 15 + textWidth : textWidth;
  input.style.backgroundImage = `linear-gradient(to right, ${FILL_COLOR} 0px, ${FILL_COLOR} ${end}px, transparent ${end}px)`;
}

export function clearInputFill(input: HTMLInputElement) {
  input.style.removeProperty('background-image');
}
