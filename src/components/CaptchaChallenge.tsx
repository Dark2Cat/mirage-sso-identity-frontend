import { CheckCircle2, MousePointerClick, Puzzle, RotateCcw, ShieldCheck } from 'lucide-react';
import { useEffect, useState, type CSSProperties } from 'react';
import type { CaptchaMode } from '../config';

interface CaptchaChallengeProps {
  mode: CaptchaMode;
  onVerifiedChange: (verified: boolean) => void;
}

export function CaptchaChallenge({ mode, onVerifiedChange }: CaptchaChallengeProps) {
  const [puzzle, setPuzzle] = useState(createPuzzleChallenge);
  const [sliderValue, setSliderValue] = useState(puzzle.startPercent);
  const [puzzleChecked, setPuzzleChecked] = useState(false);
  const [clickSequence, setClickSequence] = useState<string[]>([]);
  const [clickTarget, setClickTarget] = useState(() => createClickTarget());
  const [clickOptions, setClickOptions] = useState(() => createClickOptions(clickTarget));

  const puzzleAligned = Math.abs(sliderValue - puzzle.targetPercent) <= 1;
  const puzzleVerified = mode === 'PUZZLE' && puzzleChecked && puzzleAligned;
  const clickVerified = mode === 'CLICK_TEXT' && clickSequence.join('') === clickTarget.join('');
  const verified = mode === 'NONE' || puzzleVerified || clickVerified;

  useEffect(() => {
    onVerifiedChange(verified);
  }, [onVerifiedChange, verified]);

  useEffect(() => {
    const nextPuzzle = createPuzzleChallenge();
    setPuzzle(nextPuzzle);
    setSliderValue(nextPuzzle.startPercent);
    setPuzzleChecked(false);
    setClickSequence([]);
    const nextTarget = createClickTarget();
    setClickTarget(nextTarget);
    setClickOptions(createClickOptions(nextTarget));
  }, [mode]);

  function resetClickCaptcha() {
    const nextTarget = createClickTarget();
    setClickSequence([]);
    setClickTarget(nextTarget);
    setClickOptions(createClickOptions(nextTarget));
  }

  function resetPuzzleCaptcha() {
    const nextPuzzle = createPuzzleChallenge();
    setPuzzle(nextPuzzle);
    setSliderValue(nextPuzzle.startPercent);
    setPuzzleChecked(false);
  }

  function updatePuzzlePosition(value: number) {
    setSliderValue(value);
    setPuzzleChecked(false);
  }

  function checkPuzzlePosition() {
    setPuzzleChecked(true);
  }

  if (mode === 'NONE') {
    return null;
  }

  if (mode === 'PUZZLE') {
    return (
      <div className="captcha-box">
        <div className="captcha-title">
          <Puzzle size={18} />
          <span>拼图验证</span>
          <button className="captcha-reset" onClick={resetPuzzleCaptcha} type="button">
            <RotateCcw size={13} />
          </button>
          {puzzleVerified ? <CheckCircle2 size={17} /> : null}
        </div>
        <div className="puzzle-track" style={{ background: puzzle.background }}>
          <div
            className="puzzle-gap"
            style={{ left: `${puzzle.targetPercent}%`, top: puzzle.top }}
          />
          <div
            className="puzzle-piece"
            style={{
              background: puzzle.pieceBackground,
              left: `${sliderValue}%`,
              top: puzzle.top,
            }}
          >
            <Puzzle size={16} />
          </div>
        </div>
        <input
          aria-label="拖动拼图验证码"
          className="captcha-slider"
          max={100}
          min={0}
          step={1}
          onChange={(event) => updatePuzzlePosition(Number(event.target.value))}
          onKeyUp={checkPuzzlePosition}
          onPointerUp={checkPuzzlePosition}
          onTouchEnd={checkPuzzlePosition}
          type="range"
          value={sliderValue}
        />
        <span className={puzzleVerified ? 'captcha-hint verified' : 'captcha-hint'}>
          {puzzleVerified
            ? '拼图已准确对齐，可以继续登录。'
            : puzzleChecked
              ? '位置还不准确，请继续拖动拼图。'
              : '拖动滑块，将拼图移至图中缺口，松开后验证。'}
        </span>
      </div>
    );
  }

  return (
    <div className="captcha-box">
      <div className="captcha-title">
        <MousePointerClick size={18} />
        <span>文字点击验证</span>
        {clickVerified ? <CheckCircle2 size={17} /> : null}
      </div>
      <div className="click-captcha">
        <div className="click-target">
          <ShieldCheck size={16} />
          <span>{clickTarget.join(' -> ')}</span>
          <button className="captcha-reset" onClick={resetClickCaptcha} type="button">
            <RotateCcw size={13} />
          </button>
        </div>
        <div className="click-board">
          {clickOptions.map((letter, index) => (
            <button
              className={clickSequence.includes(letter) ? 'picked' : ''}
              key={`${letter}-${index}`}
              onClick={() => setClickSequence((current) => {
                const next = current.length >= 3 ? [letter] : [...current, letter];
                return next.slice(0, 3);
              })}
              type="button"
            >
              {letter}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface PuzzleChallenge {
  background: CSSProperties['background'];
  pieceBackground: CSSProperties['background'];
  startPercent: number;
  targetPercent: number;
  top: number;
}

function createPuzzleChallenge(): PuzzleChallenge {
  const targetPercent = randomInt(48, 86);
  const startPercent = randomInt(8, 24);
  const top = randomInt(20, 58);
  const palette = shuffle([
    ['rgba(96, 215, 232, 0.32)', 'rgba(165, 255, 106, 0.18)', 'rgba(255, 255, 255, 0.055)'],
    ['rgba(243, 192, 93, 0.30)', 'rgba(118, 167, 255, 0.18)', 'rgba(255, 255, 255, 0.052)'],
    ['rgba(232, 117, 183, 0.28)', 'rgba(72, 215, 166, 0.18)', 'rgba(255, 255, 255, 0.05)'],
    ['rgba(118, 167, 255, 0.30)', 'rgba(214, 219, 112, 0.16)', 'rgba(255, 255, 255, 0.055)'],
  ])[0];
  const angle = randomInt(18, 152);
  const stripe = randomInt(9, 15);
  const x = randomInt(16, 84);
  const y = randomInt(12, 76);

  return {
    background: [
      `radial-gradient(circle at ${x}% ${y}%, ${palette[0]}, transparent 28%)`,
      `linear-gradient(${angle}deg, ${palette[1]}, transparent 62%)`,
      `repeating-linear-gradient(45deg, ${palette[2]} 0 ${stripe}px, transparent ${stripe}px ${stripe * 2}px)`,
      'linear-gradient(135deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.012))',
    ].join(', '),
    pieceBackground: `linear-gradient(135deg, ${palette[0]}, var(--accent))`,
    startPercent,
    targetPercent,
    top,
  };
}

function createClickTarget() {
  const source = ['M', 'I', 'R', 'A', 'G', 'E', 'S', 'O'];
  return shuffle(source).slice(0, 3);
}

function createClickOptions(target: string[]) {
  const source = ['M', 'I', 'R', 'A', 'G', 'E', 'S', 'O', 'X', 'K'];
  const options = Array.from(new Set([...target, ...shuffle(source).slice(0, 5)]));
  return shuffle(options).slice(0, 6);
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
