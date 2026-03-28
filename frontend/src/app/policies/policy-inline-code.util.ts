export interface PolicyInlineSegment {
  text: string;
  isCode: boolean;
}

export function splitPolicyInlineCode(value: string): PolicyInlineSegment[] {
  if (!value.includes('`')) {
    return [{ text: value, isCode: false }];
  }

  const parts = value.split('`');

  return parts
    .filter((part, index) => part.length > 0 || index === 0 || index === parts.length - 1)
    .map((part, index) => ({
      text: part,
      isCode: index % 2 === 1,
    }));
}

export function formatPolicyClaimClass(value: string): string {
  return value.replaceAll('_', ' ');
}
