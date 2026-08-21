import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AuthSwitch from '@/components/AuthSwitch';
import { SmoothInput } from '@/components/ui/smooth-input';

const authMocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  verifyEmailCode: vi.fn(),
  resendSignupCode: vi.fn(),
}));

const toastMocks = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getUser: () => null,
  authReady: Promise.resolve(),
  signIn: authMocks.signIn,
  signUp: authMocks.signUp,
  signInWithGoogle: vi.fn(),
  verifyEmailCode: authMocks.verifyEmailCode,
  resendSignupCode: authMocks.resendSignupCode,
  canUseGoogle: false,
  defaultDestForAccount: (role: string) => role === 'ngo' ? '/ngo/profile' : '/donor/profile',
  needsProfileSetup: () => false,
}));

vi.mock('sonner', () => ({
  toast: toastMocks,
}));

vi.mock('react-use-measure', () => ({
  default: () => [vi.fn(), { height: 520 }],
}));

type SignupPath = {
  side: 'donor' | 'ngo';
  route: string;
  nameLabel: RegExp;
  namePlaceholder: string;
  name: string;
  email: string;
  emailPlaceholder: string;
  submitLabel: RegExp;
};

const signupPaths: SignupPath[] = [
  {
    side: 'donor',
    route: '/donor/auth?mode=signup',
    nameLabel: /Nome do Doador/i,
    namePlaceholder: 'Seu nome',
    name: 'Maria Silva',
    email: 'maria@example.com',
    emailPlaceholder: 'seu@email.com',
    submitLabel: /Criar conta/i,
  },
  {
    side: 'ngo',
    route: '/ngo/auth?mode=signup',
    nameLabel: /Nome da organização/i,
    namePlaceholder: 'Nome da organização',
    name: 'Instituto Horizonte',
    email: 'contato@horizonte.org',
    emailPlaceholder: 'contato@suaong.org',
    submitLabel: /Cadastrar organização/i,
  },
];

const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
};

const renderSignup = async (path: SignupPath) => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[path.route]}>
      <AuthSwitch initialSide={path.side} />
      <LocationProbe />
    </MemoryRouter>,
  );

  await user.click(screen.getByRole('button', { name: /Etapa atual: Acesso e cadastro/i }));
  return user;
};

