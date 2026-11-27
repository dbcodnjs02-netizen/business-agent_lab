import type { CharacterLook, Expression } from '../../types/character';
import { CharacterSprite } from './CharacterSprite';

interface CharacterPortraitProps {
  look: CharacterLook;
  expression?: Expression;
  className?: string;
}

/** 프로필 사진용 상반신 (부모 크기에 맞춰 늘어남) */
export function CharacterPortrait({ look, expression = 'neutral', className = 'size-full' }: CharacterPortraitProps) {
  return (
    <svg viewBox="-20 -57 40 40" className={className} aria-hidden>
      <CharacterSprite look={look} expression={expression} />
    </svg>
  );
}
