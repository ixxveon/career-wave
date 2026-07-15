export function formatLogTime(value: string): string {
  const [date = '', time = ''] = value.split(' ');
  const [, sourceMonth = '', sourceDay = ''] = date.split('-');
  if (sourceMonth && sourceDay && time) return `${sourceMonth}/${sourceDay} ${time}`;

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return value;

  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const day = String(parsedDate.getDate()).padStart(2, '0');
  const hours = String(parsedDate.getHours()).padStart(2, '0');
  const minutes = String(parsedDate.getMinutes()).padStart(2, '0');
  const seconds = String(parsedDate.getSeconds()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}:${seconds}`;
}