describe('AuthSwitch signup', () => {
  afterEach(cleanup);

  beforeEach(() => {
    toastMocks.error.mockReset();
    toastMocks.success.mockReset();
    authMocks.signIn.mockReset();
    authMocks.signUp.mockReset();
    authMocks.signUp.mockResolvedValue({ user: null, needsEmailConfirmation: true });
    authMocks.verifyEmailCode.mockReset();
    authMocks.verifyEmailCode.mockResolvedValue({ accountType: 'donor' });
    authMocks.resendSignupCode.mockReset();
    authMocks.resendSignupCode.mockResolvedValue(undefined);
  });

  it.each(signupPaths)(
    'keeps the email-code input visible when $side advances to verification',
    async (path) => {
      const user = await renderSignup(path);
      await user.type(screen.getByPlaceholderText(path.namePlaceholder), path.name);
      await user.type(screen.getByPlaceholderText(path.emailPlaceholder), path.email);
      await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'segura123');
      await user.type(screen.getByPlaceholderText('Repita sua senha'), 'segura123');
      fireEvent.submit(screen.getByPlaceholderText(path.emailPlaceholder).closest('form')!);

      expect(await screen.findByText(/Código de verificação/i)).toBeTruthy();
      expect(
        screen.getAllByText(path.email).some((element) => element.getAttribute('aria-hidden') !== 'true'),
      ).toBe(true);
    },
  );

  it('shows a second password field while creating an account', async () => {
    await renderSignup(signupPaths[0]);

    expect(screen.queryByPlaceholderText('Repita sua senha')).not.toBeNull();
  });

  it('uses the folded expanding style for every verification digit', async () => {
    const path = signupPaths[0];
    const user = await renderSignup(path);
    await user.type(screen.getByPlaceholderText(path.namePlaceholder), path.name);
    await user.type(screen.getByPlaceholderText(path.emailPlaceholder), path.email);
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'segura123');
    await user.type(screen.getByPlaceholderText('Repita sua senha'), 'segura123');
    fireEvent.submit(screen.getByPlaceholderText(path.emailPlaceholder).closest('form')!);

    const codeInputs = await screen.findAllByRole('textbox', { name: /Digito/i });
    expect(codeInputs).toHaveLength(8);
    expect(codeInputs.every((input) => input.classList.contains('verification-code-input'))).toBe(true);
    const grid = codeInputs[0].closest('.verification-code-grid');
    expect(grid?.querySelectorAll('.verification-code-row')).toHaveLength(1);
    expect(grid?.querySelector('.verification-code-separator')).not.toBeNull();
  });

  it('accepts the default six-digit Supabase code when browser autofill fills the first input', async () => {
    const path = signupPaths[0];
    const user = await renderSignup(path);
    await user.type(screen.getByPlaceholderText(path.namePlaceholder), path.name);
    await user.type(screen.getByPlaceholderText(path.emailPlaceholder), path.email);
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'segura123');
    await user.type(screen.getByPlaceholderText('Repita sua senha'), 'segura123');
    fireEvent.submit(screen.getByPlaceholderText(path.emailPlaceholder).closest('form')!);

    const codeInputs = await screen.findAllByRole('textbox', { name: /Digito/i });
    expect(codeInputs[0].getAttribute('maxlength')).toBe('8');
    fireEvent.change(codeInputs[0], { target: { value: '123456' } });
    await user.click(screen.getByRole('button', { name: /Confirmar código/i }));

    await waitFor(() => {
      expect(authMocks.verifyEmailCode).toHaveBeenCalledWith(path.email, '123456', 'donor');
    });
  });

  it('waits before allowing another confirmation email request', async () => {
    const path = signupPaths[1];
    const user = await renderSignup(path);
    await user.type(screen.getByPlaceholderText(path.namePlaceholder), path.name);
    await user.type(screen.getByPlaceholderText(path.emailPlaceholder), path.email);
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'segura123');
    await user.type(screen.getByPlaceholderText('Repita sua senha'), 'segura123');
    fireEvent.submit(screen.getByPlaceholderText(path.emailPlaceholder).closest('form')!);

    const resendLabel = await screen.findByText(/Reenviar/i);
    expect(resendLabel.textContent).toMatch(/Reenviar em \d+s/i);
    expect((resendLabel.closest('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows an actionable error for an invalid email before submitting', async () => {
    const path = signupPaths[1];
    await renderSignup(path);
    fireEvent.change(screen.getByPlaceholderText(path.namePlaceholder), {
      target: { value: path.name },
    });
    fireEvent.change(screen.getByPlaceholderText(path.emailPlaceholder), {
      target: { value: 'contato-sem-dominio' },
    });
    fireEvent.change(screen.getByPlaceholderText('Mínimo 6 caracteres'), {
      target: { value: 'segura123' },
    });

    fireEvent.submit(screen.getByRole('button', { name: path.submitLabel }).closest('form')!);

    await waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledWith('Digite um e-mail válido.');
    });
    expect(authMocks.signUp).not.toHaveBeenCalled();
  });

  it('blocks signup when the passwords do not match', async () => {
    const path = signupPaths[0];
    const user = await renderSignup(path);
    await user.type(screen.getByPlaceholderText(path.namePlaceholder), path.name);
    await user.type(screen.getByPlaceholderText(path.emailPlaceholder), path.email);
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'segura123');
    await user.type(screen.getByPlaceholderText('Repita sua senha'), 'outra123');

    fireEvent.submit(screen.getByPlaceholderText(path.emailPlaceholder).closest('form')!);

    await waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledWith('As senhas não são iguais.');
    });
    expect(authMocks.signUp).not.toHaveBeenCalled();
  });

  it('explains the provider wait time when an organization email hits the send limit', async () => {
    const path = signupPaths[1];
    authMocks.signUp.mockRejectedValueOnce(
      Object.assign(new Error('Request rejected'), { code: 'over_email_send_rate_limit', status: 429 }),
    );
    await renderSignup(path);

    fireEvent.change(screen.getByPlaceholderText(path.namePlaceholder), { target: { value: path.name } });
    fireEvent.change(screen.getByPlaceholderText(path.emailPlaceholder), { target: { value: path.email } });
    fireEvent.change(screen.getByPlaceholderText('Mínimo 6 caracteres'), { target: { value: 'segura123' } });
    fireEvent.change(screen.getByPlaceholderText('Repita sua senha'), { target: { value: 'segura123' } });
    fireEvent.submit(screen.getByPlaceholderText(path.emailPlaceholder).closest('form')!);

    await waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledWith(
        'Limite de envio atingido. Aguarde até uma hora e tente reenviar o código.',
      );
    });
  });

  it('opens verification and requests a fresh code when login finds an unconfirmed account', async () => {
    const path = signupPaths[0];
    authMocks.signIn.mockRejectedValueOnce(
      Object.assign(new Error('Request rejected'), { code: 'email_not_confirmed', status: 400 }),
    );
    const user = await renderSignup({ ...path, route: '/donor/auth' });

    await user.type(screen.getByPlaceholderText(path.emailPlaceholder), path.email);
    await user.type(screen.getByPlaceholderText('••••••••'), 'segura123');
    fireEvent.submit(screen.getByPlaceholderText(path.emailPlaceholder).closest('form')!);

    expect(await screen.findByText(/Código de verificação/i)).toBeTruthy();
    expect(authMocks.resendSignupCode).toHaveBeenCalledWith(path.email);
  });

  it('keeps the donor journey ready after verifying the emailed code', async () => {
    const path = signupPaths[0];
    const user = await renderSignup(path);
    await user.type(screen.getByPlaceholderText(path.namePlaceholder), path.name);
    await user.type(screen.getByPlaceholderText(path.emailPlaceholder), path.email);
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'segura123');
    await user.type(screen.getByPlaceholderText('Repita sua senha'), 'segura123');
    fireEvent.submit(screen.getByPlaceholderText(path.emailPlaceholder).closest('form')!);

    const codeInputs = await screen.findAllByRole('textbox', { name: /Digito/i });
    for (const [index, input] of codeInputs.entries()) {
      fireEvent.change(input, { target: { value: String(index + 1) } });
    }
    await user.click(screen.getByRole('button', { name: /Confirmar código/i }));

    expect(await screen.findByText('O começo do bem.')).toBeTruthy();
    expect(authMocks.verifyEmailCode).toHaveBeenCalledWith(path.email, '12345678', 'donor');

    await user.click(screen.getByRole('button', { name: /Personalizar meu perfil/i }));
    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/donor/profile?setup=1');
    });
  });

  it('sends a newly verified organization to its empty setup profile', async () => {
    const path = signupPaths[1];
    const user = await renderSignup(path);
    authMocks.verifyEmailCode.mockResolvedValue({ accountType: 'ngo' });
    await user.type(screen.getByPlaceholderText(path.namePlaceholder), path.name);
    await user.type(screen.getByPlaceholderText(path.emailPlaceholder), path.email);
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'segura123');
    await user.type(screen.getByPlaceholderText('Repita sua senha'), 'segura123');
    fireEvent.submit(screen.getByPlaceholderText(path.emailPlaceholder).closest('form')!);

    const codeInputs = await screen.findAllByRole('textbox', { name: /Digito/i });
    for (const [index, input] of codeInputs.entries()) {
      fireEvent.change(input, { target: { value: String(index + 1) } });
    }
    await user.click(screen.getByRole('button', { name: /Confirmar código/i }));
    await user.click(await screen.findByRole('button', { name: /Seguir para o início da jornada/i }));
    await user.click(await screen.findByRole('button', { name: /Configurar minha organização/i }));

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/ngo/profile?setup=1');
    });
  });
});

