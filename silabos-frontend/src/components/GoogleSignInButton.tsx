import { useEffect, useRef, useState } from 'react';

type GoogleButtonText = 'signin_with' | 'signup_with' | 'continue_with';

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleSignInButtonProps {
  text?: GoogleButtonText;
  onCredential: (credential: string) => void | Promise<void>;
  disabled?: boolean;
  width?: number;
}

type GoogleWindow = Window & {
  google?: {
    accounts?: {
      id?: {
        initialize: (config: {
          client_id: string;
          callback: (response: GoogleCredentialResponse) => void;
          ux_mode?: 'popup' | 'redirect';
        }) => void;
        renderButton: (
          parent: HTMLElement,
          options: {
            theme?: string;
            size?: string;
            text?: GoogleButtonText;
            shape?: string;
            width?: number;
            locale?: string;
          },
        ) => void;
      };
    };
  };
};

let googleScriptPromise: Promise<void> | null = null;

function loadGoogleScript(): Promise<void> {
  const googleWindow = window as GoogleWindow;
  if (googleWindow.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (googleScriptPromise) {
    return googleScriptPromise;
  }

  googleScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('No se pudo cargar Google Identity Services')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar Google Identity Services'));
    document.head.appendChild(script);
  });

  return googleScriptPromise;
}

export default function GoogleSignInButton({
  text = 'signin_with',
  onCredential,
  disabled = false,
  width = 340,
}: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) {
      setError('Google Sign-In no está configurado en este entorno.');
      return;
    }

    let mounted = true;

    loadGoogleScript()
      .then(() => {
        const googleWindow = window as GoogleWindow;
        const googleId = googleWindow.google?.accounts?.id;

        if (!mounted || !googleId || !buttonRef.current) {
          return;
        }

        googleId.initialize({
          client_id: clientId,
          ux_mode: 'popup',
          callback: (response) => {
            if (response.credential) {
              void onCredential(response.credential);
            }
          },
        });

        buttonRef.current.innerHTML = '';
        googleId.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          text,
          shape: 'pill',
          width,
          locale: 'es',
        });
      })
      .catch((loadError) => {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar Google Sign-In');
        }
      });

    return () => {
      mounted = false;
    };
  }, [clientId, onCredential, text, width]);

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <div className="relative">
      <div ref={buttonRef} />
      {disabled ? <div className="absolute inset-0 cursor-not-allowed rounded-full bg-white/65" /> : null}
    </div>
  );
}
