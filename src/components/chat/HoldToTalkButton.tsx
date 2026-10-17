import { useRef, useState } from 'react';
import { Mic } from 'lucide-react';
import { HoldToTalk, micDisponivel } from '../../lib/holdToTalk';
import { Button } from '../ui/button';

interface Props {
  disabled?: boolean;
  onWav: (wav: Blob) => void | Promise<void>;
  onTooShort?: () => void;
  onError?: (msg: string) => void;
}

/** Segurar para falar (pointer). Soltar envia o WAV. */
export function HoldToTalkButton({ disabled, onWav, onTooShort, onError }: Props) {
  const gravador = useRef(new HoldToTalk());
  const [gravando, setGravando] = useState(false);
  const ativo = micDisponivel();

  const soltar = async () => {
    if (!gravador.current.isRecording) return;
    setGravando(false);
    try {
      const wav = await gravador.current.stop();
      if (!wav) {
        onTooShort?.();
        return;
      }
      await onWav(wav);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Falha ao gravar');
    }
  };

  const segurar = async () => {
    if (disabled || !ativo || gravador.current.isRecording) return;
    try {
      await gravador.current.start();
      setGravando(true);
    } catch {
      onError?.('Sem microfone. Libere o acesso no sistema.');
    }
  };

  return (
    <Button
      type="button"
      variant={gravando ? 'default' : 'outline'}
      disabled={disabled || !ativo}
      title={
        !ativo
          ? 'Microfone indisponível'
          : gravando
            ? 'Solte para enviar'
            : 'Segure para falar'
      }
      aria-pressed={gravando}
      onPointerDown={(e) => {
        e.preventDefault();
        (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
        void segurar();
      }}
      onPointerUp={() => void soltar()}
      onPointerCancel={() => void soltar()}
      onContextMenu={(e) => e.preventDefault()}
      style={
        gravando
          ? { background: 'var(--color-error)', color: 'white' }
          : undefined
      }
    >
      <Mic size={14} />
      {gravando ? 'Solte…' : 'Falar'}
    </Button>
  );
}