describe('SmoothInput', () => {
  afterEach(cleanup);

  it('keeps the animated caret enabled in authentication fields', async () => {
    await renderSignup(signupPaths[0]);

    const emailInput = screen.getByPlaceholderText(signupPaths[0].emailPlaceholder);
    expect(emailInput.getAttribute('type')).toBe('text');
    expect(emailInput.getAttribute('inputmode')).toBe('email');
    expect(emailInput.style.caretColor).toBe('transparent');
    expect(screen.getByLabelText('Senha', { selector: 'input' }).style.caretColor).toBe('transparent');
  });

  it('tracks a selection moved by browser autocomplete after focus', async () => {
    render(
      <SmoothInput
        value={'a'.repeat(40)}
        onChange={() => undefined}
        aria-label='Campo com seleÃ§Ã£o tardia'
      />,
    );

    const input = screen.getByLabelText('Campo com seleÃ§Ã£o tardia') as HTMLInputElement;
    const measure = input.parentElement?.querySelector<HTMLSpanElement>('span[aria-hidden="true"]');
    expect(measure).toBeTruthy();

    Object.defineProperties(input, {
      clientWidth: { configurable: true, value: 100 },
      scrollWidth: { configurable: true, value: 400 },
    });
    input.getBoundingClientRect = () => ({
      x: 0, y: 0, top: 0, right: 100, bottom: 48, left: 0, width: 100, height: 48,
      toJSON: () => undefined,
    });
    measure!.getBoundingClientRect = () => ({
      x: 0, y: 0, top: 0, right: (measure!.textContent?.length ?? 0) * 10,
      bottom: 20, left: 0, width: (measure!.textContent?.length ?? 0) * 10, height: 20,
      toJSON: () => undefined,
    });

    input.setSelectionRange(0, 0);
    input.focus();
    await waitFor(() => expect(document.activeElement).toBe(input));
    await new Promise((resolve) => window.setTimeout(resolve, 50));
    expect(input.scrollLeft).toBe(0);

    Object.defineProperties(input, {
      selectionStart: { configurable: true, value: input.value.length },
      selectionEnd: { configurable: true, value: input.value.length },
    });

    await waitFor(() => expect(input.scrollLeft).toBeGreaterThan(0));
  });

  it('uses the native caret only while the browser is composing text', () => {
    render(
      <SmoothInput
        value='OrganizaÃ§Ã£o'
        onChange={() => undefined}
        aria-label='Nome com acento'
      />,
    );

    const input = screen.getByLabelText('Nome com acento');
    expect(input.style.caretColor).toBe('transparent');

    fireEvent.compositionStart(input);
    expect(input.style.caretColor).toBe('');

    fireEvent.compositionEnd(input);
    expect(input.style.caretColor).toBe('transparent');
  });

  it('can keep the native caret for browser-managed autocomplete fields', () => {
    render(React.createElement(
      SmoothInput as React.ComponentType<Record<string, unknown>>,
      {
        animatedCaret: false,
        value: 'contato@horizonte.org',
        onChange: () => undefined,
        'aria-label': 'E-mail com autocomplete',
      },
    ));

    expect(screen.getByLabelText('E-mail com autocomplete').style.caretColor).toBe('');
  });

  it('uses the native caret for email controls without a selection-position API', () => {
    render(
      <SmoothInput
        type='email'
        value='contato@horizonte.org'
        onChange={() => undefined}
        aria-label='E-mail nativo'
      />,
    );

    expect(screen.getByLabelText('E-mail nativo').style.caretColor).toBe('');
  });
});
